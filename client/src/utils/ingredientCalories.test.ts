import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import axios from "axios";
import { waitForIngredientCalories } from "./ingredientCalories";
import { onDataChange } from "./refresh";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

const get = vi.mocked(axios.get);

const POLL_MS = 2000;
const MAX_POLLS = 8;

/** Minimal stand-in for the /api/ingredients payload. */
const ingredientsPage = (id: number, calories: number | null) =>
	({ data: [{ id, calories_per_100g: calories }] }) as never;

describe("waitForIngredientCalories", () => {
	let unsubscribe: () => void;
	let listener: Mock<() => void>;

	beforeEach(() => {
		vi.useFakeTimers();
		get.mockReset();
		listener = vi.fn();
		unsubscribe = onDataChange(listener);
	});

	afterEach(() => {
		unsubscribe();
		vi.useRealTimers();
	});

	it("keeps polling until the autofilled value lands, then notifies once", async () => {
		get
			.mockResolvedValueOnce(ingredientsPage(7, null))
			.mockResolvedValueOnce(ingredientsPage(7, null))
			.mockResolvedValueOnce(ingredientsPage(7, 250));

		const done = waitForIngredientCalories(7);
		await vi.advanceTimersByTimeAsync(POLL_MS * 3);
		await done;

		expect(get).toHaveBeenCalledTimes(3);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("ignores other ingredients that already have calories", async () => {
		get
			.mockResolvedValueOnce(ingredientsPage(99, 100))
			.mockResolvedValueOnce(ingredientsPage(7, 42));

		const done = waitForIngredientCalories(7);
		await vi.advanceTimersByTimeAsync(POLL_MS * 2);
		await done;

		expect(get).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("gives up quietly when the value never arrives", async () => {
		get.mockResolvedValue(ingredientsPage(7, null));

		const done = waitForIngredientCalories(7);
		await vi.advanceTimersByTimeAsync(POLL_MS * MAX_POLLS);
		await done;

		expect(get).toHaveBeenCalledTimes(MAX_POLLS);
		expect(listener).not.toHaveBeenCalled();
	});

	it("stops after a request failure instead of retrying forever", async () => {
		get.mockRejectedValueOnce(new Error("offline"));

		const done = waitForIngredientCalories(7);
		await vi.advanceTimersByTimeAsync(POLL_MS);
		await done;

		expect(get).toHaveBeenCalledTimes(1);
		expect(listener).not.toHaveBeenCalled();
	});
});
