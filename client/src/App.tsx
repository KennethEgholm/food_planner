import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import "./theme.css";

//components
import CurrentMealPlan from "./components/CurrentMealPlan";
import InputIngredient from "./components/InputIngredient";
import InputMealPlan from "./components/InputMealPlan";
import ListIngredients from "./components/ListIngredients";
import ListMealPlans from "./components/ListMealPlans";
import ListMeals from "./components/ListMeals";
import ListSnacks from "./components/ListSnacks";
import MealForm from "./components/MealForm";
import Settings from "./components/Settings";
import SnackForm from "./components/SnackForm";

const NAV_ITEMS = [
	{ to: "/current-plan", label: "Current Plan", icon: "bi-calendar-heart" },
	{ to: "/plans", label: "Meal Plans", icon: "bi-journal-text" },
	{ to: "/meals", label: "Meals", icon: "bi-egg-fried", end: true },
	{ to: "/snacks", label: "Snacks", icon: "bi-cup-straw", end: true },
	{ to: "/ingredients", label: "Ingredients", icon: "bi-basket", end: true },
];

function App() {
	const [mealCount, setMealCount] = useState<number | null>(null);
	const [snackCount, setSnackCount] = useState<number | null>(null);
	const [isNavOpen, setIsNavOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		axios
			.get<unknown[]>("/api/meals")
			.then((res) => setMealCount(res.data.length))
			.catch(() => {});
		axios
			.get<unknown[]>("/api/snacks")
			.then((res) => setSnackCount(res.data.length))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (!isNavOpen) return;

		const closeOnOutsidePress = (event: PointerEvent) => {
			if (!headerRef.current?.contains(event.target as Node)) {
				setIsNavOpen(false);
			}
		};

		document.addEventListener("pointerdown", closeOnOutsidePress);
		return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
	}, [isNavOpen]);

	const navLinkClass = ({ isActive }: { isActive: boolean }) =>
		`app-nav-link ${isActive ? "active" : ""}`;

	return (
		<div className="app-shell">
			<Toaster position="top-center" />
			<header
				ref={headerRef}
				className="app-header"
				onKeyDown={(event) => {
					if (event.key === "Escape") setIsNavOpen(false);
				}}
			>
				<div className="app-header-inner">
					<NavLink
						to="/current-plan"
						className="app-brand"
						onClick={() => setIsNavOpen(false)}
					>
						<span className="app-brand-badge">
							<i className="bi bi-egg-fried" aria-hidden="true" />
						</span>
						<span className="app-brand-name">Food Planner</span>
					</NavLink>

					<button
						type="button"
						className="app-nav-toggle"
						aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
						aria-expanded={isNavOpen}
						aria-controls="main-navigation"
						onClick={() => setIsNavOpen((isOpen) => !isOpen)}
					>
						<i className={`bi ${isNavOpen ? "bi-x-lg" : "bi-list"}`} aria-hidden="true" />
					</button>

					<nav
						id="main-navigation"
						className={`app-nav ${isNavOpen ? "is-open" : ""}`}
						aria-label="Main navigation"
					>
						{NAV_ITEMS.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.end}
								className={navLinkClass}
								onClick={() => setIsNavOpen(false)}
							>
								<i className={`bi ${item.icon}`} aria-hidden="true" />
								<span>{item.label}</span>
							</NavLink>
						))}
					</nav>

					<NavLink
						to="/settings"
						end
						className={({ isActive }) =>
							`app-nav-link app-nav-settings ${isActive ? "active" : ""}`
						}
						onClick={() => setIsNavOpen(false)}
					>
						<i className="bi bi-gear" aria-hidden="true" />
						<span className="visually-hidden">Settings</span>
					</NavLink>
				</div>
			</header>

			<main className="app-main">
				<Routes>
					<Route path="/" element={<Navigate to="/current-plan" replace />} />
					<Route path="/current-plan" element={<CurrentMealPlan />} />
					<Route
						path="/plans"
						element={
							<>
								<InputMealPlan />
								<ListMealPlans />
							</>
						}
					/>
					<Route
						path="/plans/:id"
						element={
							<>
								<InputMealPlan />
								<ListMealPlans />
							</>
						}
					/>
					<Route
						path="/meals"
						element={
							<>
								<div className="page-header">
									<div>
										<h1 className="page-title">Meals</h1>
										<p className="page-subtitle">
											Everything you can plan for dinners and weekend lunches.
										</p>
									</div>
									{mealCount !== null && (
										<span className="chip">
											<i className="bi bi-egg-fried" aria-hidden="true" />
											{mealCount} meals
										</span>
									)}
								</div>
								<MealForm />
								<ListMeals />
							</>
						}
					/>
					<Route
						path="/meals/:id"
						element={
							<>
								<div className="page-header">
									<div>
										<h1 className="page-title">Meals</h1>
										<p className="page-subtitle">
											Everything you can plan for dinners and weekend lunches.
										</p>
									</div>
									{mealCount !== null && (
										<span className="chip">
											<i className="bi bi-egg-fried" aria-hidden="true" />
											{mealCount} meals
										</span>
									)}
								</div>
								<MealForm />
								<ListMeals />
							</>
						}
					/>
					<Route
						path="/snacks"
						element={
							<>
								<div className="page-header">
									<div>
										<h1 className="page-title">Snacks</h1>
										<p className="page-subtitle">
											Little extras to add to your meal plans.
										</p>
									</div>
									{snackCount !== null && (
										<span className="chip">
											<i className="bi bi-cup-straw" aria-hidden="true" />
											{snackCount} snacks
										</span>
									)}
								</div>
								<SnackForm />
								<ListSnacks />
							</>
						}
					/>
					<Route
						path="/ingredients"
						element={
							<>
								<InputIngredient />
								<ListIngredients />
							</>
						}
					/>
					<Route path="/settings" element={<Settings />} />
				</Routes>
			</main>
		</div>
	);
}

export default App;
