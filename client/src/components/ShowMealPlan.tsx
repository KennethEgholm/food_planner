import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface MealPlan {
	id: number;
	name: string;
}

interface MealPlanDay {
	day: string;
	meal_id: number | null;
	meal_name: string | null;
	meal_image?: string | null;
	lunch_meal_id?: number | null;
	lunch_meal_name?: string | null;
	lunch_meal_image?: string | null;
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
	const modalRef = useRef<HTMLDivElement>(null);
	const { id: urlId } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const getMealPlanDetails = useCallback(async () => {
		try {
			const res = await axios.get(`/api/meal-plans/${mealPlan.id}`);
			setDays(res.data.days);
			setSnacks(res.data.snacks || []);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [mealPlan.id]);

	// Auto-open modal and update URL when this plan is deep-linked
	useEffect(() => {
		const el = modalRef.current;
		if (!el || !urlId || Number(urlId) !== mealPlan.id) return;

		const bsWindow = window as any;
		if (!bsWindow.bootstrap) return;

		getMealPlanDetails();
		const modal = bsWindow.bootstrap.Modal.getOrCreateInstance(el);
		modal.show();

		const handleHide = () => {
			navigate("/plans", { replace: true });
		};
		el.addEventListener("hidden.bs.modal", handleHide, { once: true });
		return () => {
			el.removeEventListener("hidden.bs.modal", handleHide);
		};
	}, [urlId, mealPlan.id, getMealPlanDetails, navigate]);

	return (
		<>
			<button
				type="button"
				className="btn btn-link text-decoration-none"
				onClick={() => navigate(`/plans/${mealPlan.id}`)}
			>
				{mealPlan.name}
			</button>

			{/* Modal */}
			<div
				className="modal fade"
				id={`showMealPlan${mealPlan.id}`}
				tabIndex={-1}
				ref={modalRef}
			>
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
											<Fragment key={`${day.day}-${index}`}>
												<tr>
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
												{(day.day === "Saturday" || day.day === "Sunday") && (
													<tr>
														<td className="text-muted ps-3" style={{ fontSize: "0.9em" }}>Lunch</td>
														<td>
															<div className="d-flex align-items-center">
																{day.lunch_meal_image && (
																	<img
																		src={`/${day.lunch_meal_image}`}
																		alt={day.lunch_meal_name || "Lunch"}
																		style={{
																			width: "40px",
																			height: "40px",
																			objectFit: "cover",
																			marginRight: "10px",
																			borderRadius: "4px",
																			cursor: "pointer",
																		}}
																		onClick={() =>
																			setFullScreenImage(`/${day.lunch_meal_image}`)
																		}
																	/>
																)}
																{day.lunch_meal_name ? (
																	day.lunch_meal_name
																) : (
																	<span className="text-secondary">(No Lunch)</span>
																)}
															</div>
														</td>
													</tr>
												)}
											</Fragment>
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
