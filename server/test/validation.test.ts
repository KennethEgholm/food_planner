import assert from "node:assert/strict";
import { test } from "node:test";
import {
	isPrismaForeignKeyError,
	isPrismaNotFound,
	parseBoolean,
} from "../utils/validation";

test("parseBoolean accepts the shapes forms and JSON send", () => {
	for (const truthy of [true, "true", 1, "1"]) {
		assert.equal(parseBoolean(truthy), true, `expected ${truthy} to be true`);
	}
	for (const falsy of [false, "false", 0, "0", null, undefined, "", "yes"]) {
		assert.equal(parseBoolean(falsy), false, `expected ${falsy} to be false`);
	}
});

test("isPrismaNotFound only matches P2025", () => {
	assert.equal(isPrismaNotFound({ code: "P2025" }), true);
	assert.equal(isPrismaNotFound({ code: "P2003" }), false);
	assert.equal(isPrismaNotFound(new Error("boom")), false);
	assert.equal(isPrismaNotFound(null), false);
});

test("isPrismaForeignKeyError only matches P2003", () => {
	assert.equal(isPrismaForeignKeyError({ code: "P2003" }), true);
	assert.equal(isPrismaForeignKeyError({ code: "P2025" }), false);
	assert.equal(isPrismaForeignKeyError("P2003"), false);
	assert.equal(isPrismaForeignKeyError(undefined), false);
});
