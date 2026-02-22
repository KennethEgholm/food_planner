import express, { type Request, type Response } from "express";
import pool from "../db";

const router = express.Router();

// Create a meal
router.post("/", async (req: Request, res: Response) => {
	try {
		const { name, suitable_for_weekend } = req.body;
		if (!name) {
			res.status(400).json({ error: "Meal name is required" });
			return;
		}
		const newMeal = await pool.query(
			"INSERT INTO meals (name, suitable_for_weekend) VALUES($1, $2) RETURNING *",
			[name, suitable_for_weekend || false],
		);
		res.json(newMeal.rows[0]);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get all meals
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allMeals = await pool.query("SELECT * FROM meals ORDER BY id ASC");
		res.json(allMeals.rows);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update a meal
router.put("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, suitable_for_weekend } = req.body;

		// Build dynamic update query
		const fields = [];
		const values = [];
		if (name !== undefined) {
			fields.push(`name = $${values.length + 1}`);
			values.push(name);
		}
		if (suitable_for_weekend !== undefined) {
			fields.push(`suitable_for_weekend = $${values.length + 1}`);
			values.push(suitable_for_weekend);
		}

		if (fields.length === 0) {
			return res.status(400).json("No fields to update");
		}

		values.push(id);
		const query = `UPDATE meals SET ${fields.join(", ")} WHERE id = $${values.length}`;

		await pool.query(query, values);
		res.json("Meal was updated!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Delete a meal
router.delete("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const _deleteMeal = await pool.query("DELETE FROM meals WHERE id = $1", [
			id,
		]);
		res.json("Meal was deleted!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get ingredients for a meal
router.get("/:id/ingredients", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const ingredients = await pool.query(
			`SELECT i.id, i.name, i.unit, mi.quantity 
             FROM ingredients i 
             JOIN meal_ingredients mi ON i.id = mi.ingredient_id 
             WHERE mi.meal_id = $1`,
			[id],
		);
		res.json(ingredients.rows);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Add ingredient to meal
router.post("/:id/ingredients", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { ingredient_id, quantity } = req.body;

		await pool.query(
			"INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity) VALUES ($1, $2, $3)",
			[id, ingredient_id, quantity],
		);
		res.json("Ingredient added to meal!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update ingredient quantity in meal
router.put(
	"/:id/ingredients/:ingredientId",
	async (req: Request, res: Response) => {
		try {
			const { id, ingredientId } = req.params;
			const { quantity } = req.body;

			await pool.query(
				"UPDATE meal_ingredients SET quantity = $1 WHERE meal_id = $2 AND ingredient_id = $3",
				[quantity, id, ingredientId],
			);
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
	async (req: Request, res: Response) => {
		try {
			const { id, ingredientId } = req.params;
			await pool.query(
				"DELETE FROM meal_ingredients WHERE meal_id = $1 AND ingredient_id = $2",
				[id, ingredientId],
			);
			res.json("Ingredient removed from meal!");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

export default router;
