import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { prisma } from "../db";

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

// Create a snack
router.post(
	"/",
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

// Update a snack
router.put(
	"/:id",
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
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Delete a single image from a snack
router.delete(
	"/:id/images/:imageId",
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

// Delete a snack
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		const images = await prisma.snack_images.findMany({
			where: { snack_id: Number(id) },
		});
		await prisma.snacks.delete({
			where: { id: Number(id) },
		});
		for (const img of images) {
			fs.unlink(img.path, (err) => {
				if (err) console.error("Failed to delete image file:", err.message);
			});
		}
		res.json("Snack was deleted!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

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

// Add ingredient to snack
router.post("/:id/ingredients", async (req: Request, res: Response) => {
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
});

// Remove ingredient from snack
router.delete(
	"/:id/ingredients/:ingredientId",
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
