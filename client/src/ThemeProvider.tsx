import { useEffect, useState } from "react";
import type React from "react";
import { readStoredTheme, ThemeContext, type ThemeId } from "./theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [theme, setTheme] = useState<ThemeId>(readStoredTheme);

	useEffect(() => {
		const root = document.documentElement;
		root.dataset.theme = theme;
		root.dataset.bsTheme = theme === "dark" ? "dark" : "light";
		try {
			localStorage.setItem("food-planner-theme", theme);
		} catch {
			// ignore
		}
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
};
