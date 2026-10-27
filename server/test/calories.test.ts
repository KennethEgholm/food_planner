import assert from "node:assert/strict";
import { test } from "node:test";
import { computeCalories, type CalorieThresholds } from "../utils/calories";

const THRESHOLDS: CalorieThresholds = { low: 200, high: 300 };

test("empty ingredient list yields no calories and no tier", () => {
	const result = computeCalories([], THRESHOLDS);
	assert.deepEqual(result, {
		total_calories: null,
		calories_per_100g: null,
		calorie_tier: null,
	});
});

test("ingredients without a calorie value are ignored", () => {
	const result = computeCalories(
		[
			{ calories_per_100g: null, quantity: 200 },
			{ calories_per_100g: 250, quantity: null },
		],
		THRESHOLDS,
	);
	assert.equal(result.total_calories, null);
	assert.equal(result.calories_per_100g, null);
	assert.equal(result.calorie_tier, null);
});

test("total calories scale with quantity and density", () => {
	// 200 g at 100 kcal/100 g => 200 kcal over a 200 g dish => 100 kcal/100 g
	const result = computeCalories(
		[{ calories_per_100g: 100, quantity: 200 }],
		THRESHOLDS,
	);
	assert.equal(result.total_calories, 200);
	assert.equal(result.calories_per_100g, 100);
	assert.equal(result.calorie_tier, "low");
});

test("calories per 100 g is weighted across the whole dish", () => {
	// 200 g @ 100 kcal + 300 g @ 300 kcal = 1100 kcal over 500 g => 220 kcal/100 g
	const result = computeCalories(
		[
			{ calories_per_100g: 100, quantity: 200 },
			{ calories_per_100g: 300, quantity: 300 },
		],
		THRESHOLDS,
	);
	assert.equal(result.total_calories, 1100);
	assert.equal(result.calories_per_100g, 220);
	assert.equal(result.calorie_tier, "medium");
});

test("numeric strings (Prisma decimals) are coerced", () => {
	const result = computeCalories(
		[{ calories_per_100g: "150", quantity: "100" }],
		THRESHOLDS,
	);
	assert.equal(result.total_calories, 150);
	assert.equal(result.calories_per_100g, 150);
});

test("tier boundaries are exclusive on both ends", () => {
	const tierFor = (density: number) =>
		computeCalories([{ calories_per_100g: density, quantity: 100 }], THRESHOLDS)
			.calorie_tier;

	assert.equal(tierFor(199), "low");
	assert.equal(tierFor(200), "medium");
	assert.equal(tierFor(300), "medium");
	assert.equal(tierFor(301), "high");
});

test("zero quantity keeps the tier null instead of dividing by zero", () => {
	const result = computeCalories(
		[{ calories_per_100g: 100, quantity: 0 }],
		THRESHOLDS,
	);
	assert.equal(result.total_calories, 0);
	assert.equal(result.calories_per_100g, null);
	assert.equal(result.calorie_tier, null);
});
