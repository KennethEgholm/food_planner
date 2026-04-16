import axios from "axios";
import type React from "react";
import { Fragment, useState } from "react";

const InputMeal: React.FC = () => {
	const [name, setName] = useState<string>("");
	const [suitableForWeekend, setSuitableForWeekend] = useState<boolean>(false);
	const [suitableForLunch, setSuitableForLunch] = useState<boolean>(false);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name, suitable_for_weekend: suitableForWeekend, suitable_for_lunch: suitableForLunch };
			await axios.post("/api/meals", body);
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	return (
		<Fragment>
			<h1 className="text-center mt-5">Food Planner Meal List</h1>
			<div className="text-center mt-5">
				<button
					type="button"
					className="btn btn-primary"
					data-bs-toggle="modal"
					data-bs-target="#addMealModal"
				>
					Add Meal
				</button>
			</div>

			{/* Modal */}
			<div
				className="modal"
				id="addMealModal"
				tabIndex={-1}
				onClick={() => {
					setName("");
					setSuitableForWeekend(false);
					setSuitableForLunch(false);
				}}
			>
				<div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Add Meal</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => {
									setName("");
									setSuitableForWeekend(false);
									setSuitableForLunch(false);
								}}
							/>
						</div>

						<div className="modal-body">
							<label htmlFor="meal-name-input" className="form-label">
								Name
							</label>
							<input
								id="meal-name-input"
								type="text"
								className="form-control"
								placeholder="Meal Name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										document.getElementById("add-meal-submit-btn")?.click();
									}
								}}
							/>
							<div className="form-check mt-3">
								<input
									className="form-check-input"
									type="checkbox"
									id="weekendCheck"
									checked={suitableForWeekend}
									onChange={(e) => setSuitableForWeekend(e.target.checked)}
								/>
								<label className="form-check-label" htmlFor="weekendCheck">
									Suitable for weekends
								</label>
							</div>								<div className="form-check mt-2">
									<input
										className="form-check-input"
										type="checkbox"
										id="lunchCheck"
										checked={suitableForLunch}
										onChange={(e) => setSuitableForLunch(e.target.checked)}
									/>
									<label className="form-check-label" htmlFor="lunchCheck">
										Suitable for Lunch
									</label>
								</div>						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-primary"
								data-bs-dismiss="modal"
								onClick={onSubmit}
								id="add-meal-submit-btn"
							>
								Add
							</button>
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => {
									setName("");
									setSuitableForWeekend(false);
									setSuitableForLunch(false);
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

export default InputMeal;
