import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";

interface Meal {
	id: number;
	name: string;
}

interface Snack {
	id: number;
	name: string;
}

interface PlanSnack {
	link_id: number;
	id: number;
	name: string;
}

interface MealPlan {
	id: number;
	name: string;
}

interface MealPlanDay {
	day: string;
	meal_id: number;
	meal_name?: string;
}

interface EditMealPlanProps {
	mealPlan: MealPlan;
}

const DAYS_OF_WEEK = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
];

const EditMealPlan: React.FC<EditMealPlanProps> = ({ mealPlan }) => {
	const [daysData, setDaysData] = useState<Record<string, number | null>>({});
	const [allMeals, setAllMeals] = useState<Meal[]>([]);
	const [allSnacks, setAllSnacks] = useState<Snack[]>([]);
	const [planSnacks, setPlanSnacks] = useState<PlanSnack[]>([]);
	const [selectedSnack, setSelectedSnack] = useState<string>("");

	// Fetch plan details (days and snacks)
	const getPlanDetails = useCallback(async () => {
		try {
			const res = await axios.get(`/api/meal-plans/${mealPlan.id}`);
			const data = res.data;
			// Convert array of days to map
			const dayMap: Record<string, number | null> = {};
			if (data.days) {
				for (const d of data.days) {
					dayMap[d.day] = d.meal_id;
				}
			}
			setDaysData(dayMap);
			if (data.snacks) {
				setPlanSnacks(data.snacks);
			}
		} catch (err: any) {
			console.error(err.message);
		}
	}, [mealPlan.id]);

	// Fetch all meals and snacks for dropdown
	const getAllOptions = useCallback(async () => {
		try {
			const [mealsRes, snacksRes] = await Promise.all([
				axios.get("/api/meals"),
				axios.get("/api/snacks"),
			]);
			setAllMeals(mealsRes.data);
			setAllSnacks(snacksRes.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const addSnackToPlan = async () => {
		try {
			if (!selectedSnack) return;
			await axios.post(`/api/meal-plans/${mealPlan.id}/snacks`, {
				snack_id: Number(selectedSnack),
			});
			getPlanDetails();
			setSelectedSnack("");
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const removeSnackFromPlan = async (linkId: number) => {
		try {
			await axios.delete(`/api/meal-plans/${mealPlan.id}/snacks/${linkId}`);
			getPlanDetails();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	// Update local state when dropdown changes
	const handleDayChange = (day: string, value: string) => {
		const mealId = value === "" ? null : Number(value);
		setDaysData((prev) => ({ ...prev, [day]: mealId }));
	};

	// Save all changes to server
	const saveChanges = async () => {
		try {
			// Iterate through all days in state and update them
			const promises = Object.entries(daysData).map(([day, mealId]) =>
				axios.put(`/api/meal-plans/${mealPlan.id}/days`, {
					day,
					meal_id: mealId,
				}),
			);
			await Promise.all(promises);
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getPlanDetails();
		getAllOptions();
	}, [getPlanDetails, getAllOptions]);

	return (
		<Fragment>
			<button
				type="button"
				className="btn btn-warning"
				data-bs-toggle="modal"
				data-bs-target={`#planId${mealPlan.id}`}
				onClick={() => {
					getPlanDetails(); // Refresh data on open
				}}
			>
				Edit
			</button>

			{/* Modal */}
			<div className="modal" id={`planId${mealPlan.id}`} tabIndex={-1}>
				<div
					className="modal-dialog modal-lg"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Edit Plan: {mealPlan.name}</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => getPlanDetails()} // Reset on close
							/>
						</div>

						<div className="modal-body">
							<table className="table">
								<thead>
									<tr>
										<th>Day</th>
										<th>Meal</th>
									</tr>
								</thead>
								<tbody>
									{DAYS_OF_WEEK.map((day) => (
										<tr key={day}>
											<td>{day}</td>
											<td>
												<select
													className="form-select"
													value={daysData[day] || ""}
													onChange={(e) => handleDayChange(day, e.target.value)}
												>
													<option value="">No Meal</option>
													{allMeals.map((meal) => (
														<option key={meal.id} value={meal.id}>
															{meal.name}
														</option>
													))}
												</select>
											</td>
										</tr>
									))}
								</tbody>
							</table>

							<h5 className="mt-4">Snacks</h5>
							<div className="input-group mb-3">
								<select
									className="form-select"
									value={selectedSnack}
									onChange={(e) => setSelectedSnack(e.target.value)}
								>
									<option value="">Select Snack</option>
									{allSnacks.map((snack) => (
										<option key={snack.id} value={snack.id}>
											{snack.name}
										</option>
									))}
								</select>
								<button
									className="btn btn-success"
									type="button"
									onClick={addSnackToPlan}
								>
									Add
								</button>
							</div>

							<ul className="list-group">
								{planSnacks.map((ps) => (
									<li
										key={ps.link_id}
										className="list-group-item d-flex justify-content-between align-items-center"
									>
										{ps.name}
										<button
											className="btn btn-danger btn-sm"
											onClick={() => removeSnackFromPlan(ps.link_id)}
										>
											Remove
										</button>
									</li>
								))}
							</ul>
						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-primary" // Save button
								data-bs-dismiss="modal"
								onClick={() => saveChanges()}
							>
								Save
							</button>
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => getPlanDetails()} // Reset on close
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		</Fragment>
	);
};

export default EditMealPlan;
