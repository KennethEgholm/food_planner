import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import EditMealPlan from "./EditMealPlan";
import ShowMealPlan from "./ShowMealPlan";
import ShowShoppingList from "./ShowShoppingList";
import { onDataChange } from "../utils/refresh";

interface MealPlan {
	id: number;
	name: string;
	is_current: boolean;
}

const ListMealPlans: React.FC = () => {
	const [plans, setPlans] = useState<MealPlan[]>([]);

	const getPlans = useCallback(async () => {
		try {
			const response = await axios.get("/api/meal-plans");
			setPlans(response.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const deletePlan = async (id: number) => {
		if (!window.confirm("Delete this meal plan? This cannot be undone.")) return;
		try {
			await axios.delete(`/api/meal-plans/${id}`);
			setPlans(plans.filter((plan) => plan.id !== id));
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const setCurrentPlan = async (id: number) => {
		try {
			await axios.put(`/api/meal-plans/${id}/set-current`);
			setPlans(plans.map((plan) => ({ ...plan, is_current: plan.id === id })));
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getPlans();
	}, [getPlans]);

	useEffect(() => onDataChange(getPlans), [getPlans]);

	const sorted = [...plans].sort(
		(a, b) => Number(b.is_current) - Number(a.is_current),
	);

	if (sorted.length === 0) {
		return (
			<div className="empty-state">
				<i className="bi bi-journal-text" aria-hidden="true" />
				<h3>No meal plans yet</h3>
				<p>Use the + button to create one — or let AI plan your week.</p>
			</div>
		);
	}

	return (
		<div className="row row-cols-1 row-cols-md-2 g-3">
			{sorted.map((plan) => (
				<div className="col" key={plan.id}>
					<article className={`plan-card ${plan.is_current ? "is-current" : ""}`}>
						<div className="plan-card-head">
							<ShowMealPlan mealPlan={plan} />
							{plan.is_current && (
								<span className="chip chip-current">
									<i className="bi bi-check-circle" aria-hidden="true" /> Current
								</span>
							)}
						</div>
						<div className="plan-card-actions">
							{!plan.is_current && (
								<button
									type="button"
									className="btn btn-outline-success"
									onClick={() => setCurrentPlan(plan.id)}
								>
									<i className="bi bi-star" aria-hidden="true" /> Set as Current
								</button>
							)}
							<EditMealPlan mealPlan={plan} />
							<ShowShoppingList mealPlan={plan} />
							<button
								type="button"
								className="btn btn-outline-danger"
								onClick={() => deletePlan(plan.id)}
							>
								Delete
							</button>
						</div>
					</article>
				</div>
			))}
		</div>
	);
};

export default ListMealPlans;
