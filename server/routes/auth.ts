import { type Request, type Response, Router } from "express";
import { google } from "googleapis";
import { prisma } from "../db";
import { getUser } from "../middleware/auth";
import { appLog } from "../utils/appLog";

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

		// In production use the public frontend URL; in dev fall back to localhost.
		const API_URL = process.env.API_URL;
		const clientPort = process.env.CLIENT_PORT;
		const frontendBase = API_URL
			? API_URL.replace(/\/api\/?$/, "")
			: `http://localhost:${clientPort}`;
		if (!API_URL && !clientPort)
			throw new Error("Missing required env var: CLIENT_PORT");
		res.redirect(`${frontendBase}${returnPath}`);
	} catch (err: any) {
		appLog("error", "google-oauth", `Token exchange failed: ${err.message}`);
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

// --- Helper: detect Google "the refresh token is dead" errors ---
export const isGoogleAuthError = (err: any): boolean => {
	if (!err) return false;
	const msg = String(err?.message ?? "");
	const dataError = err?.response?.data?.error ?? err?.data?.error;
	const status = err?.response?.status ?? err?.status ?? err?.code;
	const indicators = [
		"invalid_grant",
		"invalid_token",
		"Invalid Credentials",
		"Token has been expired",
		"unauthorized_client",
		"deleted_client",
		"No Google tokens",
		"No refresh token",
	];
	if (indicators.some((s) => msg.includes(s))) return true;
	if (typeof dataError === "string" && indicators.some((s) => dataError.includes(s)))
		return true;
	if (status === 401) return true;
	return false;
};

// --- Helper: drop stored Google tokens for a user (e.g. after invalid_grant) ---
export const clearGoogleTokens = async (userEmail: string) => {
	try {
		await prisma.user_google_tokens.delete({ where: { user_email: userEmail } });
	} catch {
		// nothing to clear
	}
};

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
	if (!tokens.refresh_token) {
		// Without a refresh token we cannot survive access-token expiry.
		// Force a fresh consent flow.
		await clearGoogleTokens(userEmail);
		throw new Error(
			`No refresh token stored for user: ${userEmail}. Please reconnect.`,
		);
	}

	const oauth2Client = getOAuthClient();
	oauth2Client.setCredentials(tokens);

	// When the library auto-refreshes the access token, save the new tokens to DB.
	// Google does NOT return a new refresh_token on refresh, so preserve the original.
	oauth2Client.on("tokens", async (newTokens) => {
		try {
			const merged = {
				...tokens,
				...newTokens,
				refresh_token: newTokens.refresh_token || tokens.refresh_token,
			};
			await prisma.user_google_tokens.update({
				where: { user_email: userEmail },
				data: { tokens: JSON.stringify(merged) },
			});
		} catch (err: any) {
			appLog("error", "google-oauth", `Token refresh save failed: ${err.message ?? err}`);
		}
	});

	return oauth2Client;
};

// 4. Disconnect — let the user clear stored tokens explicitly
router.delete("/disconnect", async (req: Request, res: Response) => {
	try {
		await clearGoogleTokens(getUser(req).email);
		res.json({ disconnected: true });
	} catch (err: any) {
		appLog("error", "google-oauth", `Disconnect failed: ${err.message ?? err}`);
		res.status(500).send("Server Error");
	}
});

export default router;
