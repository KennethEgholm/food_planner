import axios from "axios";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";

//components
import InputIngredient from "./components/InputIngredient";
import InputMealPlan from "./components/InputMealPlan";
import ListIngredients from "./components/ListIngredients";
import ListMealPlans from "./components/ListMealPlans";
import ListMeals from "./components/ListMeals";
import ListSnacks from "./components/ListSnacks";
import MealForm from "./components/MealForm";
import SnackForm from "./components/SnackForm";

function App() {
	const navLinkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
	const [mealCount, setMealCount] = useState(null);
	const [snackCount, setSnackCount] = useState(null);

	useEffect(() => {
		axios
			.get("/api/meals")
			.then((res) => setMealCount(res.data.length))
			.catch(() => {});
		axios
			.get("/api/snacks")
			.then((res) => setSnackCount(res.data.length))
			.catch(() => {});
	}, []);

	return (
		<div className="container">
			<Toaster position="top-center" />
			<ul className="nav nav-tabs mt-5">
				<li className="nav-item">
					<NavLink className={navLinkClass} to="/plans">
						Meal Plans
					</NavLink>
				</li>
				<li className="nav-item">
					<NavLink className={navLinkClass} to="/meals" end>
						Meals
					</NavLink>
				</li>
				<li className="nav-item">
					<NavLink className={navLinkClass} to="/snacks" end>
						Snacks
					</NavLink>
				</li>
				<li className="nav-item">
					<NavLink className={navLinkClass} to="/ingredients" end>
						Ingredients
					</NavLink>
				</li>
			</ul>

			<div className="tab-content mt-3">
				<Routes>
					<Route path="/" element={<Navigate to="/plans" replace />} />
					<Route
						path="/plans"
						element={
							<div className="tab-pane fade show active">
								<InputMealPlan />
								<ListMealPlans />
							</div>
						}
					/>
					<Route
						path="/plans/:id"
						element={
							<div className="tab-pane fade show active">
								<InputMealPlan />
								<ListMealPlans />
							</div>
						}
					/>
					<Route
						path="/meals"
						element={
							<div className="tab-pane fade show active">
								<h1 className="mt-5 mb-4">
									Food Planner Meal List
									{mealCount !== null && (
										<span
											className="badge bg-secondary ms-3 align-middle"
											style={{ fontSize: "0.5em" }}
										>
											{mealCount}
										</span>
									)}
								</h1>
								<MealForm />
								<ListMeals />
							</div>
						}
					/>
					<Route
						path="/snacks"
						element={
							<div className="tab-pane fade show active">
								<h1 className="mt-5 mb-4">
									Food Planner Snack List
									{snackCount !== null && (
										<span
											className="badge bg-secondary ms-3 align-middle"
											style={{ fontSize: "0.5em" }}
										>
											{snackCount}
										</span>
									)}
								</h1>
								<SnackForm />
								<ListSnacks />
							</div>
						}
					/>
					<Route
						path="/ingredients"
						element={
							<div className="tab-pane fade show active">
								<InputIngredient />
								<ListIngredients />
							</div>
						}
					/>
				</Routes>
			</div>
		</div>
	);
}

export default App;
