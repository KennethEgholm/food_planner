import express, { type Request, type Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

const SECRET_KEY_PATTERN = /(_api_key|_tokens?|_secret|password)$/i;
const isSecretKey = (key: string) => SECRET_KEY_PATTERN.test(key);
const hasStoredValue = (value: string | null | undefined) =>
	value != null && value !== "";

function publicSetting(setting: { key: string; value: string | null }) {
	const secret = isSecretKey(setting.key);
	return {
		key: setting.key,
		value: secret ? null : setting.value,
		has_value: hasStoredValue(setting.value),
	};
}

// Get all settings (admin only). Secret values are never returned — only a
// has_value flag so the UI can show that a key is configured.
router.get("/", requireAdmin, async (_req: Request, res: Response) => {
	try {
		const settings = await prisma.app_settings.findMany();
		res.json(settings.map(publicSetting));
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Upsert a single setting by key (admin only)
router.put("/:key", requireAdmin, async (req: Request, res: Response) => {
	try {
		const key = req.params.key as string;
		const value = req.body.value;

		if (typeof value !== "string") {
			return res.status(400).json({ error: "value must be a string" });
		}

		// A blank secret means "leave the stored key unchanged" — never wipe it.
		if (isSecretKey(key) && value === "") {
			const existing = await prisma.app_settings.findUnique({ where: { key } });
			if (existing) {
				return res.json(publicSetting(existing));
			}
		}

		const setting = await prisma.app_settings.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
		res.json(publicSetting(setting));
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Get recent logs
router.get("/logs", requireAdmin, async (_req: Request, res: Response) => {
	try {
		const logs = await prisma.app_logs.findMany({
			orderBy: { created_at: "desc" },
			take: 100,
		});
		res.json(logs);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Clear all logs
router.delete("/logs", requireAdmin, async (_req: Request, res: Response) => {
	try {
		await prisma.app_logs.deleteMany();
		res.json("Logs cleared");
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

export default router;
