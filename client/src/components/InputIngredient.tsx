// client/src/components/InputIngredient.tsx

import axios from "axios";
import type React from "react";
import { Fragment, useEffect, useState } from "react";

const InputIngredient: React.FC = () => {
	const [name, setName] = useState<string>("");
	const [unit, setUnit] = useState<string>("");
	const [caloriesPer100g, _setCaloriesPer100g] = useState<string>("");
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

	return (
		<Fragment>
			<h1 className="mt-5">
				Food Planner Ingredient List
				{count !== null && (
					<span
						className="badge bg-secondary ms-3 align-middle"
						style={{ fontSize: "0.5em" }}
					>
						{count}
					</span>
				)}
			</h1>

			{/* FAB */}
			<div
				style={{
					position: "fixed",
					bottom: "24px",
					left: 0,
					right: 0,
					zIndex: 1040,
					pointerEvents: "none",
				}}
			>
				<div
					className="container"
					style={{ display: "flex", justifyContent: "flex-end" }}
				>
					<button
						type="button"
						data-bs-toggle="modal"
						data-bs-target="#addIngredientModal"
						aria-label="Add Ingredient"
						style={{
							pointerEvents: "all",
							width: "56px",
							height: "56px",
							borderRadius: "50%",
							backgroundColor: "#1565c0",
							color: "white",
							fontSize: "28px",
							lineHeight: "1",
							border: "none",
							cursor: "pointer",
							boxShadow:
								"0 4px 8px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.15)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						+
					</button>
				</div>
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
