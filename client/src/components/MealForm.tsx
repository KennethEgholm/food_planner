import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number;
}

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
}

interface MealIngredient extends Ingredient {
	quantity: number;
	tempId?: number; // For local-only ingredients before save
}

interface MealFormProps {
	initialMeal?: Meal;
	readOnly?: boolean;
}

const MealForm: React.FC<MealFormProps> = ({
	initialMeal,
	readOnly = false,
}) => {
	// If we have an initial meal, we are in Edit Mode.
	// Otherwise, we are in Create Mode (Draft Mode).
	const isEditMode = !!initialMeal && !readOnly;

	const [name, setName] = useState(initialMeal ? initialMeal.name : "");
	const [suitableForWeekend, setSuitableForWeekend] = useState(
		initialMeal ? initialMeal.suitable_for_weekend === 1 : false,
	);

	const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string>("");
	const [quantity, setQuantity] = useState<string>("");

	const getMealIngredients = useCallback(async () => {
		if (!initialMeal) return;
		try {
			const res = await axios.get(
				`http://localhost:5001/meals/${initialMeal.id}/ingredients`,
			);
			setMealIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [initialMeal]);

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
			getMealIngredients();
		}
		getAllIngredients();
	}, [isEditMode, getMealIngredients, getAllIngredients]);

	const handleSave = async (e?: React.SyntheticEvent) => {
		if (e) e.preventDefault();
		try {
			let currentMealId = initialMeal?.id;

			if (isEditMode && currentMealId) {
				// Update existing meal details
				const body = { name, suitable_for_weekend: suitableForWeekend ? 1 : 0 };
				await axios.put(`http://localhost:5001/meals/${currentMealId}`, body);
			} else {
				// Create new meal
				const body = { name, suitable_for_weekend: suitableForWeekend };
				const res = await axios.post("http://localhost:5001/meals", body);
				currentMealId = res.data.id;
			}

			if (!currentMealId) return;

			// If we were in Create Mode, we now need to save all the locally added ingredients
			if (!isEditMode && mealIngredients.length > 0) {
				const promises = mealIngredients.map((ing) =>
					axios.post(
						`http://localhost:5001/meals/${currentMealId}/ingredients`,
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

		if (isEditMode && initialMeal) {
			// Edit Mode: Add directly to DB
			try {
				await axios.post(
					`http://localhost:5001/meals/${initialMeal.id}/ingredients`,
					{
						ingredient_id: ingredientId,
						quantity: qty,
					},
				);
				getMealIngredients();
			} catch (err: any) {
				console.error(err.message);
			}
		} else {
			// Create Mode: Add to local state
			const newIng: MealIngredient = {
				...ingredientObj,
				quantity: qty,
				tempId: Date.now(),
			};
			setMealIngredients([...mealIngredients, newIng]);
		}

		setSelectedIngredient("");
		setQuantity("");
	};

	const removeIngredient = async (ingredient: MealIngredient) => {
		if (isEditMode && initialMeal) {
			// Edit Mode: Remove from DB
			try {
				await axios.delete(
					`http://localhost:5001/meals/${initialMeal.id}/ingredients/${ingredient.id}`,
				);
				getMealIngredients();
			} catch (err: any) {
				console.error(err.message);
			}
		} else {
			// Create Mode: Remove from local state
			setMealIngredients(
				mealIngredients.filter((i) => i.tempId !== ingredient.tempId),
			);
		}
	};

	const resetForm = () => {
		if (!initialMeal) {
			setName("");
			setSuitableForWeekend(false);
			setMealIngredients([]);
		} else {
			setName(initialMeal.name);
			setSuitableForWeekend(initialMeal.suitable_for_weekend === 1);
			getMealIngredients();
		}
	};

	const modalId = initialMeal
		? readOnly
			? `viewMealId${initialMeal.id}`
			: `editMealId${initialMeal.id}`
		: "addMealModal";
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
					{initialMeal?.name}
				</span>
			) : (
				<button
					type="button"
					className={`btn ${initialMeal ? "btn-warning" : "btn-primary"}`}
					data-bs-toggle="modal"
					data-bs-target={targetId}
				>
					{initialMeal ? "Edit" : "Add Meal"}
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
								{initialMeal
									? readOnly
										? "View Meal"
										: "Edit Meal"
									: "Add Meal"}
							</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => {
									resetForm();
									if (initialMeal) window.location.reload();
								}}
							/>
						</div>

						<div className="modal-body">
							<div className="mb-3">
								<label htmlFor={`meal-name-${modalId}`} className="form-label">
									Meal Name
								</label>
								<input
									id={`meal-name-${modalId}`}
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

							<div className="form-check mb-3">
								<input
									className="form-check-input"
									type="checkbox"
									id={`weekendCheck-${modalId}`}
									checked={suitableForWeekend}
									disabled={readOnly}
									onChange={(e) => setSuitableForWeekend(e.target.checked)}
								/>
								<label
									className="form-check-label"
									htmlFor={`weekendCheck-${modalId}`}
								>
									Suitable for Weekends
								</label>
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
								{mealIngredients.map((ing, index) => (
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
									{initialMeal ? "Save Changes" : "Save Meal"}
								</button>
							)}
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => {
									resetForm();
									if (initialMeal) window.location.reload();
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

export default MealForm;
