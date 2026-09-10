import axios from "axios";
import type React from "react";
import { useEffect, useState } from "react";
import { THEMES, useTheme } from "../theme";

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
	const { theme, setTheme } = useTheme();
	const [values, setValues] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [saved, setSaved] = useState<Record<string, boolean>>({});
	const [error, setError] = useState<string | null>(null);
	const [backfilling, setBackfilling] = useState(false);
	const [backfillResult, setBackfillResult] = useState<string | null>(null);
	const [backfillingImages, setBackfillingImages] = useState(false);
	const [backfillImagesResult, setBackfillImagesResult] = useState<string | null>(null);
	const [calorieAiOpen, setCalorieAiOpen] = useState(false);
	const [imageAiOpen, setImageAiOpen] = useState(false);
	const [mealPlanAiOpen, setMealPlanAiOpen] = useState(false);
	const [savingPreference, setSavingPreference] = useState(false);
	const [savedPreference, setSavedPreference] = useState(false);
	const [logsOpen, setLogsOpen] = useState(false);
	const [logs, setLogs] = useState<{ id: number; level: string; source: string; message: string; created_at: string }[]>([]);
	const [logsLoading, setLogsLoading] = useState(false);
	const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
	const [googleBusy, setGoogleBusy] = useState(false);

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

	useEffect(() => {
		axios
			.get("/api/auth/google/status")
			.then((res) => setGoogleConnected(res.data.connected))
			.catch(() => setGoogleConnected(null));
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

	const handleBackfillImages = async () => {
		setBackfillingImages(true);
		setBackfillImagesResult(null);
		try {
			const [mealsRes, snacksRes] = await Promise.all([
				axios.post("/api/meals/backfill-images"),
				axios.post("/api/snacks/backfill-images"),
			]);
			const meals = (mealsRes.data as { queued: number }).queued;
			const snacks = (snacksRes.data as { queued: number }).queued;
			const total = meals + snacks;
			if (total === 0) {
				setBackfillImagesResult("All meals and snacks already have images.");
			} else {
				setBackfillImagesResult(
					`Queued ${meals} meal${meals === 1 ? "" : "s"} and ${snacks} snack${snacks === 1 ? "" : "s"} for image generation. This may take a while.`,
				);
			}
		} catch {
			setError("Failed to start image backfill.");
		} finally {
			setBackfillingImages(false);
		}
	};

	const handleSavePreference = async () => {
		setSavingPreference(true);
		try {
			await axios.put("/api/settings/meal_plan_preference", { value: values.meal_plan_preference ?? "" });
			setSavedPreference(true);
			setTimeout(() => setSavedPreference(false), 2000);
		} catch {
			setError("Failed to save meal plan preference.");
		} finally {
			setSavingPreference(false);
		}
	};

	const fetchLogs = async () => {
		setLogsLoading(true);
		try {
			const res = await axios.get("/api/settings/logs");
			setLogs(res.data);
		} catch {
			setError("Failed to load logs.");
		} finally {
			setLogsLoading(false);
		}
	};

	const clearLogs = async () => {
		try {
			await axios.delete("/api/settings/logs");
			setLogs([]);
		} catch {
			setError("Failed to clear logs.");
		}
	};

	const handleToggleLogs = () => {
		const willOpen = !logsOpen;
		setLogsOpen(willOpen);
		if (willOpen) fetchLogs();
	};

	const connectGoogle = async () => {
		setGoogleBusy(true);
		try {
			const res = await axios.get("/api/auth/google/url", {
				params: { returnPath: "/settings" },
			});
			window.location.href = res.data.url;
		} catch {
			setError("Failed to start Google connection.");
			setGoogleBusy(false);
		}
	};

	const disconnectGoogle = async () => {
		setGoogleBusy(true);
		try {
			await axios.delete("/api/auth/google/disconnect");
			setGoogleConnected(false);
		} catch {
			setError("Failed to disconnect Google.");
		} finally {
			setGoogleBusy(false);
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

			<h5 className="mb-1">Appearance</h5>
			<p className="text-muted small mb-3">
				Pick the look that suits your kitchen. This is saved in your browser.
			</p>
			<div className="row g-2 mb-4">
				{THEMES.map((t) => (
					<div className="col-12 col-sm-4" key={t.id}>
						<button
							type="button"
							className={`theme-option ${theme === t.id ? "selected" : ""}`}
							onClick={() => setTheme(t.id)}
							aria-pressed={theme === t.id}
						>
							<span className={`theme-swatch theme-swatch-${t.id}`}>
								<span />
								<span />
								<span />
							</span>
							<span className="theme-option-label">{t.label}</span>
							<span className="theme-option-desc">{t.description}</span>
							{theme === t.id && (
								<i
									className="bi bi-check-circle-fill theme-check"
									aria-hidden="true"
								/>
							)}
						</button>
					</div>
				))}
			</div>

			<hr className="my-4" />

			<button
				type="button"
				className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1 mb-1"
				onClick={() => setCalorieAiOpen((o) => !o)}
				aria-expanded={calorieAiOpen}
			>
				<h5 className="mb-0">Calorie AI</h5>
				<span>{calorieAiOpen ? "▲" : "▼"}</span>
			</button>
			<p className="text-muted small mb-3">Used for autofilling calorie data on ingredients.</p>
			{calorieAiOpen && CALORIE_AI_FIELDS.map((f) => renderField(f))}

			<hr className="my-4" />

			<button
				type="button"
				className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1 mb-1"
				onClick={() => setImageAiOpen((o) => !o)}
				aria-expanded={imageAiOpen}
			>
				<h5 className="mb-0">Image Generation AI</h5>
				<span>{imageAiOpen ? "▲" : "▼"}</span>
			</button>
			<p className="text-muted small mb-3">Used for automatically generating meal and snack photos.</p>
			{imageAiOpen && IMAGE_AI_FIELDS.map((f) => renderField(f))}

			<hr className="my-4" />

			<button
				type="button"
				className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1 mb-1"
				onClick={() => setMealPlanAiOpen((o) => !o)}
				aria-expanded={mealPlanAiOpen}
			>
				<h5 className="mb-0">Meal Plan AI</h5>
				<span>{mealPlanAiOpen ? "▲" : "▼"}</span>
			</button>
			<p className="text-muted small mb-3">
				Preferences sent to the AI when generating a meal plan (e.g. "prefer fish on Fridays, hearty meals in winter").
			</p>
			{mealPlanAiOpen && (
				<div className="mb-3">
					<label htmlFor="setting-meal_plan_preference" className="form-label fw-semibold">
						Preference
					</label>
					<textarea
						id="setting-meal_plan_preference"
						className="form-control mb-2"
						rows={4}
						placeholder="e.g. prefer fish on Fridays, light meals in summer, heavy protein on Mondays"
						value={values.meal_plan_preference ?? ""}
						onChange={(e) => setValues((v) => ({ ...v, meal_plan_preference: e.target.value }))}
					/>
					<button
						type="button"
						className={`btn ${savedPreference ? "btn-success" : "btn-outline-secondary"}`}
						onClick={handleSavePreference}
						disabled={savingPreference}
					>
						{savedPreference ? "Saved" : savingPreference ? "Saving…" : "Save"}
					</button>
				</div>
			)}

			<hr className="my-4" />

			<h5 className="mb-1">Calorie Thresholds</h5>
			<p className="text-muted small mb-3">
				Meals and snacks below the low threshold show a green badge; above the high threshold show a red badge; in between show yellow.
			</p>
			{THRESHOLD_FIELDS.map((f) => renderField(f, <span className="input-group-text">kcal</span>))}

			<hr className="my-4" />

			<h5 className="mb-1">AI Backfill</h5>
			<p className="text-muted small mb-3">
				Automatically fill in missing data for existing records using AI.
			</p>

			<p className="mb-1 fw-semibold small">Ingredient calories</p>
			{backfillResult && (
				<div className="alert alert-info py-2 mb-2">{backfillResult}</div>
			)}
			<button
				type="button"
				className="btn btn-outline-primary mb-4"
				onClick={handleBackfill}
				disabled={backfilling}
			>
				{backfilling ? "Starting…" : "Backfill missing calories via AI"}
			</button>

			<p className="mb-1 fw-semibold small">Meal &amp; snack images</p>
			{backfillImagesResult && (
				<div className="alert alert-info py-2 mb-2">{backfillImagesResult}</div>
			)}
			<button
				type="button"
				className="btn btn-outline-primary"
				onClick={handleBackfillImages}
				disabled={backfillingImages}
			>
				{backfillingImages ? "Starting…" : "Backfill missing images via AI"}
			</button>

			<hr className="my-4" />

			<h5 className="mb-1">Google Tasks</h5>
			<p className="text-muted small mb-3">
				Connect your Google account to export shopping lists to Google Tasks.
			</p>
			{googleConnected === null ? (
				<p className="text-muted mb-0">Checking connection…</p>
			) : googleConnected ? (
				<div className="d-flex align-items-center gap-2">
					<span className="badge bg-success">Connected</span>
					<button
						type="button"
						className="btn btn-outline-secondary btn-sm"
						onClick={disconnectGoogle}
						disabled={googleBusy}
					>
						{googleBusy ? "Disconnecting…" : "Disconnect"}
					</button>
				</div>
			) : (
				<div className="d-flex align-items-center gap-2">
					<span className="badge bg-secondary">Not connected</span>
					<button
						type="button"
						className="btn btn-outline-primary btn-sm"
						onClick={connectGoogle}
						disabled={googleBusy}
					>
						{googleBusy ? "Redirecting…" : "Connect Google Tasks"}
					</button>
				</div>
			)}

			<hr className="my-4" />

			<button
				type="button"
				className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1 mb-1"
				onClick={handleToggleLogs}
				aria-expanded={logsOpen}
			>
				<h5 className="mb-0">Logs</h5>
				<span>{logsOpen ? "▲" : "▼"}</span>
			</button>
			<p className="text-muted small mb-3">Recent application logs (image generation errors, etc.).</p>
			{logsOpen && (
				<div>
					<div className="d-flex gap-2 mb-3">
						<button type="button" className="btn btn-outline-secondary btn-sm" onClick={fetchLogs} disabled={logsLoading}>
							{logsLoading ? "Loading…" : "Refresh"}
						</button>
						{logs.length > 0 && (
							<button type="button" className="btn btn-outline-danger btn-sm" onClick={clearLogs}>
								Clear Logs
							</button>
						)}
					</div>
					{logs.length === 0 ? (
						<p className="text-muted">No logs.</p>
					) : (
						<div className="table-responsive">
							<table className="table table-sm table-striped" style={{ fontSize: "0.85em" }}>
								<thead>
									<tr>
										<th style={{ width: "150px" }}>Time</th>
										<th style={{ width: "100px" }}>Source</th>
										<th>Message</th>
									</tr>
								</thead>
								<tbody>
									{logs.map((log) => (
										<tr key={log.id}>
											<td className="text-muted">{new Date(log.created_at).toLocaleString()}</td>
											<td><span className={`badge ${log.level === "error" ? "bg-danger" : log.level === "warn" ? "bg-warning text-dark" : "bg-info"}`}>{log.source}</span></td>
											<td style={{ wordBreak: "break-word" }}>{log.message}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default Settings;
