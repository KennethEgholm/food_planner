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
								<div className="text-center mt-5 mb-5">
									<h1 className="mb-4">Food Planner Meal List</h1>
									<MealForm />
								</div>
								<ListMeals />
							</div>
						}
					/>
					<Route
						path="/snacks"
						element={
							<div className="tab-pane fade show active">
								<div className="text-center mt-5 mb-5">
									<h1 className="mb-4">Food Planner Snack List</h1>
									<SnackForm />
								</div>
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
