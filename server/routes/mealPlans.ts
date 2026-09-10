import { type Request, type Response, Router } from "express";
import { google } from "googleapis";
import { prisma } from "../db";
import { getUser, requireAdmin } from "../middleware/auth";
import { generateAIMealPlan } from "../utils/aiMealPlan";
import { appLog } from "../utils/appLog";
import { isPrismaNotFound } from "../utils/validation";
import {
	clearGoogleTokens,
	getAuthenticatedClient,
	isGoogleAuthError,
} from "./auth";

const router = Router();

const DAY_ORDER: Record<string, number> = {
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
	Sunday: 7,
};

interface ShoppingListItem {
	name: string;
	unit: string | null;
	total_quantity: number;
}

/** Ingredient quantities across dinners, weekend lunches and snacks. */
async function getShoppingList(planId: number): Promise<ShoppingListItem[]> {
	const rows: any[] = await prisma.$queryRaw`
		SELECT i.name, i.unit, SUM(sub.quantity) as total_quantity 
		FROM (
			SELECT mi.ingredient_id, mi.quantity 
			FROM meal_plan_days mpd
			JOIN meal_ingredients mi ON mpd.meal_id = mi.meal_id
			WHERE mpd.meal_plan_id = ${planId}

			UNION ALL

			SELECT mi.ingredient_id, mi.quantity
			FROM meal_plan_days mpd
			JOIN meal_ingredients mi ON mpd.lunch_meal_id = mi.meal_id
			WHERE mpd.meal_plan_id = ${planId}
			AND mpd.lunch_meal_id IS NOT NULL

			UNION ALL

			SELECT si.ingredient_id, si.quantity
			FROM meal_plan_snacks mps
			JOIN snack_ingredients si ON mps.snack_id = si.snack_id
			WHERE mps.meal_plan_id = ${planId}
		) sub
		JOIN ingredients i ON sub.ingredient_id = i.id
		GROUP BY i.id, i.name, i.unit
		ORDER BY i.name
	`;

	return rows.map((item) => ({
		...item,
		total_quantity: Number(item.total_quantity),
	}));
}

// Create a meal plan (admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		if (!name) {
			return res.status(400).json("Meal Plan name is required");
		}
		const newPlan = await prisma.meal_plans.create({
			data: { name },
		});
		res.json(newPlan);
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error(err.message);
			if ((err as any).code === "P2002") {
				return res.status(409).json("Meal Plan name must be unique");
			}
		}
		res.status(500).send("Server Error");
	}
});

