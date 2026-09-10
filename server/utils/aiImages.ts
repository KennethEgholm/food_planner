import fs from "node:fs";
import path from "node:path";
import { prisma } from "../db";
import { appLog } from "./appLog";

type EntityKind = "meal" | "snack";

/**
 * Fire-and-forget: generate a representative image via the configured AI
 * provider if the meal/snack does not have one yet.
 */
export async function generateRepresentativeImageIfMissing(
	kind: EntityKind,
	id: number,
): Promise<void> {
	const entity =
		kind === "meal"
			? await prisma.meals.findUnique({
					where: { id },
					include: { meal_ingredients: { include: { ingredients: true } } },
				})
			: await prisma.snacks.findUnique({
					where: { id },
					include: { snack_ingredients: { include: { ingredients: true } } },
				});
	if (!entity || entity.representative_image) return;

	const aiSettings = await prisma.app_settings.findMany({
		where: {
			key: { in: ["image_ai_api_key", "image_ai_base_url", "image_ai_model"] },
		},
	});
	const getSetting = (key: string) =>
		aiSettings.find((s) => s.key === key)?.value || null;
	const apiKey = getSetting("image_ai_api_key");
	if (!apiKey) return;
	const baseUrl = (getSetting("image_ai_base_url") || "https://api.x.ai/v1").replace(
		/\/$/,
		"",
	);
	const imageModel = getSetting("image_ai_model") || "grok-imagine-image";

	const ingredientNames =
		kind === "meal"
			? (entity as any).meal_ingredients.map(
					(mi: any) => mi.ingredients.name,
				)
			: (entity as any).snack_ingredients.map(
					(si: any) => si.ingredients.name,
				);

	const noun = kind === "meal" ? "plate" : "serving";
	const label = kind === "meal" ? "Meal" : "Snack";
	const prompt = ingredientNames.length
		? `A delicious ${noun} of ${entity.name}, made with ${ingredientNames.join(", ")}. Food photography, appetizing, well-lit.`
		: `A delicious ${noun} of ${entity.name}. Food photography, appetizing, well-lit.`;

	try {
		const aiRes = await fetch(`${baseUrl}/images/generations`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({ model: imageModel, prompt, n: 1 }),
		});
		if (!aiRes.ok) {
			const errBody = await aiRes.text();
			appLog(
				"error",
				"image-gen",
				`${label} "${entity.name}": AI API error ${aiRes.status}: ${errBody}`,
			);
			return;
		}

		const aiData = (await aiRes.json()) as { data: { url?: string }[] };
		const imageUrl = aiData.data?.[0]?.url;
		if (!imageUrl) {
			appLog("error", "image-gen", `${label} "${entity.name}": No image URL in response`);
			return;
		}

		const imgRes = await fetch(imageUrl);
		if (!imgRes.ok) {
			appLog(
				"error",
				"image-gen",
				`${label} "${entity.name}": Image download failed (${imgRes.status})`,
			);
			return;
		}

		const buffer = Buffer.from(await imgRes.arrayBuffer());
		const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
		const filePath = path.join("uploads", filename);
		fs.writeFileSync(filePath, buffer);

		if (kind === "meal") {
			await prisma.meals.update({
				where: { id },
				data: { representative_image: filePath },
			});
		} else {
			await prisma.snacks.update({
				where: { id },
				data: { representative_image: filePath },
			});
		}
	} catch (err: unknown) {
		if (err instanceof Error) {
			appLog("error", "image-gen", `${label} image failed: ${err.message}`);
		}
	}
}
