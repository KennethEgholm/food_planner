import express, { type Request, type Response } from "express";
import { prisma } from "../db";

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

		const newIngredient = await prisma.ingredients.create({
			data: { name, unit },
		});
		res.json(newIngredient);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get all ingredients
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allIngredients = await prisma.ingredients.findMany({
			orderBy: { id: "asc" },
		});
		res.json(allIngredients);
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

		await prisma.ingredients.update({
			where: { id: Number(id) },
			data: { name, unit },
		});

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
		await prisma.ingredients.delete({
			where: { id: Number(id) },
		});
		res.json("Ingredient was deleted!");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
