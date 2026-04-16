import express, { type Request, type Response } from "express";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/auth";

const router = express.Router();

// Get all settings (admin only)
router.get("/", requireAdmin, async (_req: Request, res: Response) => {
	try {
		const settings = await prisma.app_settings.findMany();
		res.json(settings);
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// Upsert a single setting by key (admin only)
router.put("/:key", requireAdmin, async (req: Request, res: Response) => {
	try {
		const key = req.params.key as string;
		const value = req.body.value as string;
		const setting = await prisma.app_settings.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
		res.json(setting);
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
