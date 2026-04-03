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
		const { key } = req.params;
		const { value } = req.body;
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

export default router;
