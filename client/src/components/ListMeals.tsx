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
}

const ListMeals: React.FC = () => {
	const [meals, setMeals] = useState<Meal[]>([]);
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

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
			<table className="table mt-5 text-center">
				<thead>
					<tr>
						<th>Image</th>
						<th>Meal Name</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{meals.map((meal) => (
						<tr key={meal.id}>
							<td>
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
								{meal.calorie_tier === "low" && (
									<span className="badge bg-success ms-2">{meal.calories_per_100g} kcal/100g</span>
								)}
								{meal.calorie_tier === "medium" && (
									<span className="badge bg-warning text-dark ms-2">{meal.calories_per_100g} kcal/100g</span>
								)}
								{meal.calorie_tier === "high" && (
									<span className="badge bg-danger ms-2">{meal.calories_per_100g} kcal/100g</span>
								)}
							</td>
							<td>
								<div className="d-flex justify-content-center gap-2">
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
