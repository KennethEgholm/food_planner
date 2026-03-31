import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface MealPlanDay {
	day: string;
	meal_id: number | null;
	meal_name: string | null;
	meal_image: string | null;
}

interface MealPlanSnack {
	link_id: number;
	id: number;
	name: string;
	snack_image: string | null;
}

interface CurrentPlan {
	id: number;
	name: string;
	days: MealPlanDay[];
	snacks: MealPlanSnack[];
}

const CurrentMealPlan: React.FC = () => {
	const [plan, setPlan] = useState<CurrentPlan | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState<Record<string, boolean>>({});
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

	const fetchPlan = useCallback(async () => {
		try {
			const res = await axios.get("/api/meal-plans/current");
			setPlan(res.data);
		} catch {
			setPlan(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPlan();
	}, [fetchPlan]);

	// Auto-generate images for meals that have none
	useEffect(() => {
		if (!plan) return;
		const missing = plan.days.filter(
(d) => d.meal_id !== null && d.meal_image === null,
		);
		if (missing.length === 0) return;

		const generate = async () => {
			for (const day of missing) {
				if (!day.meal_id) continue;
				setGenerating((prev) => ({ ...prev, [day.day]: true }));
				try {
					await axios.post(`/api/meals/${day.meal_id}/generate-image`);
				} catch {
					// non-admin or generation failed — silently skip
				}
				setGenerating((prev) => ({ ...prev, [day.day]: false }));
			}
			fetchPlan();
		};

		generate();
	}, [plan, fetchPlan]);

	if (loading) {
		return (
<div className="text-center mt-5">
				<output className="spinner-border text-success" />
			</div>
		);
	}

	if (!plan) {
		return (
<div className="text-center mt-5 text-muted">
				<p>No current meal plan set.</p>
				<p>
					Go to <strong>Meal Plans</strong> and click{" "}
					<strong>Set as Current</strong> on a plan.
				</p>
			</div>
		);
	}

	return (
<>
			<h2 className="mt-4 mb-3 text-center">{plan.name}</h2>

			<div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3 mb-4">
				{plan.days.map((day) => (
<div className="col" key={day.day}>
						<div className="card h-100 shadow-sm">
							{generating[day.day] ? (
<div
									className="card-img-top d-flex align-items-center justify-content-center bg-light"
									style={{ height: "180px" }}
								>
									<output className="spinner-border text-secondary" />
								</div>
							) : day.meal_image ? (
<button
									type="button"
									className="p-0 border-0 w-100"
									style={{ background: "none" }}
									onClick={() => setFullScreenImage(`/${day.meal_image}`)}
								>
									<img
										src={`/${day.meal_image}`}
										alt={day.meal_name ?? day.day}
										className="card-img-top"
										style={{ height: "180px", objectFit: "cover" }}
									/>
								</button>
							) : (
<div
									className="card-img-top d-flex align-items-center justify-content-center bg-light text-muted"
									style={{ height: "180px" }}
								>
									<span style={{ fontSize: "2rem" }}>🍽️</span>
								</div>
							)}
							<div className="card-body p-2 text-center">
								<div className="fw-semibold text-muted small">{day.day}</div>
								<div className="fw-bold">
									{day.meal_name ?? (
<span className="text-secondary">No meal</span>
									)}
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{plan.snacks.length > 0 && (
				<>
					<h5 className="text-center text-muted mb-3">Snacks</h5>
					<div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3 mb-4 justify-content-center">
						{plan.snacks.map((snack) => (
							<div className="col" key={snack.link_id}>
								<div className="card h-100 shadow-sm">
									{snack.snack_image ? (
										<button
											type="button"
											className="p-0 border-0 w-100"
											style={{ background: "none" }}
											onClick={() => setFullScreenImage(`/${snack.snack_image}`)}
										>
											<img
												src={`/${snack.snack_image}`}
												alt={snack.name}
												className="card-img-top"
												style={{ height: "120px", objectFit: "cover" }}
											/>
										</button>
									) : (
										<div
											className="card-img-top d-flex align-items-center justify-content-center bg-light text-muted"
											style={{ height: "120px" }}
										>
											<span style={{ fontSize: "1.5rem" }}>🍎</span>
										</div>
									)}
									<div className="card-body p-2 text-center">
										<div className="fw-bold small">{snack.name}</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{fullScreenImage && (
				<button
					type="button"
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(0,0,0,0.85)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 9999,
						cursor: "pointer",
						border: "none",
					}}
					onClick={() => setFullScreenImage(null)}
				>
					<img
						src={fullScreenImage}
						alt="Full screen"
						style={{ maxHeight: "90%", maxWidth: "90%" }}
					/>
				</button>
			)}
		</>
	);
};

export default CurrentMealPlan;
