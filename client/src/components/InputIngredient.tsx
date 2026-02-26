// client/src/components/InputIngredient.tsx

import axios from "axios";
import type React from "react";
import { Fragment, useState } from "react";

const InputIngredient: React.FC = () => {
	const [name, setName] = useState<string>("");
	const [unit, setUnit] = useState<string>("");

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name, unit };
			await axios.post("/api/ingredients", body);
			window.location.href = "/";
		} catch (err: any) {
			console.error(err.message);
		}
	};

	return (
		<Fragment>
			<h1 className="text-center mt-5">Food Planner Ingredient List</h1>
			<div className="text-center mt-5">
				<button
					type="button"
					className="btn btn-primary"
					data-bs-toggle="modal"
					data-bs-target="#addIngredientModal"
				>
					Add Ingredient
				</button>
			</div>

			{/* Modal */}
			<div
				className="modal"
				id="addIngredientModal"
				tabIndex={-1}
				onClick={() => {
					setName("");
					setUnit("");
				}}
			>
				<div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Add Ingredient</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => {
									setName("");
									setUnit("");
								}}
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
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => {
									setName("");
									setUnit("");
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

export default InputIngredient;
