import { createContext, useContext } from "react";

export type ThemeId = "warm" | "fresh" | "dark";

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
	{
		id: "warm",
		label: "Warm Kitchen",
		description: "Cream, terracotta and sage with serif headings.",
	},
	{
		id: "fresh",
		label: "Fresh Market",
		description: "Bright whites and greens with clean type.",
	},
	{
		id: "dark",
		label: "Dark Bistro",
		description: "Low-light amber tones for evening planning.",
	},
];

const STORAGE_KEY = "food-planner-theme";

type ThemeContextValue = {
	theme: ThemeId;
	setTheme: (theme: ThemeId) => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
	theme: "warm",
	setTheme: () => {},
});

export function readStoredTheme(): ThemeId {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "fresh" || stored === "dark" || stored === "warm") {
			return stored;
		}
	} catch {
		// localStorage unavailable (private mode) — fall through
	}
	return "warm";
}

export function useTheme(): ThemeContextValue {
	return useContext(ThemeContext);
}
