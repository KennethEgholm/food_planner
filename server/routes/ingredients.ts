import express, { type Request, type Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";
import { getCaloriesPerHundredGrams } from "../utils/aiCalories";

const router = express.Router();

const validUnits = ["gram", "centiliter", "deciliter", "stk"];

// Create an ingredient (admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
	try {
		const { name, unit, calories_per_100g } = req.body;

		if (!validUnits.includes(unit)) {
			res.status(400).json({ error: "Invalid unit" });
			return;
		}

		const newIngredient = await prisma.ingredients.create({
			data: {
				name,
				unit,
				calories_per_100g: calories_per_100g != null ? Number(calories_per_100g) : null,
			},
		});
		res.json(newIngredient);

		// Fire-and-forget: autofill calories if not provided
		if (calories_per_100g == null) {
			getCaloriesPerHundredGrams(name).then(async (cal) => {
				if (cal != null) {
					await prisma.ingredients.update({
						where: { id: newIngredient.id },
						data: { calories_per_100g: cal },
					});
				}
			}).catch(console.error);
		}
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
		const { name, unit, calories_per_100g } = req.body;

		if (!validUnits.includes(unit)) {
			res.status(400).json({ error: "Invalid unit" });
			return;
		}

		await prisma.ingredients.update({
			where: { id: Number(id) },
			data: {
				name,
				unit,
				calories_per_100g: calories_per_100g != null ? Number(calories_per_100g) : undefined,
			},
		});

		res.json("Ingredient was updated!");

		// Fire-and-forget: autofill calories if user cleared the value
		if (calories_per_100g == null) {
			getCaloriesPerHundredGrams(name).then(async (cal) => {
				if (cal != null) {
					await prisma.ingredients.update({
						where: { id: Number(id) },
						data: { calories_per_100g: cal },
					});
				}
			}).catch(console.error);
		}
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

// Backfill calories for all ingredients missing it (admin only)
router.post("/backfill-calories", requireAdmin, async (_req: Request, res: Response) => {
	try {
		const missing = await prisma.ingredients.findMany({
			where: { calories_per_100g: null },
			select: { id: true, name: true },
		});

		res.json({ queued: missing.length });

		// Process sequentially with a small delay to avoid rate-limiting
		(async () => {
			for (const ingredient of missing) {
				try {
					const cal = await getCaloriesPerHundredGrams(ingredient.name);
					if (cal != null) {
						await prisma.ingredients.update({
							where: { id: ingredient.id },
							data: { calories_per_100g: cal },
						});
						console.log(`[backfill] ${ingredient.name}: ${cal} kcal/100g`);
					}
				} catch (err: unknown) {
					if (err instanceof Error) console.error(`[backfill] ${ingredient.name} failed:`, err.message);
				}
				// Small delay between requests
				await new Promise((r) => setTimeout(r, 500));
			}
			console.log(`[backfill] Done — processed ${missing.length} ingredients`);
		})();
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
