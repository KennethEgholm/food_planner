import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import EditMealPlan from "./EditMealPlan";
import ShowMealPlan from "./ShowMealPlan";
import ShowShoppingList from "./ShowShoppingList";

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

	const sorted = [...plans].sort((a, b) => Number(b.is_current) - Number(a.is_current));

	return (
		<table className="table mt-5 text-center">
			<thead>
				<tr>
					<th>Plan Name</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{sorted.map((plan) => (
					<tr key={plan.id}>
						<td>
							<ShowMealPlan mealPlan={plan} />
						</td>
						<td>
							<div className="d-flex justify-content-center gap-2">
								<EditMealPlan mealPlan={plan} />
								<ShowShoppingList mealPlan={plan} />
								{plan.is_current ? (
									<button
										type="button"
										className="btn btn-success btn-sm"
										style={{ minWidth: "120px" }}
										disabled
									>
										✓ Current
									</button>
								) : (
									<button
										type="button"
										className="btn btn-outline-success btn-sm"
										style={{ minWidth: "120px" }}
										onClick={() => setCurrentPlan(plan.id)}
									>
										Set as Current
									</button>
								)}
								<button
									type="button"
									className="btn btn-danger"
									onClick={() => deletePlan(plan.id)}
								>
									Delete
								</button>
							</div>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

export default ListMealPlans;
