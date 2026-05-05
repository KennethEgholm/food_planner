import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface MealImage {
	id: number;
	path: string;
	sort_order: number;
}

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number | boolean;
	suitable_for_lunch?: number | boolean;
	representative_image?: string | null;
	meal_images?: MealImage[];
	total_calories?: number | null;
	calories_per_100g?: number | null;
	calorie_tier?: "low" | "medium" | "high" | null;
	created_at?: string | null;
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
	noTrigger?: boolean;
}

const MealForm: React.FC<MealFormProps> = ({
	initialMeal,
	readOnly = false,
	noTrigger = false,
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
	const [suitableForLunch, setSuitableForLunch] = useState(
		initialMeal
			? initialMeal.suitable_for_lunch === 1 ||
					initialMeal.suitable_for_lunch === true
			: false,
	);
	const [newImages, setNewImages] = useState<File[]>([]);
	const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
	const [existingImages, setExistingImages] = useState<MealImage[]>(
		initialMeal?.meal_images ?? [],
	);
	const [representativeImage, setRepresentativeImage] = useState<string | null>(
		initialMeal?.representative_image ?? null,
	);
	const [newRepresentativeImage, setNewRepresentativeImage] = useState<File | null>(null);
	const [newRepresentativePreview, setNewRepresentativePreview] = useState<string | null>(null);
	const [fullScreen, setFullScreen] = useState<{
		images: string[];
		index: number;
	} | null>(null);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (!fullScreen) return;
			if (e.key === "ArrowRight") {
				setFullScreen((fs) =>
					fs ? { ...fs, index: (fs.index + 1) % fs.images.length } : fs,
				);
			} else if (e.key === "ArrowLeft") {
				setFullScreen((fs) =>
					fs
						? {
								...fs,
								index: (fs.index - 1 + fs.images.length) % fs.images.length,
							}
						: fs,
				);
			} else if (e.key === "Escape") {
				e.stopPropagation();
				setFullScreen(null);
			}
		};
		window.addEventListener("keydown", handleKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleKey, { capture: true });
	}, [fullScreen]);

	const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string>("");
	const [quantity, setQuantity] = useState<string>("");

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) return;
		const files = Array.from(e.target.files);
		setNewImages((prev) => [...prev, ...files]);
		setNewImagePreviews((prev) => [
			...prev,
			...files.map((f) => URL.createObjectURL(f)),
		]);
	};

	const handleRepresentativeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setNewRepresentativeImage(file);
		setNewRepresentativePreview(URL.createObjectURL(file));
	};

	const removeRepresentativeImage = async () => {
		if (newRepresentativeImage) {
			setNewRepresentativeImage(null);
			setNewRepresentativePreview(null);
			return;
		}
		if (representativeImage && initialMeal?.id) {
			try {
				await axios.delete(`/api/meals/${initialMeal.id}/representative-image`);
				setRepresentativeImage(null);
			} catch (err: any) {
				console.error(err.message);
			}
		}
	};

	const removeNewImage = (index: number) => {
		setNewImages((prev) => prev.filter((_, i) => i !== index));
		setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
	};

	const removeExistingImage = async (imageId: number) => {
		try {
			await axios.delete(`/api/meals/${initialMeal?.id}/images/${imageId}`);
			setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
		} catch (err: any) {
			console.error(err.message);
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
			formData.append("suitable_for_lunch", String(suitableForLunch));
			for (const img of newImages) {
				formData.append("images", img);
			}

			if (isEditMode && currentMealId) {
				// Update existing meal details
				await axios.put(`/api/meals/${currentMealId}`, formData);
			} else {
				// Create new meal
				const res = await axios.post("/api/meals", formData);
				currentMealId = res.data.id;
			}

			if (!currentMealId) return;

			// Upload representative image if a new one was selected
			if (newRepresentativeImage) {
				const repFormData = new FormData();
				repFormData.append("image", newRepresentativeImage);
				await axios.put(`/api/meals/${currentMealId}/representative-image`, repFormData);
			}

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
		setNewImages([]);
		setNewImagePreviews([]);
		setNewRepresentativeImage(null);
		setNewRepresentativePreview(null);
		if (!initialMeal) {
			setName("");
			setSuitableForWeekend(false);
			setSuitableForLunch(false);
			setMealIngredients([]);
			setExistingImages([]);
			setRepresentativeImage(null);
		} else {
			setName(initialMeal.name);
			setSuitableForWeekend(initialMeal.suitable_for_weekend === 1);
			setSuitableForLunch(initialMeal.suitable_for_lunch === 1);
			setExistingImages(initialMeal.meal_images ?? []);
			setRepresentativeImage(initialMeal.representative_image ?? null);
			getMealIngredients();
		}
	};

	const modalRef = useRef<HTMLDivElement>(null);
	const { id: urlId } = useParams<{ id: string }>();
	const navigate = useNavigate();

	useEffect(() => {
		if (!readOnly || !initialMeal) return;
		const el = modalRef.current;
		if (!el || !urlId || Number(urlId) !== initialMeal.id) return;

		const bsWindow = window as any;
		if (!bsWindow.bootstrap) return;

		const modal = bsWindow.bootstrap.Modal.getOrCreateInstance(el);
		modal.show();

		const handleHide = () => {
			navigate("/meals", { replace: true });
		};
		el.addEventListener("hidden.bs.modal", handleHide, { once: true });
		return () => {
			el.removeEventListener("hidden.bs.modal", handleHide);
		};
	}, [urlId, initialMeal, readOnly, navigate]);

	const modalId = initialMeal
		? readOnly
			? `viewMealId${initialMeal.id}`
			: `editMealId${initialMeal.id}`
		: "addMealModal";
	const targetId = `#${modalId}`;

	return (
		<Fragment>
			{readOnly && !noTrigger ? (
				<span
					className="text-primary text-decoration-underline"
					data-bs-toggle="modal"
					data-bs-target={targetId}
					style={{ cursor: "pointer" }}
				>
					{initialMeal?.name}
				</span>
			) : !readOnly && initialMeal ? (
				<button
					type="button"
					className="btn btn-warning"
					data-bs-toggle="modal"
					data-bs-target={targetId}
				>
					Edit
				</button>
			) : (
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
							data-bs-target={targetId}
							aria-label="Add Meal"
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
			)}

			<div className="modal" id={modalId} tabIndex={-1} ref={readOnly ? modalRef : undefined}>
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
									if (initialMeal && !readOnly) window.location.reload();
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

						<div className="form-check mb-3 text-start">
								<input
									className="form-check-input"
									type="checkbox"
									id={`lunchCheck-${modalId}`}
									checked={suitableForLunch}
									disabled={readOnly}
									onChange={(e) => setSuitableForLunch(e.target.checked)}
								/>
								<label
									className="form-check-label"
									htmlFor={`lunchCheck-${modalId}`}
								>
									Suitable for Lunch
								</label>
							</div>

							<div className="mb-3">
								<p className="form-label fw-semibold mb-2">Dish Photo</p>
								<div className="d-flex align-items-start gap-3 flex-wrap">
									{(newRepresentativePreview ?? (representativeImage ? `/${representativeImage}` : null)) && (
										<div style={{ position: "relative", display: "inline-block" }}>
											<img
												src={newRepresentativePreview ?? `/${representativeImage}`}
												alt="Dish"
												style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "6px" }}
											/>
											{!readOnly && (
												<button
													type="button"
													className="btn btn-danger btn-sm"
													style={{ position: "absolute", top: 0, right: 0, padding: "0 4px", fontSize: "10px", lineHeight: "16px" }}
													onClick={removeRepresentativeImage}
												>
													✕
												</button>
											)}
										</div>
									)}
									{!readOnly && !(newRepresentativePreview ?? representativeImage) && (
										<input
											type="file"
											className="form-control"
											id={`rep-image-${modalId}`}
											accept="image/*"
											onChange={handleRepresentativeImageChange}
										/>
									)}
									{!readOnly && (newRepresentativePreview ?? representativeImage) && (
										<label htmlFor={`rep-image-replace-${modalId}`} className="btn btn-outline-secondary btn-sm align-self-end">
											Replace
											<input
												type="file"
												id={`rep-image-replace-${modalId}`}
												accept="image/*"
												className="d-none"
												onChange={handleRepresentativeImageChange}
											/>
										</label>
									)}
								</div>
							</div>

							<div className="mb-3">
								<label htmlFor={`meal-image-${modalId}`} className="form-label fw-semibold">
									Cookbook Snapshots
								</label>
								{!readOnly && (
									<input
										type="file"
										className="form-control"
										id={`meal-image-${modalId}`}
										accept="image/*"
										multiple
										onChange={handleImageChange}
									/>
								)}
								{(existingImages.length > 0 || newImagePreviews.length > 0) && (
									<div className="mt-2 d-flex flex-wrap gap-2">
										{existingImages.map((img, idx) => (
											<div
												key={img.id}
												style={{
													position: "relative",
													display: "inline-block",
												}}
											>
												<img
													src={`/${img.path}`}
													alt="Meal"
													style={{
														width: "80px",
														height: "80px",
														objectFit: "cover",
														cursor: "pointer",
													}}
													onClick={() =>
														setFullScreen({
															images: [
																...existingImages.map((i) => `/${i.path}`),
																...newImagePreviews,
															],
															index: idx,
														})
													}
												/>
												{!readOnly && (
													<button
														type="button"
														className="btn btn-danger btn-sm"
														style={{
															position: "absolute",
															top: 0,
															right: 0,
															padding: "0 4px",
															fontSize: "10px",
															lineHeight: "16px",
														}}
														onClick={() => removeExistingImage(img.id)}
													>
														✕
													</button>
												)}
											</div>
										))}
										{newImagePreviews.map((url, idx) => (
											<div
												key={url}
												style={{
													position: "relative",
													display: "inline-block",
												}}
											>
												<img
													src={url}
													alt="New"
													style={{
														width: "80px",
														height: "80px",
														objectFit: "cover",
														cursor: "pointer",
														opacity: 0.7,
													}}
													onClick={() =>
														setFullScreen({
															images: [
																...existingImages.map((i) => `/${i.path}`),
																...newImagePreviews,
															],
															index: existingImages.length + idx,
														})
													}
												/>
												<button
													type="button"
													className="btn btn-danger btn-sm"
													style={{
														position: "absolute",
														top: 0,
														right: 0,
														padding: "0 4px",
														fontSize: "10px",
														lineHeight: "16px",
													}}
													onClick={() => removeNewImage(idx)}
												>
													✕
												</button>
											</div>
										))}
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

						{(initialMeal?.calories_per_100g != null || initialMeal?.total_calories != null) && (
							<div className="px-3 pb-2 d-flex justify-content-end gap-2">
								{initialMeal.calories_per_100g != null && (
									<span className={`badge fs-6 ${
										initialMeal.calorie_tier === "low" ? "bg-success" :
										initialMeal.calorie_tier === "high" ? "bg-danger" :
										"bg-warning text-dark"
									}`}>
										{initialMeal.calories_per_100g} kcal/100g
									</span>
								)}
								{initialMeal.total_calories != null && (
									<span className="badge fs-6 bg-secondary">
										{initialMeal.total_calories} kcal total
									</span>
								)}
								{initialMeal.created_at && (
									<span className="text-muted" style={{ fontSize: "0.8em" }}>
										Added {new Date(initialMeal.created_at).toLocaleDateString()}
									</span>
								)}
							</div>
						)}

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
									if (initialMeal && !readOnly) window.location.reload();
								}}
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
			{fullScreen && (
				<div
					style={{
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100%",
						backgroundColor: "rgba(0,0,0,0.85)",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						zIndex: 9999,
					}}
					onClick={() => setFullScreen(null)}
				>
					{fullScreen.images.length > 1 && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setFullScreen((fs) =>
									fs
										? {
												...fs,
												index:
													(fs.index - 1 + fs.images.length) % fs.images.length,
											}
										: fs,
								);
							}}
							style={{
								position: "absolute",
								left: "20px",
								background: "rgba(255,255,255,0.2)",
								border: "none",
								color: "white",
								fontSize: "2rem",
								padding: "0.25rem 0.75rem",
								borderRadius: "4px",
								cursor: "pointer",
							}}
						>
							&#8249;
						</button>
					)}

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<img
							src={fullScreen.images[fullScreen.index]}
							alt="Full Screen"
							style={{
								maxHeight: "85vh",
								maxWidth: "85vw",
								borderRadius: "6px",
							}}
						/>
						{fullScreen.images.length > 1 && (
							<div
								style={{
									color: "white",
									marginTop: "10px",
									fontSize: "0.9rem",
								}}
							>
								{fullScreen.index + 1} / {fullScreen.images.length}
							</div>
						)}
					</div>

					{fullScreen.images.length > 1 && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setFullScreen((fs) =>
									fs ? { ...fs, index: (fs.index + 1) % fs.images.length } : fs,
								);
							}}
							style={{
								position: "absolute",
								right: "20px",
								background: "rgba(255,255,255,0.2)",
								border: "none",
								color: "white",
								fontSize: "2rem",
								padding: "0.25rem 0.75rem",
								borderRadius: "4px",
								cursor: "pointer",
							}}
						>
							&#8250;
						</button>
					)}

					<button
						type="button"
						onClick={() => setFullScreen(null)}
						style={{
							position: "absolute",
							top: "16px",
							right: "16px",
							background: "rgba(255,255,255,0.2)",
							border: "none",
							color: "white",
							fontSize: "1.5rem",
							padding: "0.1rem 0.6rem",
							borderRadius: "4px",
							cursor: "pointer",
						}}
					>
						&times;
					</button>
				</div>
			)}
		</Fragment>
	);
};

export default MealForm;
