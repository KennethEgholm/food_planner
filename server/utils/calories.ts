import { prisma } from "../db";

export type CalorieTier = "low" | "medium" | "high" | null;

export interface CalorieResult {
	total_calories: number | null;
	calories_per_100g: number | null;
	calorie_tier: CalorieTier;
}

export interface CalorieThresholds {
	low: number;
	high: number;
}

export async function getCalorieThresholds(): Promise<CalorieThresholds> {
	const rows = await prisma.app_settings.findMany({
		where: {
			key: { in: ["calorie_low_threshold", "calorie_high_threshold"] },
		},
	});
	const get = (key: string, def: number) => {
		const val = rows.find((s) => s.key === key)?.value;
		return val != null ? Number(val) : def;
	};
	return {
		low: get("calorie_low_threshold", 200),
		high: get("calorie_high_threshold", 300),
	};
}

/**
 * Weighted calories per 100 g across an ingredient list, plus the
 * traffic-light tier. Shared by meals and snacks.
 */
export function computeCalories(
	ingredients: { calories_per_100g: unknown; quantity: unknown }[],
	thresholds: CalorieThresholds,
): CalorieResult {
	let weightedCalories = 0;
	let totalWeight = 0;
	let hasCalories = false;

	for (const item of ingredients) {
		const cal =
			item.calories_per_100g != null ? Number(item.calories_per_100g) : null;
		const qty = item.quantity != null ? Number(item.quantity) : null;
		if (cal != null && qty != null) {
			weightedCalories += (qty / 100) * cal;
			totalWeight += qty;
			hasCalories = true;
		}
	}

	const total_calories = hasCalories ? Math.round(weightedCalories) : null;
	const calories_per_100g =
		hasCalories && totalWeight > 0
			? Math.round((weightedCalories / totalWeight) * 100)
			: null;
	const calorie_tier: CalorieTier =
		calories_per_100g == null
			? null
			: calories_per_100g < thresholds.low
				? "low"
				: calories_per_100g > thresholds.high
					? "high"
					: "medium";

	return { total_calories, calories_per_100g, calorie_tier };
}
