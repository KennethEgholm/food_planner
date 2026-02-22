import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";

interface Snack {
	id: number;
	name: string;
}

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
}

interface SnackIngredient extends Ingredient {
	quantity: number;
	tempId?: number;
}

interface SnackFormProps {
	initialSnack?: Snack;
	readOnly?: boolean;
}

const SnackForm: React.FC<SnackFormProps> = ({
	initialSnack,
	readOnly = false,
}) => {
	const isEditMode = !!initialSnack && !readOnly;

	const [name, setName] = useState(initialSnack ? initialSnack.name : "");
	const [snackIngredients, setSnackIngredients] = useState<SnackIngredient[]>(
		[],
	);
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string>("");
	const [quantity, setQuantity] = useState<string>("");

	const getSnackIngredients = useCallback(async () => {
		if (!initialSnack) return;
		try {
			const res = await axios.get(
				`http://localhost:5001/snacks/${initialSnack.id}/ingredients`,
			);
			setSnackIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [initialSnack]);

	const getAllIngredients = useCallback(async () => {
		try {
			const res = await axios.get("http://localhost:5001/ingredients");
			setAllIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	useEffect(() => {
		if (isEditMode) {
			getSnackIngredients();
		}
		getAllIngredients();
	}, [isEditMode, getSnackIngredients, getAllIngredients]);

	const handleSave = async (e?: React.SyntheticEvent) => {
		if (e) e.preventDefault();
		try {
			let currentSnackId = initialSnack?.id;

			if (isEditMode && currentSnackId) {
				// Update existing
				const body = { name };
				await axios.put(`http://localhost:5001/snacks/${currentSnackId}`, body);
			} else {
				// Create new
				const body = { name };
				const res = await axios.post("http://localhost:5001/snacks", body);
				currentSnackId = res.data.id;
			}

			if (!currentSnackId) return;

			// If creating, save ingredients locally queued
			if (!isEditMode && snackIngredients.length > 0) {
				const promises = snackIngredients.map((ing) =>
					axios.post(
						`http://localhost:5001/snacks/${currentSnackId}/ingredients`,
						{
							ingredient_id: ing.id,
							quantity: ing.quantity,
						},
					),
				);
				await Promise.all(promises);
			}

			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const addIngredient = async () => {
		if (!selectedIngredient || !quantity) return;

		const ingredientId = Number.parseInt(selectedIngredient, 10);
		const qty = Number.parseFloat(quantity);
		const ingredientObj = allIngredients.find((i) => i.id === ingredientId);

		if (!ingredientObj) return;

		if (isEditMode && initialSnack) {
			// Edit Mode: Add directly to DB
			try {
				await axios.post(
					`http://localhost:5001/snacks/${initialSnack.id}/ingredients`,
					{
						ingredient_id: ingredientId,
						quantity: qty,
					},
				);
				getSnackIngredients();
			} catch (err: any) {
				console.error(err.message);
			}
		} else {
			// Create Mode: Add to local state
			const newIng: SnackIngredient = {
				...ingredientObj,
				quantity: qty,
				tempId: Date.now(),
			};
			setSnackIngredients([...snackIngredients, newIng]);
		}

		setSelectedIngredient("");
		setQuantity("");
	};

	const removeIngredient = async (ingredient: SnackIngredient) => {
		if (isEditMode && initialSnack) {
			// Edit Mode: Remove from DB
			try {
				await axios.delete(
					`http://localhost:5001/snacks/${initialSnack.id}/ingredients/${ingredient.id}`,
				);
				getSnackIngredients();
			} catch (err: any) {
				console.error(err.message);
			}
		} else {
			// Create Mode: Remove from local state
			setSnackIngredients(
				snackIngredients.filter((i) => i.tempId !== ingredient.tempId),
			);
		}
	};

	const resetForm = () => {
		if (!initialSnack) {
			setName("");
			setSnackIngredients([]);
		} else {
			setName(initialSnack.name);
			getSnackIngredients();
		}
	};

	const modalId = initialSnack
		? readOnly
			? `viewSnackId${initialSnack.id}`
			: `editSnackId${initialSnack.id}`
		: "addSnackModal";
	const targetId = `#${modalId}`;

	return (
		<Fragment>
			{readOnly ? (
				<span
					className="text-primary text-decoration-underline"
					data-bs-toggle="modal"
					data-bs-target={targetId}
					style={{ cursor: "pointer" }}
				>
					{initialSnack?.name}
				</span>
			) : (
				<button
					type="button"
					className={`btn ${initialSnack ? "btn-warning" : "btn-primary"}`}
					data-bs-toggle="modal"
					data-bs-target={targetId}
				>
					{initialSnack ? "Edit" : "Add Snack"}
				</button>
			)}

			<div className="modal" id={modalId}>
				<div
					className="modal-dialog modal-lg"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">
								{initialSnack
									? readOnly
										? "View Snack"
										: "Edit Snack"
									: "Add Snack"}
							</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => {
									resetForm();
									if (initialSnack) window.location.reload();
								}}
							/>
						</div>

						<div className="modal-body">
							<div className="mb-3">
								<label htmlFor="snack-name" className="form-label">
									Snack Name
								</label>
								<input
									id="snack-name"
									type="text"
									className="form-control"
									value={name}
									disabled={readOnly}
									onChange={(e) => setName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
										}
									}}
								/>
							</div>

							<hr />
							<h5>Ingredients</h5>
							{!readOnly && (
								<div className="input-group mb-3">
									<select
										className="form-select"
										value={selectedIngredient}
										onChange={(e) => setSelectedIngredient(e.target.value)}
									>
										<option value="" disabled>
											Select Ingredient
										</option>
										{allIngredients.map((ing) => (
											<option key={ing.id} value={ing.id}>
												{ing.name} ({ing.unit})
											</option>
										))}
									</select>
									<input
										type="number"
										className="form-control"
										placeholder="Quantity"
										value={quantity}
										onChange={(e) => setQuantity(e.target.value)}
									/>
									<button
										className="btn btn-success"
										type="button"
										onClick={addIngredient}
									>
										Add
									</button>
								</div>
							)}

							<ul className="list-group">
								{snackIngredients.map((ing, index) => (
									<li
										key={isEditMode ? ing.id : ing.tempId || index}
										className="list-group-item d-flex justify-content-between align-items-center"
									>
										{ing.name} - {ing.quantity} {ing.unit}
										{!readOnly && (
											<button
												type="button"
												className="btn btn-danger btn-sm"
												onClick={() => removeIngredient(ing)}
											>
												Remove
											</button>
										)}
									</li>
								))}
							</ul>
						</div>

						<div className="modal-footer">
							{!readOnly && (
								<button
									type="button"
									className="btn btn-primary"
									onClick={handleSave}
								>
									{initialSnack ? "Save Changes" : "Save Snack"}
								</button>
							)}
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => {
									resetForm();
									if (initialSnack) window.location.reload();
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

export default SnackForm;
