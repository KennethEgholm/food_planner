import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number | boolean;
	image_path?: string;
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
	// If we have an initial meal, we are in Edit/View Mode.
	// Otherwise, we are in Create Mode (Draft Mode).
	const isEditMode = !!initialMeal && !readOnly;

	const [name, setName] = useState(initialMeal ? initialMeal.name : "");
	const [suitableForWeekend, setSuitableForWeekend] = useState(
		initialMeal
			? initialMeal.suitable_for_weekend === 1 ||
					initialMeal.suitable_for_weekend === true
			: false,
	);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(
		initialMeal?.image_path ? `/${initialMeal.image_path}` : null,
	);
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

	const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string>("");
	const [quantity, setQuantity] = useState<string>("");

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			const file = e.target.files[0];
			setSelectedImage(file);
			setPreviewUrl(URL.createObjectURL(file));
		}
	};

	const getMealIngredients = useCallback(async () => {
		if (!initialMeal) return;
		try {
			const res = await axios.get(`/api/meals/${initialMeal.id}/ingredients`);
			setMealIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [initialMeal]);

	const getAllIngredients = useCallback(async () => {
		try {
			const res = await axios.get("/api/ingredients");
			setAllIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	useEffect(() => {
		if (initialMeal) {
			getMealIngredients();
		}
		if (!readOnly) {
			getAllIngredients();
		}
	}, [initialMeal, readOnly, getMealIngredients, getAllIngredients]);

	const handleSave = async (e?: React.SyntheticEvent) => {
		if (e) e.preventDefault();
		try {
			let currentMealId = initialMeal?.id;

			const formData = new FormData();
			formData.append("name", name);
			formData.append("suitable_for_weekend", String(suitableForWeekend));
			if (selectedImage) {
				formData.append("image", selectedImage);
			}

			if (isEditMode && currentMealId) {
				// Update existing meal details
				await axios.put(`/api/meals/${currentMealId}`, formData, {
					headers: {
						"Content-Type": "multipart/form-data",
					},
				});
			} else {
				// Create new meal
				const res = await axios.post("/api/meals", formData, {
					headers: {
						"Content-Type": "multipart/form-data",
					},
				});
				currentMealId = res.data.id;
			}

			if (!currentMealId) return;

			// If we were in Create Mode, we now need to save all the locally added ingredients
			if (!isEditMode && mealIngredients.length > 0) {
				const promises = mealIngredients.map((ing) =>
					axios.post(`/api/meals/${currentMealId}/ingredients`, {
						ingredient_id: ing.id,
						quantity: ing.quantity,
					}),
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
				await axios.post(`/api/meals/${initialMeal.id}/ingredients`, {
					ingredient_id: ingredientId,
					quantity: qty,
				});
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
					`/api/meals/${initialMeal.id}/ingredients/${ingredient.id}`,
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

							<div className="form-check mb-3 text-start">
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

							<div className="mb-3">
								<label htmlFor={`meal-image-${modalId}`} className="form-label">
									Meal Image
								</label>
								{!readOnly && (
									<input
										type="file"
										className="form-control"
										id={`meal-image-${modalId}`}
										accept="image/*"
										onChange={handleImageChange}
									/>
								)}
								{previewUrl && (
									<div className="mt-2 text-center">
										<img
											src={previewUrl}
											alt="Meal Preview"
											style={{
												maxWidth: "100%",
												maxHeight: "200px",
												cursor: "pointer",
											}}
											onClick={() => setFullScreenImage(previewUrl)}
										/>
									</div>
								)}
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
			{fullScreenImage && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(0,0,0,0.8)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 9999,
					}}
					onClick={() => setFullScreenImage(null)}
				>
					<img
						src={fullScreenImage}
						alt="Full Screen"
						style={{ maxHeight: "90%", maxWidth: "90%" }}
					/>
				</div>
			)}
		</Fragment>
	);
};

export default MealForm;
