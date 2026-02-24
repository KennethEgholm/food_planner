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
	meal_image?: string | null;
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
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

	const getMealPlanDetails = useCallback(async () => {
		try {
			const res = await axios.get(`/api/meal-plans/${mealPlan.id}`);
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
													<div className="d-flex align-items-center">
														{day.meal_image && (
															<img
																src={`/${day.meal_image}`}
																alt={day.meal_name || "Meal"}
																style={{
																	width: "40px",
																	height: "40px",
																	objectFit: "cover",
																	marginRight: "10px",
																	borderRadius: "4px",
																	cursor: "pointer",
																}}
																onClick={() =>
																	setFullScreenImage(`/${day.meal_image}`)
																}
															/>
														)}
														{day.meal_name ? (
															day.meal_name
														) : (
															<span className="text-secondary">(No Meal)</span>
														)}
													</div>
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
			{fullScreenImage && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(0,0,0,0.8)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 9999,
					}}
					onClick={() => setFullScreenImage(null)}
				>
					<img
						src={fullScreenImage}
						alt="Full Screen"
						style={{ maxHeight: "90%", maxWidth: "90%" }}
					/>
				</div>
			)}
		</>
	);
};

export default ShowMealPlan;
