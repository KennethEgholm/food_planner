import fs from "node:fs";
import express, { type Request, type Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";
import { generateRepresentativeImageIfMissing } from "../utils/aiImages";
import { appLog } from "../utils/appLog";
import { computeCalories, getCalorieThresholds } from "../utils/calories";
import { imageUpload } from "../utils/upload";
import {
	isPrismaForeignKeyError,
	isPrismaNotFound,
	parseBoolean,
} from "../utils/validation";

const router = express.Router();

// Create a meal (admin only)
router.post(
	"/",
	requireAdmin,
	imageUpload.array("images", 10),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { name, suitable_for_weekend, suitable_for_lunch } = req.body;

			if (!name) {
				res.status(400).json({ error: "Meal name is required" });
				return;
			}
			const newMeal = await prisma.meals.create({
				data: {
					name,
					suitable_for_weekend: parseBoolean(suitable_for_weekend),
					suitable_for_lunch: parseBoolean(suitable_for_lunch),
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
				generateRepresentativeImageIfMissing("meal", newMeal.id).catch(
					console.error,
				);
			}
		} catch (err: any) {
			console.error(err.message);
			res.status(500).json({ error: "Something went wrong!" });
		}
	},
);

// Get all meals
router.get("/", async (_req: Request, res: Response): Promise<void> => {
	try {
		const [allMeals, thresholds] = await Promise.all([
			prisma.meals.findMany({
				orderBy: { name: "asc" },
				include: {
					meal_images: { orderBy: { sort_order: "asc" } },
					meal_ingredients: { include: { ingredients: true } },
					_count: {
						select: { meal_plan_days: true, meal_plan_days_as_lunch: true },
					},
				},
			}),
			getCalorieThresholds(),
		]);

		const mealsWithCalories = allMeals.map((meal) => {
			const calories = computeCalories(
				meal.meal_ingredients.map((mi) => ({
					calories_per_100g: (mi.ingredients as any).calories_per_100g,
					quantity: mi.quantity,
				})),
				thresholds,
			);
			const { _count, ...rest } = meal;
			return {
				...rest,
				...calories,
				plan_count: _count.meal_plan_days + _count.meal_plan_days_as_lunch,
			};
		});

		res.json(mealsWithCalories);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a meal (admin only)
router.put(
	"/:id",
	requireAdmin,
	imageUpload.array("images", 10),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const { name, suitable_for_weekend, suitable_for_lunch } = req.body;
			const files = req.files as Express.Multer.File[];

			if (
				name !== undefined ||
				suitable_for_weekend !== undefined ||
				suitable_for_lunch !== undefined
			) {
				await prisma.meals.update({
					where: { id: Number(id) },
					data: {
						...(name !== undefined && { name }),
						...(suitable_for_weekend !== undefined && {
							suitable_for_weekend: parseBoolean(suitable_for_weekend),
						}),
						...(suitable_for_lunch !== undefined && {
							suitable_for_lunch: parseBoolean(suitable_for_lunch),
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
			generateRepresentativeImageIfMissing("meal", Number(id)).catch(
				console.error,
			);
		} catch (err: any) {
			if (isPrismaNotFound(err)) {
				res.status(404).json("Meal not found");
				return;
			}
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
			const { id, imageId } = req.params;
			// Scope by parent meal so an image id from another meal cannot be deleted.
			const image = await prisma.meal_images.findFirst({
				where: { id: Number(imageId), meal_id: Number(id) },
			});
			if (!image) {
				res.status(404).json("Image not found");
				return;
			}
			await prisma.meal_images.delete({ where: { id: image.id } });
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
			if (!meal) {
				res.status(404).json("Meal not found");
				return;
			}
			await prisma.meals.delete({ where: { id: Number(id) } });
			if (meal.representative_image) {
				fs.unlink(meal.representative_image, (err) => {
					if (err)
						console.error("Failed to delete representative image:", err.message);
				});
			}
			for (const img of meal.meal_images) {
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
	imageUpload.single("image"),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { id } = req.params;
			const file = req.file;
			if (!file) {
				res.status(400).json("Image file is required");
				return;
			}

			const existing = await prisma.meals.findUnique({
				where: { id: Number(id) },
			});
			if (!existing) {
				fs.unlink(file.path, () => {});
				res.status(404).json("Meal not found");
				return;
			}

			// Delete old representative image file if it exists
			if (existing.representative_image) {
				fs.unlink(existing.representative_image, (err) => {
					if (err)
						console.error(
							"Failed to delete old representative image:",
							err.message,
						);
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

			await prisma.meal_ingredients.upsert({
				where: {
					meal_id_ingredient_id: {
						meal_id: Number(id),
						ingredient_id: Number(ingredient_id),
					},
				},
				update: { quantity },
				create: {
					meal_id: Number(id),
					ingredient_id: Number(ingredient_id),
					quantity,
				},
			});
			res.json("Ingredient added to meal!");
		} catch (err: any) {
			if (isPrismaForeignKeyError(err)) {
				res.status(400).json("Unknown meal or ingredient");
				return;
			}
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
			if (isPrismaNotFound(err)) {
				res.status(404).json("Ingredient not found on this meal");
				return;
			}
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
			if (isPrismaNotFound(err)) {
				res.status(404).json("Ingredient not found on this meal");
				return;
			}
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

			const meal = await prisma.meals.findUnique({ where: { id: mealId } });
			if (!meal) {
				res.status(404).json("Meal not found");
				return;
			}

			// Clear existing representative image so the helper regenerates it
			await prisma.meals.update({
				where: { id: mealId },
				data: { representative_image: null },
			});

			await generateRepresentativeImageIfMissing("meal", mealId);

			const updated = await prisma.meals.findUnique({ where: { id: mealId } });
			res.json({ path: updated?.representative_image ?? null });
		} catch (err: unknown) {
			if (err instanceof Error) console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Backfill images for all meals missing a representative image (admin only)
router.post("/backfill-images", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
	try {
		const missing = await prisma.meals.findMany({
			where: { representative_image: null },
			select: { id: true, name: true },
		});

		res.json({ queued: missing.length });

		(async () => {
			for (const meal of missing) {
				try {
					await generateRepresentativeImageIfMissing("meal", meal.id);
					console.log(`[image-backfill] meal "${meal.name}" done`);
				} catch (err: unknown) {
					if (err instanceof Error) console.error(`[image-backfill] meal "${meal.name}" failed:`, err.message);
				}
				await new Promise((r) => setTimeout(r, 1000));
			}
			console.log(`[image-backfill] Done — processed ${missing.length} meals`);
		})();
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
