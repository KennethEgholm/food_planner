// client/src/components/ListIngredients.tsx

import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import EditIngredient from "./EditIngredient";
import { onDataChange } from "../utils/refresh";

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
	calories_per_100g?: number | null;
}

const ListIngredients: React.FC = () => {
	const [ingredients, setIngredients] = useState<Ingredient[]>([]);

	const getIngredients = useCallback(async () => {
		try {
			const response = await axios.get("/api/ingredients");
			setIngredients(response.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const deleteIngredient = async (id: number) => {
		if (!window.confirm("Delete this ingredient? This cannot be undone.")) return;
		try {
			await axios.delete(`/api/ingredients/${id}`);
			setIngredients(ingredients.filter((ingredient) => ingredient.id !== id));
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getIngredients();
	}, [getIngredients]);

	useEffect(() => onDataChange(getIngredients), [getIngredients]);

	if (ingredients.length === 0) {
		return (
			<div className="empty-state">
				<i className="bi bi-basket" aria-hidden="true" />
				<h3>No ingredients yet</h3>
				<p>Add an ingredient above to start building your pantry.</p>
			</div>
		);
	}

	return (
		<div className="section-card mt-4">
			<table className="table table-striped app-table mb-0">
				<thead>
					<tr>
						<th>Name</th>
						<th className="text-center" style={{ width: "140px" }}>
							Unit
						</th>
						<th className="text-center" style={{ width: "140px" }}>
							Cal/100g
						</th>
						<th className="text-end" style={{ width: "170px" }}>
							Actions
						</th>
					</tr>
				</thead>
				<tbody>
					{ingredients.map((ingredient) => (
						<tr key={ingredient.id}>
							<td className="fw-medium">{ingredient.name}</td>
							<td className="text-center text-muted-soft">
								{ingredient.unit || "–"}
							</td>
							<td className="text-center">
								{ingredient.calories_per_100g != null ? (
									<span className="cal-badge muted">
										{ingredient.calories_per_100g} kcal
									</span>
								) : (
									<span className="text-muted-soft">–</span>
								)}
							</td>
							<td className="text-end">
								<div className="d-flex justify-content-end gap-2">
									<EditIngredient ingredient={ingredient} />
									<button
										type="button"
										className="btn btn-outline-danger"
										onClick={() => deleteIngredient(ingredient.id)}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default ListIngredients;
