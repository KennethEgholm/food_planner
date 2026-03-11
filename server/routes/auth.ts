import { type Request, type Response, Router } from "express";
import { google } from "googleapis";
import { prisma } from "../db";
import { getUser } from "../middleware/auth";

const router = Router();

function getOAuthClient() {
	const CLIENT_ID = process.env.GOOGLE_TASK_CLIENT_ID;
	const CLIENT_SECRET = process.env.GOOGLE_TASK_CLIENT_SECRET;
	const API_URL = process.env.API_URL;
	const SERVER_PORT = process.env.SERVER_PORT;

	if (!CLIENT_ID)
		throw new Error("Missing required env var: GOOGLE_TASK_CLIENT_ID");
	if (!CLIENT_SECRET)
		throw new Error("Missing required env var: GOOGLE_TASK_CLIENT_SECRET");
	if (!API_URL && !SERVER_PORT)
		throw new Error("Missing required env var: API_URL (or SERVER_PORT)");

	const BASE_URL = (API_URL || `http://localhost:${SERVER_PORT}`).replace(
		/\/$/,
		"",
	);
	// API_URL already contains the /api prefix (e.g. https://food.clouddev.com/api),
	// so the callback path is always relative to the API base.
	const REDIRECT_URI = `${BASE_URL}/auth/google/callback`;
	console.log(`[OAuth] Redirect URI: ${REDIRECT_URI}`);

	return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// 1. Generate Auth URL — embed requesting user's email and return path in state
router.get("/url", (req: Request, res: Response) => {
	const oauth2Client = getOAuthClient();
	const scopes = ["https://www.googleapis.com/auth/tasks"];

	const returnPath = (req.query.returnPath as string) || "/plans";
	const state = Buffer.from(
		JSON.stringify({ email: getUser(req).email, returnPath }),
	).toString("base64");

	const url = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: scopes,
		prompt: "consent",
		state,
	});

	res.json({ url });
});

// 2. OAuth Callback — decode user email from state and save tokens per user
router.get("/callback", async (req: Request, res: Response) => {
	const { code, state } = req.query;

	if (!code || typeof code !== "string") {
		return res.status(400).send("Invalid request: No code provided");
	}
	if (!state || typeof state !== "string") {
		return res.status(400).send("Invalid request: No state provided");
	}

	let userEmail: string;
	let returnPath = "/plans";
	try {
		const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
		userEmail = parsed.email;
		returnPath = parsed.returnPath || "/plans";
	} catch {
		return res.status(400).send("Invalid state parameter");
	}

	try {
		const oauth2Client = getOAuthClient();
		console.log("Exchanging code for tokens...");
		const { tokens } = await oauth2Client.getToken(code);

		const tokensString = JSON.stringify(tokens);

		await prisma.user_google_tokens.upsert({
			where: { user_email: userEmail },
			update: { tokens: tokensString },
			create: { user_email: userEmail, tokens: tokensString },
		});

		console.log(`Tokens saved for user: ${userEmail}`);

		const clientPort = process.env.CLIENT_PORT;
		if (!clientPort) throw new Error("Missing required env var: CLIENT_PORT");
		res.redirect(`http://localhost:${clientPort}${returnPath}`);
	} catch (err: any) {
		console.error("Error retrieving access token:", err.message);
		res.status(500).send("Authentication failed");
	}
});

// 3. Check Status — check connection for the requesting user
router.get("/status", async (req: Request, res: Response) => {
	try {
		const result = await prisma.user_google_tokens.findUnique({
			where: { user_email: getUser(req).email },
		});
		res.json({ connected: !!result?.tokens });
	} catch (err: any) {
		console.error(err.message);
		res.status(500).send("Server Error");
	}
});

// --- Helper to get authenticated client for a specific user ---
export const getAuthenticatedClient = async (userEmail: string) => {
	const result = await prisma.user_google_tokens.findUnique({
		where: { user_email: userEmail },
	});

	if (!result?.tokens) {
		throw new Error(
			`No Google tokens found for user: ${userEmail}. Authenticate first.`,
		);
	}

	const tokens = JSON.parse(result.tokens);
	const oauth2Client = getOAuthClient();
	oauth2Client.setCredentials(tokens);
	return oauth2Client;
};

export default router;
