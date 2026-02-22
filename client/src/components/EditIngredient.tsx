import axios from "axios";
import type React from "react";
import { Fragment, useState } from "react";

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
}

interface EditIngredientProps {
	ingredient: Ingredient;
}

const EditIngredient: React.FC<EditIngredientProps> = ({ ingredient }) => {
	const [name, setName] = useState(ingredient.name);
	const [unit, setUnit] = useState(ingredient.unit || "");

	const updateIngredient = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name, unit };
			await axios.put(
				`http://localhost:5001/ingredients/${ingredient.id}`,
				body,
			);
			window.location.href = "/";
		} catch (err: any) {
			console.error(err.message);
		}
	};

	return (
		<Fragment>
			<button
				type="button"
				className="btn btn-warning"
				data-bs-toggle="modal"
				data-bs-target={`#id${ingredient.id}`}
			>
				Edit
			</button>

			{/* Modal */}
			<div
				className="modal"
				id={`id${ingredient.id}`}
				onClick={() => {
					setName(ingredient.name);
					setUnit(ingredient.unit || "");
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
								}}
							></button>
						</div>

						<div className="modal-body">
							<label htmlFor="name-input" className="form-label">
								Name
							</label>
							<input
								id="name-input"
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
						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-warning"
								data-bs-dismiss="modal"
								onClick={updateIngredient}
							>
								Save
							</button>
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => {
									setName(ingredient.name);
									setUnit(ingredient.unit || "");
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
