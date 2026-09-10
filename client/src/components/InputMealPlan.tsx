import axios from "axios";
import type React from "react";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { notifyDataChange } from "../utils/refresh";

const InputMealPlan: React.FC = () => {
	const [name, setName] = useState<string>("");
	const [count, setCount] = useState<number | null>(null);
	const [aiLoading, setAiLoading] = useState(false);

	useEffect(() => {
		axios
			.get("/api/meal-plans")
			.then((res) => setCount(res.data.length))
			.catch(() => {});
	}, []);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name };
			await axios.post("/api/meal-plans", body);
			notifyDataChange();
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
			notifyDataChange();
		} catch (err: any) {
			console.error(err.message);
			if (err.response?.data) {
				toast.error(err.response.data);
			} else {
				toast.error("Failed to create random meal plan");
			}
		}
	};

	const onAISubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setAiLoading(true);
		try {
			await axios.post("/api/meal-plans/ai", { name });
			notifyDataChange();
		} catch (err: any) {
			console.error(err.message);
			const msg = err.response?.data || "Failed to generate AI meal plan";
			toast.error(msg);
		} finally {
			setAiLoading(false);
		}
	};

	return (
		<Fragment>
			<div className="page-header">
				<div>
					<h1 className="page-title">Meal Plans</h1>
					<p className="page-subtitle">
						Build a week from scratch, randomise it, or let AI plan it.
					</p>
				</div>
				{count !== null && (
					<span className="chip">
						<i className="bi bi-journal-text" aria-hidden="true" />
						{count} {count === 1 ? "plan" : "plans"}
					</span>
				)}
			</div>

			{/* FAB */}
			<button
				type="button"
				className="fab"
				data-bs-toggle="modal"
				data-bs-target="#addMealPlanModal"
				aria-label="Add Meal Plan"
			>
				<i className="bi bi-plus-lg" aria-hidden="true" />
			</button>
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
								disabled={aiLoading}
								onClick={(e) => onSubmit(e)}
							>
								Create Empty
							</button>
							<button
								type="button"
								className="btn btn-warning"
								data-bs-dismiss="modal"
								disabled={aiLoading}
								onClick={(e) => onRandomSubmit(e)}
							>
								Create Random
							</button>
							<button
								type="button"
								className="btn btn-primary"
								disabled={aiLoading || !name.trim()}
								onClick={(e) => onAISubmit(e)}
							>
								{aiLoading ? (
									<>
										<span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
										Generating…
									</>
								) : (
									"AI Create"
								)}
							</button>
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
								disabled={aiLoading}
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
