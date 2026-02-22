import axios from "axios";
import type React from "react";
import { useCallback, useState } from "react";

interface MealPlan {
	id: number;
	name: string;
}

interface MealPlanDay {
	day: string;
	meal_id: number | null;
	meal_name: string | null;
}

interface MealPlanSnack {
	link_id: number;
	id: number;
	name: string;
}

interface ShowMealPlanProps {
	mealPlan: MealPlan;
}

const ShowMealPlan: React.FC<ShowMealPlanProps> = ({ mealPlan }) => {
	const [days, setDays] = useState<MealPlanDay[]>([]);
	const [snacks, setSnacks] = useState<MealPlanSnack[]>([]);

	const getMealPlanDetails = useCallback(async () => {
		try {
			const res = await axios.get(
				`http://localhost:5001/meal-plans/${mealPlan.id}`,
			);
			setDays(res.data.days);
			setSnacks(res.data.snacks || []);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [mealPlan.id]);

	return (
		<>
			<button
				type="button"
				className="btn btn-link text-decoration-none"
				data-bs-toggle="modal"
				data-bs-target={`#showMealPlan${mealPlan.id}`}
				onClick={() => getMealPlanDetails()}
			>
				{mealPlan.name}
			</button>

			{/* Modal */}
			<div className="modal fade" id={`showMealPlan${mealPlan.id}`}>
				<div className="modal-dialog modal-lg">
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{mealPlan.name}</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
							/>
						</div>

						<div className="modal-body">
							{days.length === 0 ? (
								<p className="text-center">No meals planned yet.</p>
							) : (
								<table className="table table-striped">
									<thead>
										<tr>
											<th>Day</th>
											<th>Meal</th>
										</tr>
									</thead>
									<tbody>
										{days.map((day, index) => (
											<tr key={`${day.day}-${day.meal_id}-${index}`}>
												<td>{day.day}</td>
												<td>
													{day.meal_name ? (
														day.meal_name
													) : (
														<span className="text-secondary">(No Meal)</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}

							{snacks.length > 0 && (
								<>
									<h5 className="mt-4">Snacks</h5>
									<ul className="list-group">
										{snacks.map((snack) => (
											<li key={snack.link_id} className="list-group-item">
												{snack.name}
											</li>
										))}
									</ul>
								</>
							)}
						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default ShowMealPlan;
