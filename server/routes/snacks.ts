import express, { type Request, type Response } from "express";
import pool from "../db";

const router = express.Router();

// Create a snack
router.post("/", async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		if (!name) {
			res.status(400).json({ error: "Snack name is required" });
			return;
		}
		const newSnack = await pool.query(
			"INSERT INTO snacks (name) VALUES($1) RETURNING *",
			[name],
		);
		res.json(newSnack.rows[0]);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get all snacks
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allSnacks = await pool.query("SELECT * FROM snacks ORDER BY id ASC");
		res.json(allSnacks.rows);
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

		// Build dynamic update query
		const fields = [];
		const values = [];
		if (name !== undefined) {
			fields.push(`name = $${values.length + 1}`);
			values.push(name);
		}

		if (fields.length === 0) {
			return res.status(400).json("No fields to update");
		}

		values.push(id);
		const query = `UPDATE snacks SET ${fields.join(", ")} WHERE id = $${values.length}`;

		await pool.query(query, values);
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
		const _deleteSnack = await pool.query("DELETE FROM snacks WHERE id = $1", [
			id,
		]);
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
		const ingredients = await pool.query(
			`SELECT i.id, i.name, i.unit, si.quantity 
             FROM ingredients i 
             JOIN snack_ingredients si ON i.id = si.ingredient_id 
             WHERE si.snack_id = $1`,
			[id],
		);
		res.json(ingredients.rows);
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

		await pool.query(
			"INSERT INTO snack_ingredients (snack_id, ingredient_id, quantity) VALUES ($1, $2, $3)",
			[id, ingredient_id, quantity],
		);

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
			await pool.query(
				"DELETE FROM snack_ingredients WHERE snack_id = $1 AND ingredient_id = $2",
				[id, ingredientId],
			);
			res.json("Ingredient removed from snack");
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

export default router;
