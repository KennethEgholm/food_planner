import express, { type Request, type Response } from "express";
import pool from "../db";

const router = express.Router();

const validUnits = ["gram", "centiliter", "deciliter", "stk"];

// Create an ingredient
router.post("/", async (req: Request, res: Response) => {
	try {
		const { name, unit } = req.body;

		if (!validUnits.includes(unit)) {
			res.status(400).json({ error: "Invalid unit" });
			return;
		}

		const newIngredient = await pool.query(
			"INSERT INTO ingredients (name, unit) VALUES($1, $2) RETURNING *",
			[name, unit],
		);
		res.json(newIngredient.rows[0]);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get all ingredients
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allIngredients = await pool.query(
			"SELECT * FROM ingredients ORDER BY id ASC",
		);
		res.json(allIngredients.rows);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update an ingredient
router.put("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, unit } = req.body;

		if (!validUnits.includes(unit)) {
			res.status(400).json({ error: "Invalid unit" });
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _updateIngredient = await pool.query(
			"UPDATE ingredients SET name = $1, unit = $2 WHERE id = $3",
			[name, unit, id],
		);
		res.json("Ingredient was updated!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Delete an ingredient
router.delete("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _deleteIngredient = await pool.query(
			"DELETE FROM ingredients WHERE id = $1",
			[id],
		);
		res.json("Ingredient was deleted!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