// Create a random meal plan (admin only)
router.post("/random", requireAdmin, async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		if (!name) {
			return res.status(400).json("Meal Plan name is required");
		}

		// 1. Create the new meal plan first
		let newPlan: any;
		try {
			newPlan = await prisma.meal_plans.create({
				data: { name },
			});
		} catch (err: unknown) {
			if ((err as any).code === "P2002") {
				return res.status(409).json("Meal Plan name must be unique");
			}
			throw err;
		}

		// 2. Get all available meals
		const allMeals = await prisma.meals.findMany();

		if (allMeals.length === 0) {
			await prisma.meal_plans.delete({ where: { id: newPlan.id } });
			return res
				.status(400)
				.json("No meals available to create a random plan.");
		}

		// 3. Define days of the week
		const days = [
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
			"Sunday",
		];

		// 4. Generate a balanced random selection of meals
		const weekendMeals = allMeals.filter((m: any) => m.suitable_for_weekend);

		if (weekendMeals.length === 0) {
			await prisma.meal_plans.delete({ where: { id: newPlan.id } });
			return res
				.status(400)
				.json(
					"No meals marked 'Suitable for weekends' found. Cannot generate plan.",
				);
		}

		// Helper to shuffle an array (Fisher-Yates)
		const shuffleArray = (array: any[]) => {
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[array[i], array[j]] = [array[j], array[i]];
			}
			return array;
		};

		const lunchMeals = allMeals.filter((m: any) => m.suitable_for_lunch);

		let availableWeekMeals = [...allMeals];
		let availableWeekendMeals = [...weekendMeals];
		let availableLunchMeals = [...lunchMeals];

		const daysToCreate = [];

		for (const day of days) {
			let pickedMeal;

			if (day === "Saturday" || day === "Sunday") {
				if (availableWeekendMeals.length === 0) {
					availableWeekendMeals = [...weekendMeals];
				}
				shuffleArray(availableWeekendMeals);
				pickedMeal = availableWeekendMeals.pop();
			} else {
				if (availableWeekMeals.length === 0) {
					availableWeekMeals = [...allMeals];
				}
				shuffleArray(availableWeekMeals);
				pickedMeal = availableWeekMeals.pop();
			}

			if (pickedMeal) {
				const entry: any = {
					meal_plan_id: newPlan.id,
					day: day,
					meal_id: pickedMeal.id,
				};

				// Pick a lunch meal for weekend days
				if ((day === "Saturday" || day === "Sunday") && lunchMeals.length > 0) {
					if (availableLunchMeals.length === 0) {
						availableLunchMeals = [...lunchMeals];
					}
					shuffleArray(availableLunchMeals);
					const pickedLunch = availableLunchMeals.pop();
					if (pickedLunch) entry.lunch_meal_id = pickedLunch.id;
				}

				daysToCreate.push(entry);
			}
		}

		if (daysToCreate.length > 0) {
			await prisma.meal_plan_days.createMany({
				data: daysToCreate,
			});
		}

		res.json(newPlan);
	} catch (err: unknown) {
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Create an AI-generated meal plan (admin only)
router.post("/ai", requireAdmin, async (req: Request, res: Response) => {
	const { name } = req.body;
	if (!name) {
		return res.status(400).json("Meal Plan name is required");
	}

	let newPlan: any;
	try {
		newPlan = await prisma.meal_plans.create({ data: { name } });
	} catch (err: unknown) {
		if ((err as any).code === "P2002") {
			return res.status(409).json("Meal Plan name must be unique");
		}
		return res.status(500).send("Server Error");
	}

	try {
		const { days, snack_ids } = await generateAIMealPlan();

		if (days.length > 0) {
			await prisma.meal_plan_days.createMany({
				data: days.map((d) => ({ meal_plan_id: newPlan.id, day: d.day, meal_id: d.meal_id, lunch_meal_id: d.lunch_meal_id ?? null })),
			});
		}

		if (snack_ids.length > 0) {
			await prisma.meal_plan_snacks.createMany({
				data: snack_ids.map((snack_id) => ({ meal_plan_id: newPlan.id, snack_id })),
			});
		}

		res.json(newPlan);
	} catch (err: unknown) {
		// Clean up the orphan plan before reporting the error
		await prisma.meal_plans.delete({ where: { id: newPlan.id } }).catch(() => {});
		const message = err instanceof Error ? err.message : "AI meal plan generation failed";
		console.error("[ai-meal-plan]", message);
		res.status(500).json(message);
	}
});

// Get all meal plans
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allPlans = await prisma.meal_plans.findMany({
			orderBy: { id: "desc" },
		});
		res.json(allPlans);
	} catch (err: unknown) {
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get the current meal plan (with days and snacks)
router.get("/current", async (_req: Request, res: Response) => {
	try {
		const plan = await prisma.meal_plans.findFirst({
			where: { is_current: true },
		});

		if (!plan) {
			return res.status(404).json("No current meal plan set");
		}

		const daysRaw = await prisma.meal_plan_days.findMany({
			where: { meal_plan_id: plan.id },
			include: {
				meals: true,
				lunch_meal: true,
			},
		});

		const sortedDays = daysRaw
			.map((d: any) => ({
				day: d.day,
				meal_id: d.meal_id,
				meal_name: d.meals?.name ?? null,
				meal_image: d.meals?.representative_image ?? null,
				lunch_meal_id: d.lunch_meal_id ?? null,
				lunch_meal_name: d.lunch_meal?.name ?? null,
				lunch_meal_image: d.lunch_meal?.representative_image ?? null,
			}))
			.sort(
				(a: any, b: any) => (DAY_ORDER[a.day] || 0) - (DAY_ORDER[b.day] || 0),
			);

		const snacks = await prisma.meal_plan_snacks.findMany({
			where: { meal_plan_id: plan.id },
			include: { snacks: true },
		});
		const formattedSnacks = snacks.map((s: any) => ({
			link_id: s.id,
			id: s.snack_id,
			name: s.snacks?.name,
			snack_image: s.snacks?.representative_image ?? null,
		}));

		res.json({ ...plan, days: sortedDays, snacks: formattedSnacks });
	} catch (err: unknown) {
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get a specific meal plan (with days)
router.get("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const planId = Number.parseInt(id as string, 10);

		const plan = await prisma.meal_plans.findUnique({
			where: { id: planId },
		});

		if (!plan) {
			return res.status(404).json("Meal Plan not found");
		}

		// Get days/meals for this plan
		const daysRaw = await prisma.meal_plan_days.findMany({
			where: { meal_plan_id: planId },
			include: {
				meals: true,
				lunch_meal: true,
			},
		});

		// Sort days in JS
		const sortedDays = daysRaw
			.map((d: any) => ({
				day: d.day,
				meal_id: d.meal_id,
				meal_name: d.meals?.name ?? null,
				meal_image: d.meals?.representative_image ?? null,
				lunch_meal_id: d.lunch_meal_id ?? null,
				lunch_meal_name: d.lunch_meal?.name ?? null,
				lunch_meal_image: d.lunch_meal?.representative_image ?? null,
			}))
			.sort((a: any, b: any) => {
				return (DAY_ORDER[a.day] || 0) - (DAY_ORDER[b.day] || 0);
			});

		// Get snacks for this plan
		const snacks = await prisma.meal_plan_snacks.findMany({
			where: { meal_plan_id: planId },
			include: {
				snacks: true,
			},
		});
		const formattedSnacks = snacks.map((s: any) => ({
			link_id: s.id,
			id: s.snack_id,
			name: s.snacks?.name,
		}));

		res.json({ ...plan, days: sortedDays, snacks: formattedSnacks });
	} catch (err: unknown) {
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Add a snack to a meal plan (admin only)
router.post(
	"/:id/snacks",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { snack_id } = req.body;

			if (!snack_id) {
				return res.status(400).json("Snack ID is required");
			}

			const newLink = await prisma.meal_plan_snacks.create({
				data: {
					meal_plan_id: Number.parseInt(id as string, 10),
					snack_id: Number.parseInt(snack_id, 10),
				},
			});

			res.json(newLink);
		} catch (err: unknown) {
			if (err instanceof Error) console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Remove a snack from a meal plan (admin only)
router.delete(
	"/:id/snacks/:linkId",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const { linkId } = req.params;
			await prisma.meal_plan_snacks.delete({
				where: { id: Number.parseInt(linkId as string, 10) },
			});
			res.json("Snack removed from plan");
		} catch (err: unknown) {
			if (err instanceof Error) console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

// Get shopping list for a meal plan (including snacks)
router.get("/:id/shopping-list", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const planId = Number.parseInt(id as string, 10);

		const safeList = await getShoppingList(planId);

		res.json(safeList);
	} catch (err: unknown) {
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Export shopping list to Google Tasks (admin only)
router.post(
	"/:id/shopping-list/export",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const planId = Number.parseInt(id as string, 10);

			const shoppingList = await getShoppingList(planId);

			if (shoppingList.length === 0) {
				return res.status(400).json("Shopping list is empty.");
			}

			// 2. Authenticate
			let oauth2Client;
			try {
				oauth2Client = await getAuthenticatedClient(getUser(req).email);
			} catch (_e) {
				return res
					.status(401)
					.json("Not authenticated with Google. Please connect first.");
			}

			const tasksService = google.tasks({ version: "v1", auth: oauth2Client });

			// 3. Create a new Task List
			const plan = await prisma.meal_plans.findUnique({
				where: { id: planId },
			});
			const planName = plan?.name || "Plan";
			const taskListTitle = `Shopping List: ${planName}`;

			const taskList = await tasksService.tasklists.insert({
				requestBody: {
					title: taskListTitle,
				},
			});

			const taskListId = taskList.data.id;

			// 4. Create tasks
			for (const item of shoppingList) {
				const title = `${item.name} (${Number(item.total_quantity)} ${
					item.unit || ""
				})`
					.replace(/\s+/g, " ")
					.trim();

				await tasksService.tasks.insert({
					tasklist: taskListId!,
					requestBody: {
						title: title,
						status: "needsAction",
					},
				});
			}

			res.json({
				message: "Exported successfully",
				taskListId: taskList.data.id,
			});
		} catch (err: unknown) {
			const userEmail = getUser(req).email;
			if (isGoogleAuthError(err)) {
				await clearGoogleTokens(userEmail);
				const msg = err instanceof Error ? err.message : "auth error";
				appLog("error", "google-tasks", `Export auth failure (tokens cleared): ${msg}`);
				return res
					.status(401)
					.json("Google authentication expired. Please reconnect.");
			}
			if (err instanceof Error) {
				appLog("error", "google-tasks", `Export failed: ${err.message}`);
				res.status(500).send("Export failed");
			} else {
				appLog("error", "google-tasks", "Export failed: Unknown error");
				res.status(500).send("Export failed");
			}
		}
	},
);

// Update days in a meal plan (admin only)
router.put("/:id/days", requireAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const planId = Number.parseInt(id as string, 10);
		const { day, meal_id, lunch_meal_id } = req.body;

		if (!day) {
			return res.status(400).json("Day is required");
		}

		await prisma.meal_plan_days.upsert({
			where: {
				meal_plan_id_day: {
					meal_plan_id: planId,
					day: day,
				},
			},
			create: {
				meal_plan_id: planId,
				day: day,
				meal_id: meal_id ?? null,
				lunch_meal_id: lunch_meal_id ?? null,
			},
			update: {
				...(meal_id !== undefined && { meal_id: meal_id ?? null }),
				...(lunch_meal_id !== undefined && { lunch_meal_id: lunch_meal_id ?? null }),
			},
		});

		res.json("Meal updated for the day");
	} catch (err: unknown) {
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Delete a meal plan (admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const planId = Number.parseInt(id as string, 10);
		const plan = await prisma.meal_plans.findUnique({ where: { id: planId } });
		if (!plan) {
			return res.status(404).json("Meal Plan not found");
		}
		await prisma.meal_plans.delete({ where: { id: planId } });
		res.json("Meal Plan was deleted");
	} catch (err: unknown) {
		if (isPrismaNotFound(err)) {
			return res.status(404).json("Meal Plan not found");
		}
		if (err instanceof Error) console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Set a meal plan as the current one (admin only)
router.put(
	"/:id/set-current",
	requireAdmin,
	async (req: Request, res: Response) => {
		try {
			const planId = Number.parseInt(req.params.id as string, 10);

			await prisma.$transaction([
				prisma.meal_plans.updateMany({ data: { is_current: false } }),
				prisma.meal_plans.update({
					where: { id: planId },
					data: { is_current: true },
				}),
			]);

			res.json("Current meal plan updated");
		} catch (err: unknown) {
			if (err instanceof Error) console.error(err.message);
			res.status(500).send("Server Error");
		}
	},
);

export default router;
