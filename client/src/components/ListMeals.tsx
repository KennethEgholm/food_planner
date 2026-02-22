import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import MealForm from "./MealForm";

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number;
}

const ListMeals: React.FC = () => {
	const [meals, setMeals] = useState<Meal[]>([]);

	const getMeals = useCallback(async () => {
		try {
			const response = await axios.get("http://localhost:5001/meals");
			setMeals(response.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const deleteMeal = async (id: number) => {
		try {
			await axios.delete(`http://localhost:5001/meals/${id}`);
			setMeals(meals.filter((meal) => meal.id !== id));
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getMeals();
	}, [getMeals]);

	return (
		<table className="table mt-5 text-center">
			<thead>
				<tr>
					<th>Meal Name</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{meals.map((meal) => (
					<tr key={meal.id}>
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
	);
};

export default ListMeals;
