import axios from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import SnackForm from "./SnackForm";

interface Snack {
	id: number;
	name: string;
}

const ListSnacks: React.FC = () => {
	const [snacks, setSnacks] = useState<Snack[]>([]);

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
		getSnacks();
	}, [getSnacks]);

	return (
		<table className="table mt-5 text-center">
			<thead>
				<tr>
					<th>Snack Name</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{snacks.map((snack) => (
					<tr key={snack.id}>
						<td>
							<SnackForm initialSnack={snack} readOnly />
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
	);
};

export default ListSnacks;
