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
			{snacks.length === 0 ? (
				<div className="empty-state">
					<i className="bi bi-cup-straw" aria-hidden="true" />
					<h3>No snacks yet</h3>
					<p>Use the + button to add your first snack.</p>
				</div>
			) : (
				<div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
					{snacks.map((snack) => {
						const image =
							snack.representative_image ?? snack.snack_images?.[0]?.path ?? null;
						const extraImages = (snack.snack_images?.length ?? 0) - 1;

						return (
							<div className="col" key={snack.id}>
								<article className="meal-card">
									<div className="meal-card-media">
										{image ? (
											<button
												type="button"
												className="media-button"
												aria-label={`View ${snack.name} larger`}
												onClick={() => setFullScreenImage(`/${image}`)}
											>
												<img src={`/${image}`} alt={snack.name} loading="lazy" />
											</button>
										) : (
											<div className="media-placeholder">
												<i className="bi bi-cup-straw" aria-hidden="true" />
											</div>
										)}
										{extraImages > 0 && (
											<span className="media-count">+{extraImages}</span>
										)}
									</div>

									<div className="meal-card-body">
										<h3 className="meal-card-title">
											<SnackForm initialSnack={snack} readOnly />
										</h3>

										{snack.calorie_tier ? (
											<span
												className={`cal-badge ${snack.calorie_tier}`}
												title="Calories per 100 g"
											>
												<i className="bi bi-fire" aria-hidden="true" />{" "}
												{snack.calories_per_100g} kcal/100g
											</span>
										) : (
											<span className="cal-badge muted">
												<i className="bi bi-fire" aria-hidden="true" /> No calorie data
											</span>
										)}

										<div className="meal-card-actions">
											<SnackForm initialSnack={snack} />
											<button
												type="button"
												className="btn btn-outline-danger"
												onClick={() => deleteSnack(snack.id)}
											>
												Delete
											</button>
										</div>
									</div>
								</article>
							</div>
						);
					})}
				</div>
			)}

			{fullScreenImage && (
				<button
					type="button"
					className="lightbox"
					onClick={() => setFullScreenImage(null)}
					aria-label="Close image"
				>
					<img src={fullScreenImage} alt="Full screen" />
				</button>
			)}
		</Fragment>
	);
};

export default ListSnacks;
