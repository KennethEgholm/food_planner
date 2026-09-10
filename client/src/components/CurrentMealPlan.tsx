import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface MealPlanDay {
	day: string;
	meal_id: number | null;
	meal_name: string | null;
	meal_image: string | null;
	lunch_meal_id: number | null;
	lunch_meal_name: string | null;
	lunch_meal_image: string | null;
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
	const attemptedRef = useRef<Set<number>>(new Set());
	const planIdRef = useRef<number | null>(null);

	const todayName = new Date().toLocaleDateString("en-US", {
		weekday: "long",
	});

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

	useEffect(() => {
		if (!fullScreenImage) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setFullScreenImage(null);
		};
		window.addEventListener("keydown", handleKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleKey, { capture: true });
	}, [fullScreenImage]);

	// Auto-generate images for meals that have none. Each meal is only attempted
	// once per plan load so a failing generator cannot loop forever.
	useEffect(() => {
		if (!plan) return;
		if (planIdRef.current !== plan.id) {
			planIdRef.current = plan.id;
			attemptedRef.current = new Set();
		}
		const missing = plan.days.filter(
			(d) =>
				d.meal_id !== null &&
				d.meal_image === null &&
				!attemptedRef.current.has(d.meal_id),
		);
		if (missing.length === 0) return;

		for (const day of missing) {
			if (day.meal_id) attemptedRef.current.add(day.meal_id);
		}

		const generate = async () => {
			for (const day of missing) {
				if (!day.meal_id) continue;
				setGenerating((prev) => ({ ...prev, [day.day]: true }));
				try {
					await axios.post(`/api/meals/${day.meal_id}/generate-image`);
				} catch {
					// non-admin or generation failed — don't retry this session
				}
				setGenerating((prev) => ({ ...prev, [day.day]: false }));
			}
			fetchPlan();
		};

		generate();
	}, [plan, fetchPlan]);

	if (loading) {
		return (
			<div className="loading-state">
				<output className="spinner-border" />
				<span>Loading your plan…</span>
			</div>
		);
	}

	if (!plan) {
		return (
			<div className="empty-state">
				<i className="bi bi-calendar-heart" aria-hidden="true" />
				<h3>No current meal plan</h3>
				<p>
					Go to <strong>Meal Plans</strong> and click <strong>Set as Current</strong>{" "}
					on a plan.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="page-header">
				<div>
					<p className="page-subtitle mb-1">Current plan</p>
					<h1 className="page-title">{plan.name}</h1>
				</div>
				<span className="chip chip-current">
					<i className="bi bi-check-circle" aria-hidden="true" /> Active
				</span>
			</div>

			<div className="week-grid mb-4">
				{plan.days.map((day) => {
					const isWeekend = day.day === "Saturday" || day.day === "Sunday";
					const isToday = day.day === todayName;
					return (
						<div
							className={`day-card ${isWeekend ? "is-weekend" : ""} ${
								isToday ? "is-today" : ""
							}`}
							key={day.day}
						>
							<div className="day-card-head">
								<span>{day.day}</span>
								{isToday && <span>Today</span>}
							</div>
							<div className="day-card-media">
								{generating[day.day] ? (
									<div className="media-placeholder">
										<output className="spinner-border spinner-border-sm" />
									</div>
								) : day.meal_image ? (
									<button
										type="button"
										className="media-button"
										aria-label={`View ${day.meal_name ?? day.day} larger`}
										onClick={() => setFullScreenImage(`/${day.meal_image}`)}
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
												aria-label={`View ${day.lunch_meal_name ?? "lunch"} larger`}
												onClick={() =>
													setFullScreenImage(`/${day.lunch_meal_image}`)
												}
											>
												<img
													src={`/${day.lunch_meal_image}`}
													alt={day.lunch_meal_name ?? "Lunch"}
													style={{
														width: "100%",
														height: "70px",
														objectFit: "cover",
														borderRadius: "var(--bs-border-radius-sm)",
													}}
													loading="lazy"
												/>
											</button>
										)}
										<span>
											{day.lunch_meal_name ?? (
												<span className="text-muted-soft">No lunch</span>
											)}
										</span>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{plan.snacks.length > 0 && (
				<section>
					<h5 className="mb-3">Snacks</h5>
					<div className="d-flex flex-wrap gap-2">
						{plan.snacks.map((snack) =>
							snack.snack_image ? (
								<button
									type="button"
									className="chip"
									key={snack.link_id}
									onClick={() => setFullScreenImage(`/${snack.snack_image}`)}
								>
									<img
										src={`/${snack.snack_image}`}
										alt=""
										style={{
											width: "24px",
											height: "24px",
											objectFit: "cover",
											borderRadius: "50%",
										}}
										loading="lazy"
									/>
									{snack.name}
								</button>
							) : (
								<span className="chip" key={snack.link_id}>
									<i className="bi bi-cup-straw" aria-hidden="true" />
									{snack.name}
								</span>
							),
						)}
					</div>
				</section>
			)}

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

export default CurrentMealPlan;
