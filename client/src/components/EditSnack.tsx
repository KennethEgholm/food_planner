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
}

interface EditSnackProps {
	snack: Snack;
}

const EditSnack: React.FC<EditSnackProps> = ({ snack }) => {
	const [name, setName] = useState(snack.name);
	const [snackIngredients, setSnackIngredients] = useState<SnackIngredient[]>(
		[],
	);
	const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
	const [selectedIngredient, setSelectedIngredient] = useState<string>("");
	const [quantity, setQuantity] = useState<string>("");

	const getSnackIngredients = useCallback(async () => {
		try {
			const res = await axios.get(
				`/api/snacks/${snack.id}/ingredients`,
			);
			setSnackIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [snack.id]);

	const getAllIngredients = useCallback(async () => {
		try {
			const res = await axios.get("/api/ingredients");
			setAllIngredients(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const addIngredientToSnack = async () => {
		try {
			if (!selectedIngredient || !quantity) return;
			await axios.post(`/api/snacks/${snack.id}/ingredients`, {
				ingredient_id: Number.parseInt(selectedIngredient, 10),
				quantity: Number.parseFloat(quantity),
			});
			getSnackIngredients();
			setSelectedIngredient("");
			setQuantity("");
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const removeIngredientFromSnack = async (ingredientId: number) => {
		try {
			await axios.delete(
				`/api/snacks/${snack.id}/ingredients/${ingredientId}`,
			);
			getSnackIngredients();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	const updateSnack = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const body = { name };
			await axios.put(`/api/snacks/${snack.id}`, body);
			window.location.reload();
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		getSnackIngredients();
		getAllIngredients();
	}, [getSnackIngredients, getAllIngredients]);

	return (
		<Fragment>
			<button
				type="button"
				className="btn btn-warning"
				data-bs-toggle="modal"
				data-bs-target={`#snackId${snack.id}`}
			>
				Edit
			</button>

			{/* Modal */}
			<div
				className="modal"
				id={`snackId${snack.id}`}
				onClick={() => setName(snack.name)}
			>
				<div
					className="modal-dialog modal-lg"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Edit Snack</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
								onClick={() => setName(snack.name)}
							/>
						</div>

						<div className="modal-body">
							<label htmlFor="snack-name-edit" className="form-label">
								Snack Name
							</label>
							<input
								id="snack-name-edit"
								type="text"
								className="form-control mb-4"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										updateSnack(e);
									}
								}}
							/>

							<h5>Ingredients</h5>
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
									onClick={addIngredientToSnack}
								>
									Add
								</button>
							</div>

							<ul className="list-group">
								{snackIngredients.map((ing) => (
									<li
										key={ing.id}
										className="list-group-item d-flex justify-content-between align-items-center"
									>
										{ing.name} - {ing.quantity} {ing.unit}
										<button
											className="btn btn-danger btn-sm"
											onClick={() => removeIngredientFromSnack(ing.id)}
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
								onClick={updateSnack}
							>
								Save
							</button>
							<button
								type="button"
								className="btn btn-danger"
								data-bs-dismiss="modal"
								onClick={() => setName(snack.name)}
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

export default EditSnack;
