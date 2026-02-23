import { type Request, type Response, Router } from "express";
import { google } from "googleapis";
import { prisma } from "../db";

const router = Router();

const CLIENT_ID = process.env.GOOGLE_TASK_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_TASK_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${process.env.SERVER_PORT || 5001}/auth/google/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
	console.error(
		"Missing Google OAuth credentials. Please check .env file for GOOGLE_TASK_CLIENT_ID and GOOGLE_TASK_CLIENT_SECRET",
	);
}

const oauth2Client = new google.auth.OAuth2(
	CLIENT_ID,
	CLIENT_SECRET,
	REDIRECT_URI,
);

// 1. Generate Auth URL
router.get("/url", (_req: Request, res: Response) => {
	const scopes = ["https://www.googleapis.com/auth/tasks"];

	const url = oauth2Client.generateAuthUrl({
		access_type: "offline", // "offline" to get a refresh token
		scope: scopes,
		prompt: "consent", // Force consent to ensure refresh token is returned
	});

	res.json({ url });
});

// 2. OAuth Callback
router.get("/callback", async (req: Request, res: Response) => {
	const { code } = req.query;

	if (!code || typeof code !== "string") {
		return res.status(400).send("Invalid request: No code provided");
	}

	try {
		console.log("Exchanging code for tokens...");
		const { tokens } = await oauth2Client.getToken(code);

		// Save tokens to DB
		// We'll store them as a JSON string in our key-value store
		const tokensString = JSON.stringify(tokens);

		await prisma.app_settings.upsert({
			where: { key: "google_tokens" },
			update: { value: tokensString },
			create: { key: "google_tokens", value: tokensString },
		});

		console.log("Tokens saved successfully.");

		// Redirect back to frontend
		const frontendPort = process.env.CLIENT_PORT || 5173;
		res.redirect(`http://localhost:${frontendPort}`);
	} catch (err: any) {
		console.error("Error retrieving access token:", err.message);
		res.status(500).send("Authentication failed");
	}
});

// 3. Check Status (Are we connected?)
router.get("/status", async (_req: Request, res: Response) => {
	try {
		const result = await prisma.app_settings.findUnique({
			where: { key: "google_tokens" },
		});
		if (result?.value) {
			res.json({ connected: true });
		} else {
			res.json({ connected: false });
		}
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// --- Helper to get authenticated client for other internal modules ---
export const getAuthenticatedClient = async () => {
	// Retrieve tokens from DB
	const result = await prisma.app_settings.findUnique({
		where: { key: "google_tokens" },
	});

	if (!result || !result.value) {
		throw new Error("No tokens found. Authenticate first.");
	}

	const tokens = JSON.parse(result.value);
	oauth2Client.setCredentials(tokens);
	return oauth2Client;
};

export default router;
