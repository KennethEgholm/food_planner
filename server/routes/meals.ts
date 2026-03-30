import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, "uploads/");
	},
	filename: (_req, file, cb) => {
		// Create unique filename
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});

const upload = multer({ storage: storage });

// Fire-and-forget: generate a representative image via xAI if none exists
async function generateRepresentativeImageIfMissing(mealId: number): Promise<void> {
	const meal = await prisma.meals.findUnique({
		where: { id: mealId },
		include: { meal_ingredients: { include: { ingredients: true } } },
	});
	if (!meal || meal.representative_image) return;

	const xaiApiKey = process.env.XAI_API_KEY;
	if (!xaiApiKey) return;

	const ingredientList = meal.meal_ingredients
		.map((mi: any) => mi.ingredients.name)
		.join(", ");
	const prompt = ingredientList
		? `A delicious plate of ${meal.name}, made with ${ingredientList}. Food photography, appetizing, well-lit.`
		: `A delicious plate of ${meal.name}. Food photography, appetizing, well-lit.`;

	try {
		const xaiRes = await fetch("https://api.x.ai/v1/images/generations", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${xaiApiKey}`,
			},
			body: JSON.stringify({ model: "grok-imagine-image", prompt, n: 1 }),
		});
		if (!xaiRes.ok) return;

		const xaiData = (await xaiRes.json()) as { data: { url?: string }[] };
		const imageUrl = xaiData.data?.[0]?.url;
		if (!imageUrl) return;

		const imgRes = await fetch(imageUrl);
		if (!imgRes.ok) return;

		const buffer = Buffer.from(await imgRes.arrayBuffer());
		const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
		const filePath = path.join("uploads", filename);
		fs.writeFileSync(filePath, buffer);

		await prisma.meals.update({
			where: { id: mealId },
			data: { representative_image: filePath },
		});
	} catch (err: unknown) {
		if (err instanceof Error) console.error("Auto-generate image failed:", err.message);
	}
}

// Create a meal (admin only)
router.post(
	"/",
	requireAdmin,
	upload.array("images", 10),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { name, suitable_for_weekend } = req.body;

			if (!name) {
				res.status(400).json({ error: "Meal name is required" });
				return;
			}
			const newMeal = await prisma.meals.create({
				data: {
					name,
					suitable_for_weekend:
						suitable_for_weekend === "true" || suitable_for_weekend === true,
				},
			});

			const files = req.files as Express.Multer.File[];
			if (files && files.length > 0) {
				await prisma.meal_images.createMany({
					data: files.map((file, idx) => ({
						meal_id: newMeal.id,
						path: file.path,
						sort_order: idx,
					})),
				});
			}

			res.json(newMeal);

			// Fire-and-forget: generate AI dish photo if none was uploaded
			if (!newMeal.representative_image) {
				generateRepresentativeImageIfMissing(newMeal.id).catch(console.error);
			}
		} catch (err: any) {
			console.error(err.message);
			res.status(500).json({ error: err.message, stack: err.stack });
		}
	},
);

// Get all meals
router.get("/", async (_req: Request, res: Response): Promise<void> => {
	try {
		const allMeals = await prisma.meals.findMany({
			orderBy: { name: "asc" },
			include: { meal_images: { orderBy: { sort_order: "asc" } } },
		});
		res.json(allMeals);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a meal (admin only)
router.put(
	"/:id",
	requireAdmin,
	upload.array("images", 10),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const { name, suitable_for_weekend } = req.body;
			const files = req.files as Express.Multer.File[];

			if (name !== undefined || suitable_for_weekend !== undefined) {
				await prisma.meals.update({
					where: { id: Number(id) },
					data: {
						...(name !== undefined && { name }),
						...(suitable_for_weekend !== undefined && {
							suitable_for_weekend:
								suitable_for_weekend === "true" ||
								suitable_for_weekend === true,
						}),
					},
				});
			}

			if (files && files.length > 0) {
				// Find the current max sort_order for this meal
				const existing = await prisma.meal_images.findMany({
					where: { meal_id: Number(id) },
					orderBy: { sort_order: "desc" },
					take: 1,
				});
				const nextOrder = existing.length > 0 ? existing[0].sort_order + 1 : 0;
				await prisma.meal_images.createMany({
					data: files.map((file, idx) => ({
						meal_id: Number(id),
						path: file.path,
						sort_order: nextOrder + idx,
					})),
				});
			}

			res.json("Meal was updated!");

			// Fire-and-forget: generate AI dish photo if the meal still has none
			generateRepresentativeImageIfMissing(Number(id)).catch(console.error);
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Delete a single image from a meal (admin only)
router.delete(
	"/:id/images/:imageId",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { imageId } = req.params;
			const image = await prisma.meal_images.findUnique({
				where: { id: Number(imageId) },
			});
			if (!image) {
				res.status(404).json("Image not found");
				return;
			}
			await prisma.meal_images.delete({
				where: { id: Number(imageId) },
			});
			fs.unlink(image.path, (err) => {
				if (err) console.error("Failed to delete image file:", err.message);
			});
			res.json("Image deleted!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Delete a meal (admin only)
router.delete(
	"/:id",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const meal = await prisma.meals.findUnique({
				where: { id: Number(id) },
				include: { meal_images: true },
			});
			await prisma.meals.delete({
				where: { id: Number(id) },
			});
			if (meal?.representative_image) {
				fs.unlink(meal.representative_image, (err) => {
					if (err) console.error("Failed to delete representative image:", err.message);
				});
			}
			for (const img of meal?.meal_images ?? []) {
				fs.unlink(img.path, (err) => {
					if (err) console.error("Failed to delete image file:", err.message);
				});
			}
			res.json("Meal was deleted!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Upload a representative (dish) image for a meal (admin only)
router.put(
	"/:id/representative-image",
	requireAdmin,
	upload.single("image"),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const file = req.file;
			if (!file) {
				res.status(400).json("Image file is required");
				return;
			}

			// Delete old representative image file if it exists
			const existing = await prisma.meals.findUnique({ where: { id: Number(id) } });
			if (existing?.representative_image) {
				fs.unlink(existing.representative_image, (err) => {
					if (err) console.error("Failed to delete old representative image:", err.message);
				});
			}

			await prisma.meals.update({
				where: { id: Number(id) },
				data: { representative_image: file.path },
			});

			res.json({ path: file.path });
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Delete the representative image for a meal (admin only)
router.delete(
	"/:id/representative-image",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const meal = await prisma.meals.findUnique({ where: { id: Number(id) } });
			if (!meal?.representative_image) {
				res.status(404).json("No representative image set");
				return;
			}
			fs.unlink(meal.representative_image, (err) => {
				if (err) console.error("Failed to delete representative image:", err.message);
			});
			await prisma.meals.update({
				where: { id: Number(id) },
				data: { representative_image: null },
			});
			res.json("Representative image deleted");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Get ingredients for a meal
router.get(
	"/:id/ingredients",
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const mealIngredients = await prisma.meal_ingredients.findMany({
				where: { meal_id: Number(id) },
				include: {
					ingredients: true,
				},
			});

			// Map to match the previous structure: { id, name, unit, quantity }
			const result = mealIngredients.map((mi: any) => ({
				id: mi.ingredients.id,
				name: mi.ingredients.name,
				unit: mi.ingredients.unit,
				quantity: mi.quantity,
			}));

			res.json(result);
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Add ingredient to meal (admin only)
router.post(
	"/:id/ingredients",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const { ingredient_id, quantity } = req.body;

			await prisma.meal_ingredients.create({
				data: {
					meal_id: Number(id),
					ingredient_id: Number(ingredient_id),
					quantity: quantity,
				},
			});
			res.json("Ingredient added to meal!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Update ingredient quantity in meal (admin only)
router.put(
	"/:id/ingredients/:ingredientId",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id, ingredientId } = req.params;
			const { quantity } = req.body;

			await prisma.meal_ingredients.update({
				where: {
					meal_id_ingredient_id: {
						meal_id: Number(id),
						ingredient_id: Number(ingredientId),
					},
				},
				data: {
					quantity: quantity,
				},
			});
			res.json("Ingredient quantity updated!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Remove ingredient from meal (admin only)
router.delete(
	"/:id/ingredients/:ingredientId",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id, ingredientId } = req.params;
			await prisma.meal_ingredients.delete({
				where: {
					meal_id_ingredient_id: {
						meal_id: Number(id),
						ingredient_id: Number(ingredientId),
					},
				},
			});
			res.json("Ingredient removed from meal!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Generate (or re-generate) an AI dish photo for a meal (admin only)
router.post(
	"/:id/generate-image",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const mealId = Number.parseInt(req.params.id as string, 10);

			// Clear existing representative image so the helper regenerates it
			await prisma.meals.update({
				where: { id: mealId },
				data: { representative_image: null },
			});

			await generateRepresentativeImageIfMissing(mealId);

			const meal = await prisma.meals.findUnique({ where: { id: mealId } });
			if (!meal) return res.status(404).json("Meal not found");

			res.json({ path: meal.representative_image });
		} catch (err: unknown) {
			if (err instanceof Error) console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

export default router;
