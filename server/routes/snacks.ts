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
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, uniqueSuffix + path.extname(file.originalname));
	},
});

const upload = multer({ storage: storage });

// Fire-and-forget: generate a representative image via xAI if none exists
async function generateRepresentativeImageIfMissing(snackId: number): Promise<void> {
	const snack = await prisma.snacks.findUnique({
		where: { id: snackId },
		include: { snack_ingredients: { include: { ingredients: true } } },
	});
	if (!snack || snack.representative_image) return;

	const xaiApiKey = process.env.XAI_API_KEY;
	if (!xaiApiKey) return;

	const ingredientList = snack.snack_ingredients
		.map((si: any) => si.ingredients.name)
		.join(", ");
	const prompt = ingredientList
		? `A delicious serving of ${snack.name}, made with ${ingredientList}. Food photography, appetizing, well-lit.`
		: `A delicious serving of ${snack.name}. Food photography, appetizing, well-lit.`;

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

		await prisma.snacks.update({
			where: { id: snackId },
			data: { representative_image: filePath },
		});
	} catch (err: unknown) {
		if (err instanceof Error) console.error("Auto-generate snack image failed:", err.message);
	}
}

// Create a snack (admin only)
router.post(
	"/",
	requireAdmin,
	upload.array("images", 10),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { name } = req.body;
			if (!name) {
				res.status(400).json({ error: "Snack name is required" });
				return;
			}
			const newSnack = await prisma.snacks.create({
				data: { name },
			});

			const files = req.files as Express.Multer.File[];
			if (files && files.length > 0) {
				await prisma.snack_images.createMany({
					data: files.map((file, idx) => ({
						snack_id: newSnack.id,
						path: file.path,
						sort_order: idx,
					})),
				});
			}

			res.json(newSnack);

			// Fire-and-forget: generate AI dish photo if none was uploaded
			if (!newSnack.representative_image) {
				generateRepresentativeImageIfMissing(newSnack.id).catch(console.error);
			}
		} catch (err: any) {
			console.error(err.message);
			res.status(500).json({ error: err.message, stack: err.stack });
		}
	},
);

// Get all snacks
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allSnacks = await prisma.snacks.findMany({
			orderBy: { id: "asc" },
			include: { snack_images: { orderBy: { sort_order: "asc" } } },
		});
		res.json(allSnacks);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a snack (admin only)
router.put(
	"/:id",
	requireAdmin,
	upload.array("images", 10),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const { name } = req.body;
			const files = req.files as Express.Multer.File[];

			if (name !== undefined) {
				await prisma.snacks.update({
					where: { id: Number(id) },
					data: { name },
				});
			}

			if (files && files.length > 0) {
				const existing = await prisma.snack_images.findMany({
					where: { snack_id: Number(id) },
					orderBy: { sort_order: "desc" },
					take: 1,
				});
				const nextOrder = existing.length > 0 ? existing[0].sort_order + 1 : 0;
				await prisma.snack_images.createMany({
					data: files.map((file, idx) => ({
						snack_id: Number(id),
						path: file.path,
						sort_order: nextOrder + idx,
					})),
				});
			}

			res.json("Snack was updated!");

			// Fire-and-forget: generate AI dish photo if the snack still has none
			generateRepresentativeImageIfMissing(Number(id)).catch(console.error);
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Delete a single image from a snack (admin only)
router.delete(
	"/:id/images/:imageId",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { imageId } = req.params;
			const image = await prisma.snack_images.findUnique({
				where: { id: Number(imageId) },
			});
			if (!image) {
				res.status(404).json("Image not found");
				return;
			}
			await prisma.snack_images.delete({
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

// Upload or replace the representative (dish) image for a snack (admin only)
router.put(
	"/:id/representative-image",
	requireAdmin,
	upload.single("image"),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const file = req.file;
			if (!file) {
				res.status(400).json("No image file provided");
				return;
			}
			const snack = await prisma.snacks.findUnique({ where: { id: Number(id) } });
			if (!snack) {
				res.status(404).json("Snack not found");
				return;
			}
			// Delete the old file if one exists
			if (snack.representative_image) {
				fs.unlink(snack.representative_image, (err) => {
					if (err) console.error("Failed to delete old representative image:", err.message);
				});
			}
			await prisma.snacks.update({
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

// Remove the representative (dish) image for a snack (admin only)
router.delete(
	"/:id/representative-image",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const snack = await prisma.snacks.findUnique({ where: { id: Number(id) } });
			if (!snack) {
				res.status(404).json("Snack not found");
				return;
			}
			if (snack.representative_image) {
				fs.unlink(snack.representative_image, (err) => {
					if (err) console.error("Failed to delete representative image file:", err.message);
				});
				await prisma.snacks.update({
					where: { id: Number(id) },
					data: { representative_image: null },
				});
			}
			res.json("Representative image removed");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Generate (or re-generate) an AI dish photo for a snack (admin only)
router.post(
	"/:id/generate-image",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const snackId = Number.parseInt(req.params.id as string, 10);
			// Clear existing so the helper regenerates it
			await prisma.snacks.update({
				where: { id: snackId },
				data: { representative_image: null },
			});
			await generateRepresentativeImageIfMissing(snackId);
			const snack = await prisma.snacks.findUnique({ where: { id: snackId } });
			if (!snack) return res.status(404).json("Snack not found");
			res.json({ path: snack.representative_image });
		} catch (err: unknown) {
			if (err instanceof Error) console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Delete a snack (admin only)
router.delete(
	"/:id",
	requireAdmin,
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const snack = await prisma.snacks.findUnique({
				where: { id: Number(id) },
				include: { snack_images: true },
			});
			if (!snack) {
				res.status(404).json("Snack not found");
				return;
			}
			await prisma.snacks.delete({ where: { id: Number(id) } });
			// Clean up representative image file
			if (snack.representative_image) {
				fs.unlink(snack.representative_image, (err) => {
					if (err) console.error("Failed to delete representative image:", err.message);
				});
			}
			// Clean up cookbook snapshot files
			for (const img of snack.snack_images) {
				fs.unlink(img.path, (err) => {
					if (err) console.error("Failed to delete image file:", err.message);
				});
			}
			res.json("Snack was deleted!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Get ingredients for a snack
router.get("/:id/ingredients", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const snackIngredients = await prisma.snack_ingredients.findMany({
			where: { snack_id: Number(id) },
			include: {
				ingredients: true,
			},
		});

		const ingredients = snackIngredients.map((row: any) => ({
			id: row.ingredients?.id,
			name: row.ingredients?.name,
			unit: row.ingredients?.unit,
			quantity: row.quantity,
		}));

		res.json(ingredients);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Add ingredient to snack (admin only)
router.post(
	"/:id/ingredients",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { ingredient_id, quantity } = req.body;

			await prisma.snack_ingredients.create({
				data: {
					snack_id: Number(id),
					ingredient_id: Number(ingredient_id),
					quantity: Number(quantity),
				},
			});

			res.json("Ingredient added to snack");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Remove ingredient from snack (admin only)
router.delete(
	"/:id/ingredients/:ingredientId",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id, ingredientId } = req.params;
			await prisma.snack_ingredients.delete({
				where: {
					snack_id_ingredient_id: {
						snack_id: Number(id),
						ingredient_id: Number(ingredientId),
					},
				},
			});
			res.json("Ingredient removed from snack");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

export default router;
