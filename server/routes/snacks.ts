import express, { type Request, type Response } from "express";
import { prisma } from "../db";

const router = express.Router();

// Create a snack
router.post("/", async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		if (!name) {
			res.status(400).json({ error: "Snack name is required" });
			return;
		}
		const newSnack = await prisma.snacks.create({
			data: { name },
		});
		res.json(newSnack);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get all snacks
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allSnacks = await prisma.snacks.findMany({
			orderBy: { id: "asc" },
		});
		res.json(allSnacks);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a snack
router.put("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name } = req.body;

		// Simple check for name update, since that's the only field currently
		if (!name) {
			return res.status(400).json("No fields to update");
		}

		await prisma.snacks.update({
			where: { id: Number(id) },
			data: { name },
		});

		res.json("Snack was updated!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Delete a snack
router.delete("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await prisma.snacks.delete({
			where: { id: Number(id) },
		});
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
