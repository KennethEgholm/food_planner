import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MealForm from "./MealForm";
import { onDataChange } from "../utils/refresh";

interface MealImage {
	id: number;
	path: string;
	sort_order: number;
}

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number | boolean;
	suitable_for_lunch: boolean;
	representative_image?: string | null;
	meal_images?: MealImage[];
	total_calories?: number | null;
	calories_per_100g?: number | null;
	calorie_tier?: "low" | "medium" | "high" | null;
	plan_count?: number;
	created_at?: string | null;
}

type SortField = "name" | "calories_per_100g" | "plan_count" | "created_at";
type SortDir = "asc" | "desc";

const ListMeals: React.FC = () => {
	const [meals, setMeals] = useState<Meal[]>([]);
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
	const [sortField, setSortField] = useState<SortField>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const navigate = useNavigate();

	const handleSortChange = (value: string) => {
		const [field, dir] = value.split(":") as [SortField, SortDir];
		setSortField(field);
		setSortDir(dir);
	};

	const sortedMeals = [...meals].sort((a, b) => {
		let cmp = 0;
		if (sortField === "name") {
			cmp = a.name.localeCompare(b.name);
		} else if (sortField === "calories_per_100g") {
			const aVal = a.calories_per_100g ?? -1;
			const bVal = b.calories_per_100g ?? -1;
			cmp = aVal - bVal;
		} else if (sortField === "plan_count") {
			cmp = (a.plan_count ?? 0) - (b.plan_count ?? 0);
		} else {
			const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
			const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
			cmp = aDate - bDate;
		}
		return sortDir === "asc" ? cmp : -cmp;
	});

	const getMeals = useCallback(async () => {
		try {
			const response = await axios.get("/api/meals");
			setMeals(response.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const deleteMeal = async (id: number) => {
		if (!window.confirm("Delete this meal? This cannot be undone.")) return;
		try {
			await axios.delete(`/api/meals/${id}`);
			setMeals(meals.filter((meal) => meal.id !== id));
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getMeals();
	}, [getMeals]);

	useEffect(() => onDataChange(getMeals), [getMeals]);

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
		<Fragment>
			<div className="d-flex flex-wrap align-items-center justify-content-end gap-2 mb-3">
				<div className="d-flex align-items-center gap-2">
					<label htmlFor="meal-sort" className="form-label mb-0 text-muted-soft">
						Sort
					</label>
					<select
						id="meal-sort"
						className="form-select form-select-sm"
						style={{ width: "auto" }}
						value={`${sortField}:${sortDir}`}
						onChange={(e) => handleSortChange(e.target.value)}
					>
						<option value="name:asc">Name A–Z</option>
						<option value="name:desc">Name Z–A</option>
						<option value="calories_per_100g:asc">Calories (low first)</option>
						<option value="calories_per_100g:desc">Calories (high first)</option>
						<option value="plan_count:desc">Most used</option>
						<option value="plan_count:asc">Least used</option>
						<option value="created_at:desc">Newest</option>
						<option value="created_at:asc">Oldest</option>
					</select>
				</div>
			</div>

			{sortedMeals.length === 0 ? (
				<div className="empty-state">
					<i className="bi bi-egg-fried" aria-hidden="true" />
					<h3>No meals yet</h3>
					<p>Use the + button to add your first meal.</p>
				</div>
			) : (
				<div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
					{sortedMeals.map((meal) => {
						const image =
							meal.representative_image ?? meal.meal_images?.[0]?.path ?? null;
						const extraImages = (meal.meal_images?.length ?? 0) - 1;
						const planCount = meal.plan_count ?? 0;

						return (
							<div className="col" key={meal.id}>
								<article className="meal-card">
									<div className="meal-card-media">
										{image ? (
											<button
												type="button"
												className="media-button"
												aria-label={`View ${meal.name} larger`}
												onClick={() => setFullScreenImage(`/${image}`)}
											>
												<img src={`/${image}`} alt={meal.name} loading="lazy" />
											</button>
										) : (
											<div className="media-placeholder">
												<i className="bi bi-egg-fried" aria-hidden="true" />
											</div>
										)}
										{extraImages > 0 && (
											<span className="media-count">+{extraImages}</span>
										)}
									</div>

									<div className="meal-card-body">
										<h3 className="meal-card-title">
											<button
												type="button"
												className="meal-card-title-link"
												onClick={() => navigate(`/meals/${meal.id}`)}
											>
												{meal.name}
											</button>
										</h3>

										<div className="d-flex flex-wrap gap-1">
											{Boolean(meal.suitable_for_weekend) && (
												<span className="chip chip-weekend">
													<i className="bi bi-sun" aria-hidden="true" /> Weekend
												</span>
											)}
											{meal.suitable_for_lunch && (
												<span className="chip chip-lunch">
													<i className="bi bi-brightness-high" aria-hidden="true" />{" "}
													Lunch
												</span>
											)}
											{meal.calorie_tier ? (
												<span
													className={`cal-badge ${meal.calorie_tier}`}
													title="Calories per 100 g"
												>
													<i className="bi bi-fire" aria-hidden="true" />{" "}
													{meal.calories_per_100g} kcal/100g
												</span>
											) : (
												<span className="cal-badge muted">
													<i className="bi bi-fire" aria-hidden="true" /> No calorie data
												</span>
											)}
										</div>

										<div className="meal-card-meta">
											<span title="Number of meal plans this meal appears in">
												<i className="bi bi-bar-chart" aria-hidden="true" />
												{planCount} {planCount === 1 ? "plan" : "plans"}
											</span>
											{meal.created_at && (
												<span>
													<i className="bi bi-calendar3" aria-hidden="true" />
													{new Date(meal.created_at).toLocaleDateString()}
												</span>
											)}
										</div>

										<div className="meal-card-actions">
											<MealForm initialMeal={meal} />
											<button
												type="button"
												className="btn btn-outline-danger"
												onClick={() => deleteMeal(meal.id)}
											>
												Delete
											</button>
										</div>
									</div>

									{/* Handles deep links to /meals/:id */}
									<MealForm initialMeal={meal} readOnly noTrigger />
								</article>
							</div>
						);
					})}
				</div>
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
		</Fragment>
	);
};

export default ListMeals;
