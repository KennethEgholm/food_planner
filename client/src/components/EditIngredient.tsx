import axios from "axios";
import type React from "react";
import { Fragment, useState } from "react";

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
	calories_per_100g?: number | null;
}

interface EditIngredientProps {
	ingredient: Ingredient;
}

const EditIngredient: React.FC<EditIngredientProps> = ({ ingredient }) => {
	const [name, setName] = useState(ingredient.name);
	const [unit, setUnit] = useState(ingredient.unit || "");
	const [caloriesPer100g, setCaloriesPer100g] = useState(
		ingredient.calories_per_100g != null ? String(ingredient.calories_per_100g) : "",
	);

	const updateIngredient = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body: Record<string, unknown> = { name, unit };
			if (caloriesPer100g !== "") body.calories_per_100g = Number(caloriesPer100g);
			await axios.put(`/api/ingredients/${ingredient.id}`, body);
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	return (
		<Fragment>
			<button
				type="button"
				className="btn btn-outline-secondary"
				data-bs-toggle="modal"
				data-bs-target={`#id${ingredient.id}`}
			>
				Edit
			</button>

			{/* Modal */}
			<div
				className="modal"
				id={`id${ingredient.id}`}
				tabIndex={-1}
				onClick={() => {
					setName(ingredient.name);
					setUnit(ingredient.unit || "");
					setCaloriesPer100g(ingredient.calories_per_100g != null ? String(ingredient.calories_per_100g) : "");
				}}
			>
				<div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Edit Ingredient</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => {
									setName(ingredient.name);
									setUnit(ingredient.unit || "");
									setCaloriesPer100g(ingredient.calories_per_100g != null ? String(ingredient.calories_per_100g) : "");
								}}
							></button>
						</div>

						<div className="modal-body">
							<label htmlFor={`name-input-${ingredient.id}`} className="form-label">
								Name
							</label>
							<input
								id={`name-input-${ingredient.id}`}
								type="text"
								className="form-control mb-3"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										updateIngredient(e);
									}
								}}
							/>
							<label htmlFor={`unit-input-${ingredient.id}`} className="form-label">
								Unit
							</label>
							<select
								id={`unit-input-${ingredient.id}`}
								className="form-select"
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										updateIngredient(e);
									}
								}}
							>
								<option value="" disabled>
									Select unit
								</option>
								<option value="gram">gram</option>
								<option value="centiliter">centiliter</option>
								<option value="deciliter">deciliter</option>
								<option value="stk">stk</option>
							</select>
							<label htmlFor={`calories-input-${ingredient.id}`} className="form-label mt-3">
								Calories per 100g
							</label>
							<input
								id={`calories-input-${ingredient.id}`}
								type="number"
								min="0"
								className="form-control"
								placeholder="Leave blank to autofill via AI"
								value={caloriesPer100g}
								onChange={(e) => setCaloriesPer100g(e.target.value)}
								onKeyDown={(e) => { if (e.key === "Enter") updateIngredient(e); }}
							/>
						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-primary"
								data-bs-dismiss="modal"
								onClick={updateIngredient}
							>
								Save
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
								onClick={() => {
									setName(ingredient.name);
									setUnit(ingredient.unit || "");
									setCaloriesPer100g(ingredient.calories_per_100g != null ? String(ingredient.calories_per_100g) : "");
								}}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		</Fragment>
	);
};

export default EditIngredient;
