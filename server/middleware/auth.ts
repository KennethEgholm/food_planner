import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../db";

// ─── Type augmentation ────────────────────────────────────────────────────────

declare global {
	namespace Express {
		interface Request {
			user?: { email: string; role: string };
		}
	}
}

/** Use this type for route handlers that sit behind verifyCloudflareJWT. */
export type AuthenticatedRequest = Request & {
	user: { email: string; role: string };
};

/**
 * Extracts req.user with a non-optional type. Throws if auth middleware did not run.
 * Use inside any route handler that sits behind verifyCloudflareJWT.
 */
export function getUser(req: Request): { email: string; role: string } {
	if (!req.user) throw new Error("getUser called on unauthenticated request");
	return req.user;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CF_TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN;
const CF_AUD = process.env.CF_AUD;
const BOOTSTRAP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL;
const isDev = process.env.NODE_ENV !== "production";

// ─── Middleware: verify Cloudflare Access JWT ─────────────────────────────────

/**
 * Verifies the Cloudflare Access JWT on every request.
 * In development (NODE_ENV !== "production") the check is bypassed and
 * BOOTSTRAP_ADMIN_EMAIL is used as the current user.
 */
export const verifyCloudflareJWT = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	// ── Development bypass ──────────────────────────────────────────────────
	if (isDev) {
		const devEmail = BOOTSTRAP_ADMIN_EMAIL || "dev@localhost";
		const user = await prisma.users.upsert({
			where: { email: devEmail },
			update: {},
			create: { email: devEmail, role: "ADMIN" },
		});
		req.user = { email: user.email, role: user.role };
		return next();
	}

	// ── Production: verify CF JWT ───────────────────────────────────────────
	if (!CF_TEAM_DOMAIN || !CF_AUD) {
		console.error(
			"Missing CF_TEAM_DOMAIN or CF_AUD environment variables. Cannot verify Cloudflare JWT.",
		);
		res.status(500).json({ error: "Server misconfiguration: auth not set up" });
		return;
	}

	const token = req.headers["cf-access-jwt-assertion"] as string | undefined;
	if (!token) {
		res
			.status(401)
			.json({ error: "Unauthorized: Missing CF-Access-Jwt-Assertion header" });
		return;
	}

	try {
		const JWKS = createRemoteJWKSet(
			new URL(`https://${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`),
		);

		const { payload } = await jwtVerify(token, JWKS, {
			audience: CF_AUD,
		});

		const email = payload.email as string | undefined;
		if (!email) {
			res.status(401).json({ error: "Unauthorized: No email claim in token" });
			return;
		}

		// Look up user; on first seen, create with default USER role
		// unless the email matches the bootstrap admin.
		const role = email === BOOTSTRAP_ADMIN_EMAIL ? "ADMIN" : "USER";
		const user = await prisma.users.upsert({
			where: { email },
			update: {},
			create: { email, role },
		}).catch(async () => {
			// Prisma upsert can still hit a unique constraint under high concurrency.
			// Fall back to a plain lookup for the user created by the winning request.
			return prisma.users.findUniqueOrThrow({ where: { email } });
		});

		req.user = { email: user.email, role: user.role };
		next();
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("JWT verification failed:", message);
		res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
	}
};

// ─── Middleware: require admin role ───────────────────────────────────────────

/**
 * Requires req.user.role === "ADMIN". Must be used after verifyCloudflareJWT.
 * Returns 403 for authenticated non-admin users.
 */
export const requireAdmin = (
	req: Request,
	res: Response,
	next: NextFunction,
): void => {
	if (!req.user || req.user.role !== "ADMIN") {
		res.status(403).json({ error: "Forbidden: Admin access required" });
		return;
	}
	next();
};
