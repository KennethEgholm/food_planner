import axios from "axios";
import type React from "react";
import { Fragment, useCallback, useEffect, useState } from "react";
import SnackForm from "./SnackForm";

interface SnackImage {
	id: number;
	path: string;
	sort_order: number;
}

interface Snack {
	id: number;
	name: string;
	representative_image?: string | null;
	snack_images?: SnackImage[];
	total_calories?: number | null;
	calories_per_100g?: number | null;
	calorie_tier?: "low" | "medium" | "high" | null;
}

const ListSnacks: React.FC = () => {
	const [snacks, setSnacks] = useState<Snack[]>([]);
	const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

	const getSnacks = useCallback(async () => {
		try {
			const response = await axios.get("/api/snacks");
			setSnacks(response.data);
		} catch (err: any) {
			console.error(err.message);
		}
	}, []);

	const deleteSnack = async (id: number) => {
		try {
			await axios.delete(`/api/snacks/${id}`);
			setSnacks(snacks.filter((snack) => snack.id !== id));
		} catch (err: any) {
			console.error(err.message);
		}
	};

	useEffect(() => {
		if (!fullScreenImage) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setFullScreenImage(null);
		};
		window.addEventListener("keydown", handleKey, { capture: true });
		return () =>
			window.removeEventListener("keydown", handleKey, { capture: true });
	}, [fullScreenImage]);

	useEffect(() => {
		getSnacks();
	}, [getSnacks]);

	return (
		<Fragment>
			<table className="table mt-5 text-center">
				<thead>
					<tr>
						<th>Image</th>
						<th>Snack Name</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{snacks.map((snack) => (
						<tr key={snack.id}>
							<td>
								{(snack.representative_image ?? snack.snack_images?.[0]?.path) && (
									<div
										style={{ position: "relative", display: "inline-block" }}
									>
										<img
											src={`/${snack.representative_image ?? snack.snack_images?.[0]?.path}`}
											alt={snack.name}
											style={{
												width: "50px",
												height: "50px",
												objectFit: "cover",
												cursor: "pointer",
											}}
											onClick={() =>
												setFullScreenImage(`/${snack.representative_image ?? snack.snack_images?.[0]?.path}`)
											}
										/>
										{!snack.representative_image && snack.snack_images && snack.snack_images.length > 1 && (
											<span
												className="badge bg-secondary"
												style={{
													position: "absolute",
													bottom: 0,
													right: 0,
													fontSize: "9px",
												}}
											>
												+{snack.snack_images.length - 1}
											</span>
										)}
									</div>
								)}
							</td>
							<td>
								<SnackForm initialSnack={snack} readOnly />
								{snack.calorie_tier === "low" && (
									<span className="badge bg-success ms-2">{snack.calories_per_100g} kcal/100g</span>
								)}
								{snack.calorie_tier === "medium" && (
									<span className="badge bg-warning text-dark ms-2">{snack.calories_per_100g} kcal/100g</span>
								)}
								{snack.calorie_tier === "high" && (
									<span className="badge bg-danger ms-2">{snack.calories_per_100g} kcal/100g</span>
								)}
							</td>
							<td>
								<div className="d-flex justify-content-center gap-2">
									<SnackForm initialSnack={snack} />
									<button
										className="btn btn-danger"
										onClick={() => deleteSnack(snack.id)}
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
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

export default ListSnacks;
