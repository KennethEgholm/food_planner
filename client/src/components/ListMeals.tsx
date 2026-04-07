import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import MealForm from "./MealForm";

interface MealImage {
	id: number;
	path: string;
	sort_order: number;
}

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number | boolean;
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

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("asc");
		}
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

	return (
		<Fragment>
			<table className="table mt-5">
				<thead>
					<tr>
						<th className="text-center" style={{ width: "70px" }}>Image</th>
						<th
							style={{ cursor: "pointer", userSelect: "none" }}
							onClick={() => handleSort("name")}
						>
							Meal Name {sortField === "name" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
						</th>
						<th
							className="text-center"
							style={{ cursor: "pointer", userSelect: "none", width: "140px" }}
							onClick={() => handleSort("calories_per_100g")}
						>
							Kcal/100g {sortField === "calories_per_100g" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
						</th>
						<th
							className="text-center"
							style={{ cursor: "pointer", userSelect: "none", width: "90px" }}
							onClick={() => handleSort("plan_count")}
						>
							Usage {sortField === "plan_count" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
						</th>
						<th
							className="text-center"
							style={{ cursor: "pointer", userSelect: "none", width: "110px" }}
							onClick={() => handleSort("created_at")}
						>
							Created {sortField === "created_at" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
						</th>
						<th className="text-end" style={{ width: "160px" }}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{sortedMeals.map((meal) => (
						<tr key={meal.id}>
							<td className="text-center align-middle">
								{(meal.representative_image ?? meal.meal_images?.[0]?.path) && (
									<div
										style={{ position: "relative", display: "inline-block" }}
									>
										<img
											src={`/${meal.representative_image ?? meal.meal_images?.[0]?.path}`}
											alt={meal.name}
											style={{
												width: "50px",
												height: "50px",
												objectFit: "cover",
												cursor: "pointer",
											}}
											onClick={() =>
												setFullScreenImage(`/${meal.representative_image ?? meal.meal_images?.[0]?.path}`)
											}
										/>
										{(meal.meal_images?.length ?? 0) > 1 && (
											<span
												className="badge bg-secondary"
												style={{
													position: "absolute",
													bottom: 0,
													right: 0,
													fontSize: "9px",
												}}
											>
												+{(meal.meal_images?.length ?? 0) - 1}
											</span>
										)}
									</div>
								)}
							</td>
							<td>
								<MealForm initialMeal={meal} readOnly />{" "}
								{Boolean(meal.suitable_for_weekend) && (
									<span className="badge bg-success ms-2">Weekend</span>
								)}
							</td>
							<td className="text-center align-middle">
								{meal.calorie_tier === "low" && (
									<span className="badge bg-success">{meal.calories_per_100g}</span>
								)}
								{meal.calorie_tier === "medium" && (
									<span className="badge bg-warning text-dark">{meal.calories_per_100g}</span>
								)}
								{meal.calorie_tier === "high" && (
									<span className="badge bg-danger">{meal.calories_per_100g}</span>
								)}
							</td>
							<td className="text-center align-middle">
								{(meal.plan_count ?? 0) > 0 && (
									<span className="badge bg-secondary" title="Number of meal plans this meal appears in">{meal.plan_count}</span>
								)}
							</td>						<td className="text-center align-middle" style={{ fontSize: "0.8em", color: "#888" }}>
							{meal.created_at ? new Date(meal.created_at).toLocaleDateString() : ""}
						</td>							<td className="text-end align-middle">
								<div className="d-flex justify-content-end gap-2">
									<MealForm initialMeal={meal} />
									<button
										className="btn btn-danger"
										onClick={() => deleteMeal(meal.id)}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
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
		</Fragment>
	);
};

export default ListMeals;
