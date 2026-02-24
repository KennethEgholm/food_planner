import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import MealForm from "./MealForm";

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number | boolean;
	image_path?: string;
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
								{meal.image_path && (
									<img
										src={`/${meal.image_path}`}
										alt={meal.name}
										style={{
											width: "50px",
											height: "50px",
											objectFit: "cover",
											cursor: "pointer",
										}}
										onClick={() => setFullScreenImage(`/${meal.image_path}`)}
									/>
								)}
							</td>
							<td>
								<MealForm initialMeal={meal} readOnly />{" "}
								{Boolean(meal.suitable_for_weekend) && (
									<span className="badge bg-success ms-2">Weekend</span>
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
