// client/src/components/ListIngredients.tsx

import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import EditIngredient from "./EditIngredient";

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
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

	return (
		<table className="table mt-5 text-center">
			<thead>
				<tr>
					<th>Name</th>
					<th>Unit</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{ingredients.map((ingredient) => (
					<tr key={ingredient.id}>
						<td>{ingredient.name}</td>
						<td>{ingredient.unit || "-"}</td>
						<td>
							<div className="d-flex justify-content-center gap-2">
								<EditIngredient ingredient={ingredient} />
								<button
									className="btn btn-danger"
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
	);
};

export default ListIngredients;
