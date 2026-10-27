import axios from "axios";
import { notifyDataChange } from "./refresh";

const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 2000;

interface IngredientRow {
	id: number;
	calories_per_100g?: number | null;
}

/**
 * The server autofills calories via AI *after* sending its response, so an
 * immediate refetch still sees null. Poll the ingredient until the value
 * lands, then refresh subscribers once. Gives up silently after ~16s.
 */
export async function waitForIngredientCalories(id: number): Promise<void> {
	for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
		try {
			const { data } = await axios.get<IngredientRow[]>("/api/ingredients");
			const ingredient = data.find((item) => item.id === id);
			if (ingredient?.calories_per_100g != null) {
				notifyDataChange();
				return;
			}
		} catch {
			return;
		}
	}
}
