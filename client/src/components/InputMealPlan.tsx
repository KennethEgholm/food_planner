import axios from "axios";
import type React from "react";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";

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
			window.location.reload();
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
			window.location.reload();
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
			window.location.reload();
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
			<h1 className="mt-5">
				Meal Plans
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
						data-bs-target="#addMealPlanModal"
						aria-label="Add Meal Plan"
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
								className="btn btn-danger"
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
