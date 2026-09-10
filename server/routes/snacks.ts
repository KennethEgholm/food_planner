import fs from "node:fs";
import express, { type Request, type Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";
import { generateRepresentativeImageIfMissing } from "../utils/aiImages";
import { computeCalories, getCalorieThresholds } from "../utils/calories";
import { imageUpload } from "../utils/upload";
import {
	isPrismaForeignKeyError,
	isPrismaNotFound,
} from "../utils/validation";

const router = express.Router();

// Create a snack (admin only)
router.post(
	"/",
	requireAdmin,
	imageUpload.array("images", 10),
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
				generateRepresentativeImageIfMissing("snack", newSnack.id).catch(
					console.error,
				);
			}
		} catch (err: any) {
			console.error(err.message);
			res.status(500).json({ error: "Something went wrong!" });
		}
	},
);

// Get all snacks
router.get("/", async (_req: Request, res: Response) => {
	try {
		const [allSnacks, thresholds] = await Promise.all([
			prisma.snacks.findMany({
				orderBy: { id: "asc" },
				include: {
					snack_images: { orderBy: { sort_order: "asc" } },
					snack_ingredients: { include: { ingredients: true } },
				},
			}),
			getCalorieThresholds(),
		]);

		const snacksWithCalories = allSnacks.map((snack) => {
			const calories = computeCalories(
				snack.snack_ingredients.map((si) => ({
					calories_per_100g: (si.ingredients as any).calories_per_100g,
					quantity: si.quantity,
				})),
				thresholds,
			);
			return { ...snack, ...calories };
		});

		res.json(snacksWithCalories);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a snack (admin only)
router.put(
	"/:id",
	requireAdmin,
	imageUpload.array("images", 10),
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
			generateRepresentativeImageIfMissing("snack", Number(id)).catch(
				console.error,
			);
		} catch (err: any) {
			if (isPrismaNotFound(err)) {
				res.status(404).json("Snack not found");
				return;
			}
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
			const { id, imageId } = req.params;
			// Scope by parent snack so an image id from another snack cannot be deleted.
			const image = await prisma.snack_images.findFirst({
				where: { id: Number(imageId), snack_id: Number(id) },
			});
			if (!image) {
				res.status(404).json("Image not found");
				return;
			}
			await prisma.snack_images.delete({ where: { id: image.id } });
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
	imageUpload.single("image"),
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
				fs.unlink(file.path, () => {});
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

			const snack = await prisma.snacks.findUnique({ where: { id: snackId } });
			if (!snack) {
				res.status(404).json("Snack not found");
				return;
			}

			// Clear existing so the helper regenerates it
			await prisma.snacks.update({
				where: { id: snackId },
				data: { representative_image: null },
			});
			await generateRepresentativeImageIfMissing("snack", snackId);

			const updated = await prisma.snacks.findUnique({ where: { id: snackId } });
			res.json({ path: updated?.representative_image ?? null });
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

			await prisma.snack_ingredients.upsert({
				where: {
					snack_id_ingredient_id: {
						snack_id: Number(id),
						ingredient_id: Number(ingredient_id),
					},
				},
				update: { quantity },
				create: {
					snack_id: Number(id),
					ingredient_id: Number(ingredient_id),
					quantity,
				},
			});

			res.json("Ingredient added to snack");
		} catch (err: any) {
			if (isPrismaForeignKeyError(err)) {
				res.status(400).json("Unknown snack or ingredient");
				return;
			}
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
			if (isPrismaNotFound(err)) {
				res.status(404).json("Ingredient not found on this snack");
				return;
			}
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Backfill images for all snacks missing a representative image (admin only)
router.post("/backfill-images", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
	try {
		const missing = await prisma.snacks.findMany({
			where: { representative_image: null },
			select: { id: true, name: true },
		});

		res.json({ queued: missing.length });

		(async () => {
			for (const snack of missing) {
				try {
					await generateRepresentativeImageIfMissing("snack", snack.id);
					console.log(`[image-backfill] snack "${snack.name}" done`);
				} catch (err: unknown) {
					if (err instanceof Error) console.error(`[image-backfill] snack "${snack.name}" failed:`, err.message);
				}
				await new Promise((r) => setTimeout(r, 1000));
			}
			console.log(`[image-backfill] Done — processed ${missing.length} snacks`);
		})();
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
