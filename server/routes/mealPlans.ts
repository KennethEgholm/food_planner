import { type Request, type Response, Router } from "express";
import { google } from "googleapis";
import { query } from "../db";
import { getAuthenticatedClient } from "./auth"; // Helper to get oauth client

const router = Router();

interface MealPlan {
	id: number;
	name: string;
}

// Create a meal plan
router.post("/", async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		if (!name) {
			return res.status(400).json("Meal Plan name is required");
		}
		const newPlan = await query(
			"INSERT INTO meal_plans (name) VALUES ($1) RETURNING *",
			[name],
		);
		res.json(newPlan.rows[0]);
	} catch (err: any) {
		console.error(err.message);
		if (err.message.includes("UNIQUE constraint failed")) {
			return res.status(409).json("Meal Plan name must be unique");
		}
		res.status(500).send("Server Error");
	}
});

// Create a random meal plan
router.post("/random", async (req: Request, res: Response) => {
	try {
		const { name } = req.body;
		if (!name) {
			return res.status(400).json("Meal Plan name is required");
		}

		// 1. Create the new meal plan
		const newPlanResult = await query(
			"INSERT INTO meal_plans (name) VALUES ($1) RETURNING *",
			[name],
		);
		const newPlan = newPlanResult.rows[0];

		// 2. Get all available meals
		const allMealsResult = await query("SELECT * FROM meals");
		const allMeals = allMealsResult.rows;

		if (allMeals.length === 0) {
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
		const _selectedMeals: any[] = [];
		// Separate pools for weekdays and weekends to manage distribution better if needed
		// But for strict "Only weekend meals on weekend", we just filter.

		const weekendMeals = allMeals.filter((m: any) => m.suitable_for_weekend);

		if (weekendMeals.length === 0) {
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

		let availableWeekMeals = [...allMeals];
		let availableWeekendMeals = [...weekendMeals];

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
				await query(
					"INSERT INTO meal_plan_days (meal_plan_id, day, meal_id) VALUES ($1, $2, $3)",
					[newPlan.id, day, pickedMeal.id],
				);
			}
		}

		res.json(newPlan);
	} catch (err: any) {
		console.error(err.message);
		if (err.message.includes("UNIQUE constraint failed")) {
			return res.status(409).json("Meal Plan name must be unique");
		}
		res.status(500).send("Server Error");
	}
});

