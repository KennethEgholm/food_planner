import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";

interface Meal {
	id: number;
	name: string;
	suitable_for_weekend: number;
	suitable_for_lunch: number;
}

interface Ingredient {
	id: number;
	name: string;
	unit?: string;
}

interface MealIngredient extends Ingredient {
	quantity: number;
}

interface EditMealProps {
	meal: Meal;
}

const EditMeal: React.FC<EditMealProps> = ({ meal }) => {
	const [name, setName] = useState(meal.name);
	const [suitableForWeekend, setSuitableForWeekend] = useState(
		meal.suitable_for_weekend === 1,
	);
	const [suitableForLunch, setSuitableForLunch] = useState(
		meal.suitable_for_lunch === 1,
	);
	const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string>("");
	const [quantity, setQuantity] = useState<string>("");

	const getMealIngredients = useCallback(async () => {
		try {
			const res = await axios.get(`/api/meals/${meal.id}/ingredients`);
			setMealIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [meal.id]);

	const getAllIngredients = useCallback(async () => {
		try {
			const res = await axios.get("/api/ingredients");
			setAllIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const addIngredientToMeal = async () => {
		try {
			if (!selectedIngredient || !quantity) return;
			await axios.post(`/api/meals/${meal.id}/ingredients`, {
				ingredient_id: Number.parseInt(selectedIngredient, 10),
				quantity: Number.parseFloat(quantity),
			});
			getMealIngredients();
			setSelectedIngredient("");
			setQuantity("");
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const removeIngredientFromMeal = async (ingredientId: number) => {
		try {
			await axios.delete(`/api/meals/${meal.id}/ingredients/${ingredientId}`);
			getMealIngredients();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const updateMeal = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name, suitable_for_weekend: suitableForWeekend ? 1 : 0, suitable_for_lunch: suitableForLunch ? 1 : 0 };
			await axios.put(`/api/meals/${meal.id}`, body);
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getMealIngredients();
		getAllIngredients();
	}, [getMealIngredients, getAllIngredients]);

	return (
		<Fragment>
			<button
				type="button"
				className="btn btn-warning"
				data-bs-toggle="modal"
				data-bs-target={`#mealId${meal.id}`}
			>
				Edit
			</button>

			{/* Modal */}
			<div
				className="modal"
				id={`mealId${meal.id}`}
				tabIndex={-1}
				onClick={() => {
					setName(meal.name);
					setSuitableForWeekend(meal.suitable_for_weekend === 1);
					setSuitableForLunch(meal.suitable_for_lunch === 1);
				}}
			>
				<div
					className="modal-dialog modal-lg"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Edit Meal</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => {
									setName(meal.name);
									setSuitableForWeekend(meal.suitable_for_weekend === 1);
									setSuitableForLunch(meal.suitable_for_lunch === 1);
								}}
							/>
						</div>

						<div className="modal-body">
							<label htmlFor="meal-name-edit" className="form-label">
								Meal Name
							</label>
							<input
								id="meal-name-edit"
								type="text"
								className="form-control mb-4"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										updateMeal(e);
									}
								}}
							/>

							<div className="form-check mb-3">
								<input
									className="form-check-input"
									type="checkbox"
									checked={suitableForWeekend}
									onChange={(e) => setSuitableForWeekend(e.target.checked)}
									id={`weekendCheck${meal.id}`}
								/>
								<label
									className="form-check-label"
									htmlFor={`weekendCheck${meal.id}`}
								>
									Suitable for Weekends
								</label>
							</div>

									<div className="form-check mb-3">
										<input
											className="form-check-input"
											type="checkbox"
											checked={suitableForLunch}
											onChange={(e) => setSuitableForLunch(e.target.checked)}
											id={`lunchCheck${meal.id}`}
										/>
										<label
											className="form-check-label"
											htmlFor={`lunchCheck${meal.id}`}
										>
											Suitable for Lunch
										</label>
									</div>
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
									onClick={addIngredientToMeal}
								>
									Add
								</button>
							</div>

							<ul className="list-group">
								{mealIngredients.map((ing) => (
									<li
										key={ing.id}
										className="list-group-item d-flex justify-content-between align-items-center"
									>
										{ing.name} - {ing.quantity} {ing.unit}
										<button
											className="btn btn-danger btn-sm"
											onClick={() => removeIngredientFromMeal(ing.id)}
										>
											Remove
										</button>
									</li>
								))}
							</ul>
						</div>

						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-warning"
								data-bs-dismiss="modal"
								onClick={updateMeal}
							>
								Save
							</button>
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => {
									setName(meal.name);
									setSuitableForWeekend(meal.suitable_for_weekend === 1);
									setSuitableForLunch(meal.suitable_for_lunch === 1);
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

export default EditMeal;
