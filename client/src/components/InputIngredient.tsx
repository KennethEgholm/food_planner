// client/src/components/InputIngredient.tsx

import axios from "axios";
import type React from "react";
import { Fragment, useEffect, useState } from "react";

const InputIngredient: React.FC = () => {
	const [name, setName] = useState<string>("");
	const [unit, setUnit] = useState<string>("");
	const [caloriesPer100g, setCaloriesPer100g] = useState<string>("");
	const [count, setCount] = useState<number | null>(null);

	useEffect(() => {
		axios
			.get("/api/ingredients")
			.then((res) => setCount(res.data.length))
			.catch(() => {});
	}, []);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body: Record<string, unknown> = { name, unit };
			if (caloriesPer100g !== "") body.calories_per_100g = Number(caloriesPer100g);
			await axios.post("/api/ingredients", body);
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const resetForm = () => {
		setName("");
		setUnit("");
		setCaloriesPer100g("");
	};

	return (
		<Fragment>
			<div className="page-header">
				<div>
					<h1 className="page-title">Ingredients</h1>
					<p className="page-subtitle">The pantry behind your meals and snacks.</p>
				</div>
				{count !== null && (
					<span className="chip">
						<i className="bi bi-basket" aria-hidden="true" />
						{count} ingredients
					</span>
				)}
			</div>

			{/* FAB */}
			<button
				type="button"
				className="fab"
				data-bs-toggle="modal"
				data-bs-target="#addIngredientModal"
				aria-label="Add Ingredient"
			>
				<i className="bi bi-plus-lg" aria-hidden="true" />
			</button>

			{/* Modal */}
			<div
				className="modal"
				id="addIngredientModal"
				tabIndex={-1}
				onClick={resetForm}
			>
				<div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Add Ingredient</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={resetForm}
							/>
						</div>

						<div className="modal-body">
							<label htmlFor="name-input" className="form-label">
								Name
							</label>
							<input
								id="name-input"
								type="text"
								className="form-control mb-3"
								placeholder="Ingredient Name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										onSubmit(e);
									}
								}}
							/>
							<label htmlFor="unit-input" className="form-label">
								Unit
							</label>
							<select
								id="unit-input"
								className="form-select"
								value={unit}
								onChange={(e) => setUnit(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										onSubmit(e);
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
							<label htmlFor="calories-input" className="form-label mt-3">
								Calories per 100g
							</label>
							<input
								id="calories-input"
								type="number"
								min="0"
								className="form-control"
								placeholder="Leave blank to autofill via AI"
								value={caloriesPer100g}
								onChange={(e) => setCaloriesPer100g(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										onSubmit(e);
									}
								}}
							/>
						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-primary"
								data-bs-dismiss="modal"
								onClick={onSubmit}
							>
								Add
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
								onClick={resetForm}
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

export default InputIngredient;
