import { useState } from "react";
import { Toaster } from "react-hot-toast";
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
	const [activeTab, setActiveTab] = useState(
		localStorage.getItem("activeTab") || "plans",
	);

	const handleTabChange = (tab) => {
		setActiveTab(tab);
		localStorage.setItem("activeTab", tab);
	};

	return (
		<div className="container">
			<Toaster position="top-center" />
			<ul className="nav nav-tabs mt-5">
				<li className="nav-item">
					<button
						className={`nav-link ${activeTab === "plans" ? "active" : ""}`}
						onClick={() => handleTabChange("plans")}
						type="button"
					>
						Meal Plans
					</button>
				</li>
				<li className="nav-item">
					<button
						className={`nav-link ${activeTab === "meals" ? "active" : ""}`}
						onClick={() => handleTabChange("meals")}
						type="button"
					>
						Meals
					</button>
				</li>
				<li className="nav-item">
					<button
						className={`nav-link ${activeTab === "snacks" ? "active" : ""}`}
						onClick={() => handleTabChange("snacks")}
						type="button"
					>
						Snacks
					</button>
				</li>
				<li className="nav-item">
					<button
						className={`nav-link ${activeTab === "ingredients" ? "active" : ""}`}
						onClick={() => handleTabChange("ingredients")}
						type="button"
					>
						Ingredients
					</button>
				</li>
			</ul>

			<div className="tab-content mt-3">
				{activeTab === "plans" && (
					<div className="tab-pane fade show active">
						<InputMealPlan />
						<ListMealPlans />
					</div>
				)}
				{activeTab === "meals" && (
					<div className="tab-pane fade show active">
						<div className="text-center mt-5 mb-5">
							<h1 className="mb-4">Food Planner Meal List</h1>
							<MealForm />
						</div>
						<ListMeals />
					</div>
				)}
				{activeTab === "snacks" && (
					<div className="tab-pane fade show active">
						<div className="text-center mt-5 mb-5">
							<h1 className="mb-4">Food Planner Snack List</h1>
							<SnackForm />
						</div>
						<ListSnacks />
					</div>
				)}
				{activeTab === "ingredients" && (
					<div className="tab-pane fade show active">
						<InputIngredient />
						<ListIngredients />
					</div>
				)}
			</div>
		</div>
	);
}

export default App;
