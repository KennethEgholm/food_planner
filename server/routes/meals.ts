import express, { type Request, type Response } from "express";
import { prisma } from "../db";

const router = express.Router();

// Create a meal
router.post("/", async (req: Request, res: Response): Promise<void> => {
	try {
		const { name, suitable_for_weekend } = req.body;
		if (!name) {
			res.status(400).json({ error: "Meal name is required" });
			return;
		}
		const newMeal = await prisma.meals.create({
			data: {
				name,
				suitable_for_weekend: suitable_for_weekend || false,
			},
		});
		res.json(newMeal);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get all meals
router.get("/", async (_req: Request, res: Response): Promise<void> => {
	try {
		const allMeals = await prisma.meals.findMany({
			orderBy: { id: "asc" },
		});
		res.json(allMeals);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a meal
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		const { name, suitable_for_weekend } = req.body;

		if (name === undefined && suitable_for_weekend === undefined) {
			res.status(400).json("No fields to update");
			return;
		}

		await prisma.meals.update({
			where: { id: Number(id) },
			data: {
				...(name !== undefined && { name }),
				...(suitable_for_weekend !== undefined && { suitable_for_weekend }),
			},
		});

		res.json("Meal was updated!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Delete a meal
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		await prisma.meals.delete({
			where: { id: Number(id) },
		});
		res.json("Meal was deleted!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

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

// Add ingredient to meal
router.post(
	"/:id/ingredients",
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

// Update ingredient quantity in meal
router.put(
	"/:id/ingredients/:ingredientId",
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

// Remove ingredient from meal
router.delete(
	"/:id/ingredients/:ingredientId",
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

export default router;
