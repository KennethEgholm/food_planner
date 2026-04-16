import { prisma } from "../db";
import { appLog } from "./appLog";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKEND_DAYS = new Set(["Saturday", "Sunday"]);

export interface AIMealPlanResult {
	days: { day: string; meal_id: number; lunch_meal_id?: number }[];
	snack_ids: number[];
}

/**
 * Asks the configured AI to generate a 7-day meal plan with snacks.
 * Uses the calorie_ai_* settings and meal_plan_preference from app_settings.
 * Throws if the API key is missing or the response cannot be parsed/validated.
 */
export async function generateAIMealPlan(): Promise<AIMealPlanResult> {
	// ── Load settings ───────────────────────────────────────────────────────
	const settings = await prisma.app_settings.findMany({
		where: {
			key: {
				in: [
					"calorie_ai_api_key",
					"calorie_ai_model",
					"calorie_ai_base_url",
					"meal_plan_preference",
				],
			},
		},
	});
	const get = (key: string) => settings.find((s) => s.key === key)?.value ?? null;

	const apiKey = get("calorie_ai_api_key");
	const model = get("calorie_ai_model") || "grok-3-mini";
	const baseUrl = (get("calorie_ai_base_url") || "https://api.x.ai/v1").replace(/\/$/, "");
	const preference = get("meal_plan_preference") || "none";

	if (!apiKey) throw new Error("calorie_ai_api_key is not configured in Settings.");

	// ── Load meals & snacks ──────────────────────────────────────────────────
	const [allMeals, allSnacks] = await Promise.all([
		prisma.meals.findMany({ select: { id: true, name: true, suitable_for_weekend: true, suitable_for_lunch: true } }),
		prisma.snacks.findMany({ select: { id: true, name: true } }),
	]);

	if (allMeals.length < 7) throw new Error("Not enough meals available to generate a plan.");

	const weekendMeals = allMeals.filter((m) => m.suitable_for_weekend);
	if (weekendMeals.length < 2) {
		throw new Error("At least 2 meals must be marked 'Suitable for weekends' to generate a plan.");
	}

	const lunchMeals = allMeals.filter((m) => m.suitable_for_lunch);

	// ── Load last 3 meal plans for variety context ───────────────────────────
	const recentPlans = await prisma.meal_plans.findMany({
		orderBy: { id: "desc" },
		take: 3,
		include: {
			meal_plan_days: {
				include: { meals: { select: { name: true } } },
			},
		},
	});

	const recentPlansText = recentPlans
		.map((plan) => {
			const dayList = DAYS.map((d) => {
				const entry = plan.meal_plan_days.find((mpd) => mpd.day === d);
				return `${d}=${entry?.meals?.name ?? "none"}`;
			}).join(", ");
			return `"${plan.name}": ${dayList}`;
		})
		.join("\n");

	// ── Build prompt ─────────────────────────────────────────────────────────
	const mealsListText = allMeals
		.map((m) => {
			const tags = [];
			if (m.suitable_for_weekend) tags.push("weekend ok");
			if (m.suitable_for_lunch) tags.push("lunch ok");
			const tagStr = tags.length > 0 ? tags.join(", ") : "weekday only";
			return `${m.id}. ${m.name} (${tagStr})`;
		})
		.join("\n");

	const snacksListText =
		allSnacks.length > 0
			? allSnacks.map((s) => `${s.id}. ${s.name}`).join("\n")
			: "No snacks available.";

	const prompt = `You are a meal planner. Here are all available meals (id. name, tags):
${mealsListText}

Here are all available snacks (id. name):
${snacksListText}

The last 3 meal plans were (for variety, try not to repeat the same meals):
${recentPlansText || "No previous plans."}

User preference: ${preference}

Create a 7-day meal plan (Monday–Sunday). Rules:
- Weekdays (Monday–Friday): any meal may be used for dinner.
- Saturday and Sunday: ONLY use meals tagged "weekend ok" for dinner.
- Saturday and Sunday: also pick a lunch meal tagged "lunch ok" (if any exist). If no lunch meals exist, omit lunch_meal_id.
- Pick between 1 and 3 snacks from the snacks list (or [] if none available).
- Try to avoid repeating meals from the recent plans above.
- Use each meal id only once across all dinner slots. Lunch meals may reuse ids from the dinner pool only if no other option exists.

Respond ONLY with valid JSON, no markdown, no explanation:
{"days":[{"day":"Monday","meal_id":1},{"day":"Tuesday","meal_id":4},{"day":"Wednesday","meal_id":7},{"day":"Thursday","meal_id":2},{"day":"Friday","meal_id":5},{"day":"Saturday","meal_id":3,"lunch_meal_id":8},{"day":"Sunday","meal_id":6,"lunch_meal_id":9}],"snack_ids":[1,3]}`;

	// ── Call AI ───────────────────────────────────────────────────────────────
	const res = await fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [{ role: "user", content: prompt }],
			max_tokens: 300,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		const msg = `AI API error ${res.status}: ${body}`;
		appLog("error", "meal-plan-ai", msg);
		throw new Error(msg);
	}

	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const raw = data.choices?.[0]?.message?.content?.trim() ?? "";

	// ── Parse & validate response ─────────────────────────────────────────────
	// Strip markdown code fences in case the AI wraps in ```json```
	const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
	let parsed: { days: { day: string; meal_id: number; lunch_meal_id?: number }[]; snack_ids: number[] };
	try {
		parsed = JSON.parse(jsonText);
	} catch {
		const msg = `AI returned invalid JSON: ${raw.slice(0, 200)}`;
		appLog("error", "meal-plan-ai", msg);
		throw new Error(msg);
	}

	if (!Array.isArray(parsed.days) || !Array.isArray(parsed.snack_ids)) {
		const msg = `AI response missing required fields: ${raw.slice(0, 200)}`;
		appLog("error", "meal-plan-ai", msg);
		throw new Error(msg);
	}

	const mealIdSet = new Set(allMeals.map((m) => m.id));
	const weekendMealIdSet = new Set(weekendMeals.map((m) => m.id));
	const lunchMealIdSet = new Set(lunchMeals.map((m) => m.id));
	const snackIdSet = new Set(allSnacks.map((s) => s.id));

	// Validate each day
	const validatedDays: { day: string; meal_id: number; lunch_meal_id?: number }[] = [];
	for (const dayEntry of parsed.days) {
		if (!DAYS.includes(dayEntry.day)) continue;
		if (!mealIdSet.has(dayEntry.meal_id)) continue;
		// Weekend constraint for dinner
		if (WEEKEND_DAYS.has(dayEntry.day) && !weekendMealIdSet.has(dayEntry.meal_id)) continue;
		const entry: { day: string; meal_id: number; lunch_meal_id?: number } = {
			day: dayEntry.day,
			meal_id: dayEntry.meal_id,
		};
		// Lunch meal only for weekend days, and only if it's tagged lunch ok
		if (WEEKEND_DAYS.has(dayEntry.day) && dayEntry.lunch_meal_id != null) {
			if (lunchMealIdSet.has(dayEntry.lunch_meal_id)) {
				entry.lunch_meal_id = dayEntry.lunch_meal_id;
			}
		}
		validatedDays.push(entry);
	}

	if (validatedDays.length < 7) {
		const msg = `AI did not produce valid entries for all 7 days (got ${validatedDays.length}).`;
		appLog("error", "meal-plan-ai", msg);
		throw new Error(msg);
	}

	// Validate snacks (silently drop invalid IDs)
	const validatedSnackIds = parsed.snack_ids.filter((id) => snackIdSet.has(id)).slice(0, 3);

	return { days: validatedDays, snack_ids: validatedSnackIds };
}
