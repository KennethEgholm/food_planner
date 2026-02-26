import axios from "axios";
import type React from "react";
import { Fragment, useState } from "react";

const InputSnack: React.FC = () => {
	const [name, setName] = useState<string>("");

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name };
			await axios.post("/api/snacks", body);
			// Refresh to show changes, maintaining tab via localStorage
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	return (
		<Fragment>
			<h1 className="text-center mt-5">Food Planner Snack List</h1>
			<div className="text-center mt-5">
				<button
					type="button"
					className="btn btn-primary"
					data-bs-toggle="modal"
					data-bs-target="#addSnackModal"
				>
					Add Snack
				</button>
			</div>

			{/* Modal */}
			<div
				className="modal"
				id="addSnackModal"
				tabIndex={-1}
				onClick={() => setName("")}
			>
				<div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Add Snack</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => setName("")}
							/>
						</div>

						<div className="modal-body">
							<label htmlFor="snack-name-input" className="form-label">
								Name
							</label>
							<input
								id="snack-name-input"
								type="text"
								className="form-control"
								placeholder="Snack Name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										document.getElementById("add-snack-submit-btn")?.click();
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
								id="add-snack-submit-btn"
							>
								Add
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

export default InputSnack;
