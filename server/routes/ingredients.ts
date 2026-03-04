import express, { type Request, type Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

const validUnits = ["gram", "centiliter", "deciliter", "stk"];

// Create an ingredient (admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
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
			orderBy: { name: "asc" },
		});
		res.json(allIngredients);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Update an ingredient (admin only)
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
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

// Delete an ingredient (admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
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
