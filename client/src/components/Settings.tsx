import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";

interface SettingField {
	key: string;
	label: string;
	type?: "text" | "password" | "number";
	placeholder?: string;
}

const CALORIE_AI_FIELDS: SettingField[] = [
	{ key: "calorie_ai_base_url", label: "Base URL", type: "text", placeholder: "https://api.x.ai/v1" },
	{ key: "calorie_ai_model", label: "Model", type: "text", placeholder: "grok-3-mini" },
	{ key: "calorie_ai_api_key", label: "API Key", type: "password", placeholder: "Enter API key" },
];

const IMAGE_AI_FIELDS: SettingField[] = [
	{ key: "image_ai_base_url", label: "Base URL", type: "text", placeholder: "https://api.x.ai/v1" },
	{ key: "image_ai_model", label: "Model", type: "text", placeholder: "grok-imagine-image" },
	{ key: "image_ai_api_key", label: "API Key", type: "password", placeholder: "Enter API key" },
];

const THRESHOLD_FIELDS: SettingField[] = [
	{ key: "calorie_low_threshold", label: "Low Calorie Threshold", type: "number", placeholder: "200" },
	{ key: "calorie_high_threshold", label: "High Calorie Threshold", type: "number", placeholder: "300" },
];

const Settings: React.FC = () => {
	const [values, setValues] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [saved, setSaved] = useState<Record<string, boolean>>({});
	const [error, setError] = useState<string | null>(null);
	const [backfilling, setBackfilling] = useState(false);
	const [backfillResult, setBackfillResult] = useState<string | null>(null);

	useEffect(() => {
		axios
			.get("/api/settings")
			.then((res) => {
				const map: Record<string, string> = {};
				for (const row of res.data) {
					map[row.key] = row.value ?? "";
				}
				setValues(map);
			})
			.catch(() => setError("Failed to load settings."));
	}, []);

	const handleSave = async (key: string) => {
		setSaving((s) => ({ ...s, [key]: true }));
		try {
			await axios.put(`/api/settings/${key}`, { value: values[key] ?? "" });
			setSaved((s) => ({ ...s, [key]: true }));
			setTimeout(() => setSaved((s) => ({ ...s, [key]: false })), 2000);
		} catch {
			setError(`Failed to save ${key}.`);
		} finally {
			setSaving((s) => ({ ...s, [key]: false }));
		}
	};

	const handleBackfill = async () => {
		setBackfilling(true);
		setBackfillResult(null);
		try {
			const res = await axios.post("/api/ingredients/backfill-calories");
			const { queued } = res.data as { queued: number };
			if (queued === 0) {
				setBackfillResult("All ingredients already have calorie data.");
			} else {
				setBackfillResult(`Queued ${queued} ingredient${queued === 1 ? "" : "s"} for AI autofill. Check back in a moment.`);
			}
		} catch {
			setError("Failed to start calorie backfill.");
		} finally {
			setBackfilling(false);
		}
	};

	const renderField = (field: SettingField, suffix?: React.ReactNode) => (
		<div className="mb-3" key={field.key}>
			<label htmlFor={`setting-${field.key}`} className="form-label fw-semibold">
				{field.label}
			</label>
			<div className="input-group">
				<input
					id={`setting-${field.key}`}
					type={field.type ?? "text"}
					className="form-control"
					placeholder={field.placeholder}
					value={values[field.key] ?? ""}
					onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
				/>
				{suffix}
				<button
					type="button"
					className={`btn ${saved[field.key] ? "btn-success" : "btn-outline-secondary"}`}
					onClick={() => handleSave(field.key)}
					disabled={saving[field.key]}
				>
					{saved[field.key] ? "Saved" : saving[field.key] ? "Saving…" : "Save"}
				</button>
			</div>
		</div>
	);

	return (
		<div className="mt-5" style={{ maxWidth: "600px" }}>
			<h2 className="mb-4">Settings</h2>

			{error && (
				<div className="alert alert-danger alert-dismissible" role="alert">
					{error}
					<button type="button" className="btn-close" onClick={() => setError(null)} />
				</div>
			)}

			<h5 className="mb-1">Calorie AI</h5>
			<p className="text-muted small mb-3">Used for autofilling calorie data on ingredients.</p>
			{CALORIE_AI_FIELDS.map((f) => renderField(f))}

			<hr className="my-4" />

			<h5 className="mb-1">Image Generation AI</h5>
			<p className="text-muted small mb-3">Used for automatically generating meal and snack photos.</p>
			{IMAGE_AI_FIELDS.map((f) => renderField(f))}

			<hr className="my-4" />

			<h5 className="mb-1">Calorie Thresholds</h5>
			<p className="text-muted small mb-3">
				Meals and snacks below the low threshold show a green badge; above the high threshold show a red badge; in between show yellow.
			</p>
			{THRESHOLD_FIELDS.map((f) => renderField(f, <span className="input-group-text">kcal</span>))}

			<hr className="my-4" />

			<h5 className="mb-1">Calorie Data</h5>
			<p className="text-muted small mb-3">
				Automatically fill in missing calorie data for all ingredients using AI.
			</p>
			{backfillResult && (
				<div className="alert alert-info py-2">{backfillResult}</div>
			)}
			<button
				type="button"
				className="btn btn-outline-primary"
				onClick={handleBackfill}
				disabled={backfilling}
			>
				{backfilling ? "Starting…" : "Backfill missing calories via AI"}
			</button>
		</div>
	);
};

export default Settings;
