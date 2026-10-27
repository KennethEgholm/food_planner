import { describe, expect, it, vi } from "vitest";
import { notifyDataChange, onDataChange } from "./refresh";

describe("refresh event bus", () => {
	it("notifies every subscriber", () => {
		const first = vi.fn();
		const second = vi.fn();
		const offFirst = onDataChange(first);
		const offSecond = onDataChange(second);

		notifyDataChange();

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);

		offFirst();
		offSecond();
	});

	it("stops notifying after unsubscribe", () => {
		const listener = vi.fn();
		const unsubscribe = onDataChange(listener);

		notifyDataChange();
		unsubscribe();
		notifyDataChange();

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("does not notify when nothing is subscribed", () => {
		expect(() => notifyDataChange()).not.toThrow();
	});
});
