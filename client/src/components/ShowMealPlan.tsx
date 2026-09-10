import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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

	const todayName = new Date().toLocaleDateString("en-US", {
		weekday: "long",
	});

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

	useEffect(() => {
		if (!fullScreenImage) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setFullScreenImage(null);
		};
		window.addEventListener("keydown", handleKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleKey, { capture: true });
	}, [fullScreenImage]);

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
								<div className="empty-state py-4">
									<i className="bi bi-calendar-x" aria-hidden="true" />
									<p>No meals planned yet.</p>
								</div>
							) : (
								<div className="week-grid">
									{days.map((day, index) => {
										const isWeekend =
											day.day === "Saturday" || day.day === "Sunday";
										const isToday = day.day === todayName;
										return (
											<div
												className={`day-card ${isWeekend ? "is-weekend" : ""} ${
													isToday ? "is-today" : ""
												}`}
												key={`${day.day}-${index}`}
											>
												<div className="day-card-head">
													<span>{day.day}</span>
													{isToday && <span>Today</span>}
												</div>
												<div className="day-card-media">
													{day.meal_image ? (
														<button
															type="button"
															className="media-button"
															aria-label={`View ${day.meal_name ?? day.day} larger`}
															onClick={() =>
																setFullScreenImage(`/${day.meal_image}`)
															}
														>
															<img
																src={`/${day.meal_image}`}
																alt={day.meal_name ?? day.day}
																loading="lazy"
															/>
														</button>
													) : (
														<div className="media-placeholder">
															<i className="bi bi-egg-fried" aria-hidden="true" />
														</div>
													)}
												</div>
												<div className="day-card-body">
													<div className="day-card-meal">
														{day.meal_name ?? (
															<span className="text-muted-soft">No meal</span>
														)}
													</div>
													{isWeekend && (
														<div className="day-card-lunch">
															<span className="day-card-lunch-label">Lunch</span>
															{day.lunch_meal_image && (
																<button
																	type="button"
																	className="media-button"
																	aria-label={`View ${
																		day.lunch_meal_name ?? "lunch"
																	} larger`}
																	onClick={() =>
																		setFullScreenImage(
																			`/${day.lunch_meal_image}`,
																		)
																	}
																>
																	<img
																		src={`/${day.lunch_meal_image}`}
																		alt={day.lunch_meal_name ?? "Lunch"}
																		style={{
																			width: "100%",
																			height: "70px",
																			objectFit: "cover",
																			borderRadius:
																				"var(--bs-border-radius-sm)",
																		}}
																		loading="lazy"
																	/>
																</button>
															)}
															<span>
																{day.lunch_meal_name ?? (
																	<span className="text-muted-soft">
																		No lunch
																	</span>
																)}
															</span>
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}

							{snacks.length > 0 && (
								<div className="mt-4">
									<h5>Snacks</h5>
									<div className="d-flex flex-wrap gap-2">
										{snacks.map((snack) => (
											<span className="chip" key={snack.link_id}>
												<i className="bi bi-cup-straw" aria-hidden="true" />
												{snack.name}
											</span>
										))}
									</div>
								</div>
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
				<button
					type="button"
					className="lightbox"
					onClick={() => setFullScreenImage(null)}
					aria-label="Close image"
				>
					<img src={fullScreenImage} alt="Full screen" />
				</button>
			)}
		</>
	);
};

export default ShowMealPlan;
