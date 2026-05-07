import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useState } from "react";
import toast from "react-hot-toast";

interface MealPlan {
	id: number;
	name: string;
}

interface ShoppingListItem {
	name: string;
	unit: string;
	total_quantity: number;
}

interface ShowShoppingListProps {
	mealPlan: MealPlan;
}

const ShowShoppingList: React.FC<ShowShoppingListProps> = ({ mealPlan }) => {
	const [list, setList] = useState<ShoppingListItem[]>([]);
	const [isConnected, setIsConnected] = useState<boolean>(false);
	const [authUrl, setAuthUrl] = useState<string>("");

	const getShoppingList = useCallback(async () => {
		try {
			const res = await axios.get(
				`/api/meal-plans/${mealPlan.id}/shopping-list`,
			);
			setList(res.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [mealPlan.id]);

	const checkAuthStatus = useCallback(async () => {
		try {
			const res = await axios.get("/api/auth/google/status");
			setIsConnected(res.data.connected);
			// Always pre-fetch the auth URL so the Connect button works immediately
			// when the user needs to (re)authenticate.
			const urlRes = await axios.get("/api/auth/google/url", {
				params: { returnPath: `/plans/${mealPlan.id}` },
			});
			setAuthUrl(urlRes.data.url);
		} catch (err: any) {
			console.error(err.message);
		}
	}, [mealPlan.id]);

	const exportToGoogleTasks = async () => {
		try {
			await axios.post(`/api/meal-plans/${mealPlan.id}/shopping-list/export`);
			toast.success("Successfully exported to Google Tasks!");
		} catch (err: any) {
			console.error(err.message);
			if (err.response?.status === 401) {
				// Tokens expired/revoked — server has cleared them. Force re-connect.
				setIsConnected(false);
				try {
					const urlRes = await axios.get("/api/auth/google/url", {
						params: { returnPath: `/plans/${mealPlan.id}` },
					});
					setAuthUrl(urlRes.data.url);
				} catch {
					/* ignore */
				}
				toast.error("Google connection expired. Please reconnect below.");
			} else {
				const serverMsg =
					typeof err.response?.data === "string"
						? err.response.data
						: err.message;
				toast.error(`Export failed: ${serverMsg}`);
			}
		}
	};

	const disconnectGoogle = async () => {
		try {
			await axios.delete("/api/auth/google/disconnect");
			setIsConnected(false);
			toast.success("Disconnected from Google.");
		} catch {
			toast.error("Failed to disconnect.");
		}
	};

	return (
		<Fragment>
			<button
				type="button"
				className="btn btn-info"
				data-bs-toggle="modal"
				data-bs-target={`#shoppingList${mealPlan.id}`}
				onClick={() => {
					getShoppingList();
					checkAuthStatus();
				}}
			>
				Shopping List
			</button>

			{/* Modal */}
			<div className="modal" id={`shoppingList${mealPlan.id}`} tabIndex={-1}>
				<div
					className="modal-dialog modal-lg"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">Shopping List: {mealPlan.name}</h4>
							<button
								type="button"
								className="btn-close"
								data-bs-dismiss="modal"
							/>
						</div>

						<div className="modal-body">
							{list.length === 0 ? (
								<p className="text-center">
									No ingredients found for this plan.
								</p>
							) : (
								<table className="table table-striped">
									<thead>
										<tr>
											<th>Ingredient</th>
											<th>Quantity</th>
											<th>Unit</th>
										</tr>
									</thead>
									<tbody>
										{list.map((item, index) => (
											<tr key={`${item.name}-${index}`}>
												<td>{item.name}</td>
												<td>{item.total_quantity}</td>
												<td>{item.unit || "-"}</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>

						<div className="modal-footer">
							{isConnected ? (
								<>
									<button
										type="button"
										className="btn btn-primary"
										onClick={exportToGoogleTasks}
									>
										Export to Google Tasks
									</button>
									<button
										type="button"
										className="btn btn-outline-secondary"
										onClick={disconnectGoogle}
										title="Forget the stored Google credentials"
									>
										Disconnect Google
									</button>
								</>
							) : (
								<a
									href={authUrl}
									className="btn btn-outline-primary"
									target="_blank"
									rel="noreferrer"
								>
									Connect Google Tasks
								</a>
							)}
							<button
								type="button"
								className="btn btn-secondary"
								data-bs-dismiss="modal"
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

export default ShowShoppingList;