// Get all meal plans
router.get("/", async (_req: Request, res: Response) => {
	try {
		const allPlans = await query("SELECT * FROM meal_plans ORDER BY id DESC");
		res.json(allPlans.rows);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get a specific meal plan (with days)
router.get("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const plan = await query("SELECT * FROM meal_plans WHERE id = $1", [id]);

		if (plan.rows.length === 0) {
			return res.status(404).json("Meal Plan not found");
		}

		// Get days/meals for this plan
		// We want to ensure we get results for days that exist in the plan table
		const days = await query(
			`
            SELECT mpd.day, mpd.meal_id, m.name as meal_name 
            FROM meal_plan_days mpd
            LEFT JOIN meals m ON mpd.meal_id = m.id
            WHERE mpd.meal_plan_id = $1
			ORDER BY 
				CASE mpd.day
					WHEN 'Monday' THEN 1
					WHEN 'Tuesday' THEN 2
					WHEN 'Wednesday' THEN 3
					WHEN 'Thursday' THEN 4
					WHEN 'Friday' THEN 5
					WHEN 'Saturday' THEN 6
					WHEN 'Sunday' THEN 7
				END
            `,
			[id],
		);

		// Get snacks for this plan
		const snacks = await query(
			`
			SELECT mps.id as link_id, s.id, s.name
			FROM meal_plan_snacks mps
			JOIN snacks s ON mps.snack_id = s.id
			WHERE mps.meal_plan_id = $1
			`,
			[id],
		);

		res.json({ ...plan.rows[0], days: days.rows, snacks: snacks.rows });
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Add a snack to a meal plan
router.post("/:id/snacks", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { snack_id } = req.body;

		if (!snack_id) {
			return res.status(400).json("Snack ID is required");
		}

		const newLink = await query(
			"INSERT INTO meal_plan_snacks (meal_plan_id, snack_id) VALUES ($1, $2) RETURNING *",
			[id, snack_id],
		);

		res.json(newLink.rows[0]);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Remove a snack from a meal plan
router.delete("/:id/snacks/:linkId", async (req: Request, res: Response) => {
	try {
		const { linkId } = req.params;
		await query("DELETE FROM meal_plan_snacks WHERE id = $1", [linkId]);
		res.json("Snack removed from plan");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get shopping list for a meal plan (including snacks)
router.get("/:id/shopping-list", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const shoppingList = await query(
			`
            SELECT i.name, i.unit, SUM(sub.quantity) as total_quantity 
            FROM (
                SELECT mi.ingredient_id, mi.quantity 
                FROM meal_plan_days mpd
                JOIN meal_ingredients mi ON mpd.meal_id = mi.meal_id
                WHERE mpd.meal_plan_id = $1
                
                UNION ALL

                SELECT si.ingredient_id, si.quantity
                FROM meal_plan_snacks mps
                JOIN snack_ingredients si ON mps.snack_id = si.snack_id
                WHERE mps.meal_plan_id = $1
            ) sub
            JOIN ingredients i ON sub.ingredient_id = i.id
            GROUP BY i.id, i.name, i.unit
            ORDER BY i.name
            `,
			[id],
		);
		res.json(shoppingList.rows);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Export shopping list to Google Tasks
router.post(
	"/:id/shopping-list/export",
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// 1. Get Shopping List Items
			const shoppingList = await query(
				`
            SELECT i.name, i.unit, SUM(sub.quantity) as total_quantity 
            FROM (
                SELECT mi.ingredient_id, mi.quantity 
                FROM meal_plan_days mpd
                JOIN meal_ingredients mi ON mpd.meal_id = mi.meal_id
                WHERE mpd.meal_plan_id = $1
                
                UNION ALL

                SELECT si.ingredient_id, si.quantity
                FROM meal_plan_snacks mps
                JOIN snack_ingredients si ON mps.snack_id = si.snack_id
                WHERE mps.meal_plan_id = $1
            ) sub
            JOIN ingredients i ON sub.ingredient_id = i.id
            GROUP BY i.id, i.name, i.unit
            ORDER BY i.name
            `,
				[id],
			);

			if (shoppingList.rows.length === 0) {
				return res.status(400).json("Shopping list is empty.");
			}

			// 2. Authenticate
			// Note: getAuthenticatedClient throws if no tokens are found
			let oauth2Client;
			try {
				oauth2Client = await getAuthenticatedClient();
			} catch (_e) {
				return res
					.status(401)
					.json("Not authenticated with Google. Please connect first.");
			}

			const tasksService = google.tasks({ version: "v1", auth: oauth2Client });

			// 3. Create a new Task List (e.g. "Shopping List - <PlanName>")
			// Get plan name first
			const planRes = await query("SELECT name FROM meal_plans WHERE id = $1", [
				id,
			]);
			const planName = planRes.rows[0]?.name || "Plan";
			const taskListTitle = `Shopping List: ${planName}`;

			const taskList = await tasksService.tasklists.insert({
				requestBody: {
					title: taskListTitle,
				},
			});

			const taskListId = taskList.data.id;

			// 4. Create tasks for each item
			// Note: Google Tasks API has quotas. We should be careful about batching or rate limits.
			// For a personal app, looping is usually fine for < 100 items.
			// Parallelizing might hit rate limits, so sequential is safer.
			for (const item of shoppingList.rows) {
				const title = `${item.name} (${item.total_quantity} ${
					item.unit || ""
				})`;
				await tasksService.tasks.insert({
					tasklist: taskListId!, // non-null assertion
					requestBody: {
						title: title,
						status: "needsAction",
					},
				});
			}

			res.json(`Successfully exported to Google Tasks list: ${taskListTitle}`);
		} catch (err: any) {
			console.error(err.message);
			res.status(500).send(`Server Error: ${err.message}`);
		}
	},
);

// Update days in a meal plan (Set a meal for a day)
router.put("/:id/days", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { day, meal_id } = req.body;

		if (!day) {
			return res.status(400).json("Day is required");
		}

		// Use REPLACE or upsert logic. Since (meal_plan_id, day) is PRIMARY KEY, INSERT OR REPLACE works in SQLite.
		await query(
			"INSERT OR REPLACE INTO meal_plan_days (meal_plan_id, day, meal_id) VALUES ($1, $2, $3)",
			[id, day, meal_id || null], // Convert 0 or undefined to null
		);

		res.json("Meal updated for the day");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Delete a meal plan
router.delete("/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await query("DELETE FROM meal_plans WHERE id = $1", [id]);
		res.json("Meal Plan was deleted");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
