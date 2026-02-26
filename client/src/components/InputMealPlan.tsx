import axios from "axios";
import type React from "react";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";

const InputMealPlan: React.FC = () => {
	const [name, setName] = useState<string>("");

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name };
			await axios.post("/api/meal-plans", body);
			window.location.href = "/";
		} catch (err: any) {
			console.error(err.message);
			if (err.response?.data) {
				toast.error(err.response.data);
			} else {
				toast.error("Failed to create meal plan");
			}
		}
	};

	const onRandomSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name };
			await axios.post("/api/meal-plans/random", body);
			window.location.href = "/";
		} catch (err: any) {
			console.error(err.message);
			if (err.response?.data) {
				toast.error(err.response.data);
			} else {
				toast.error("Failed to create random meal plan");
			}
		}
	};

	return (
		<Fragment>
			<h1 className="text-center mt-5">Meal Plans</h1>
			<div className="text-center mt-5">
				<button
					type="button"
					className="btn btn-primary"
					data-bs-toggle="modal"
					data-bs-target="#addMealPlanModal"
				>
					Add Meal Plan
				</button>
			</div>

			{/* Modal */}
			<div
				className="modal"
				id="addMealPlanModal"
				tabIndex={-1}
				onClick={() => setName("")}
			>
				<div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Add Meal Plan</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => setName("")}
							/>
						</div>

						<div className="modal-body">
							<label htmlFor="plan-name-input" className="form-label">
								Name
							</label>
							<input
								id="plan-name-input"
								type="text"
								className="form-control"
								value={name}
								onChange={(e) => setName(e.target.value)}
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
								className="btn btn-success"
								data-bs-dismiss="modal"
								onClick={(e) => onSubmit(e)}
							>
								Create Empty
							</button>
							<button
								type="button"
								className="btn btn-warning"
								data-bs-dismiss="modal"
								onClick={(e) => onRandomSubmit(e)}
							>
								Create Random
							</button>
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => setName("")}
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

export default InputMealPlan;
