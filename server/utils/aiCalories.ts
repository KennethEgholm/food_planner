import { prisma } from "../db";

/**
 * Asks the configured AI model for the approximate calories per 100g
 * of the given ingredient. Returns an integer or null if unavailable.
 */
export async function getCaloriesPerHundredGrams(
	ingredientName: string,
): Promise<number | null> {
	try {
		const settings = await prisma.app_settings.findMany({
			where: { key: { in: ["calorie_ai_api_key", "calorie_ai_model", "calorie_ai_base_url"] } },
		});
		const get = (key: string) =>
			settings.find((s) => s.key === key)?.value ?? null;

		const apiKey = get("calorie_ai_api_key");
		const model = get("calorie_ai_model") || "grok-3-mini";
		const baseUrl = (get("calorie_ai_base_url") || "https://api.x.ai/v1").replace(/\/$/, "");

		if (!apiKey) return null;

		const res = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					{
						role: "user",
						content: `What is the approximate calories per 100g of "${ingredientName}"? Reply with only a single integer number, nothing else.`,
					},
				],
				max_tokens: 10,
			}),
		});

		if (!res.ok) return null;

		const data = (await res.json()) as {
			choices?: { message?: { content?: string } }[];
		};
		const text = data.choices?.[0]?.message?.content?.trim() ?? "";
		const calories = Number.parseInt(text, 10);
		return Number.isFinite(calories) && calories >= 0 ? calories : null;
	} catch (err: unknown) {
		if (err instanceof Error)
			console.error("AI calorie autofill failed:", err.message);
		return null;
	}
}
