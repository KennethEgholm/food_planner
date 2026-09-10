import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "v1";
const DEV_FALLBACK_KEY =
	"6f1d8c2a4b7e9035af62c1d4e8b30f795ad2c6e19b4f7308c5d1a2e6f904b8c3";

// Read lazily so env.ts has loaded before first use.
function getKey(): Buffer {
	const raw = process.env.TOKEN_ENCRYPTION_KEY;
	if (!raw) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("Missing required env var: TOKEN_ENCRYPTION_KEY");
		}
		return Buffer.from(DEV_FALLBACK_KEY, "hex");
	}
	const key = /^[0-9a-f]{64}$/i.test(raw)
		? Buffer.from(raw, "hex")
		: Buffer.from(raw, "base64");
	if (key.length !== 32) {
		throw new Error(
			"TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64-encoded)",
		);
	}
	return key;
}

export function encryptSecret(plaintext: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return [
		PREFIX,
		iv.toString("base64"),
		tag.toString("base64"),
		encrypted.toString("base64"),
	].join(":");
}

/**
 * Decrypts a value produced by encryptSecret. Legacy plaintext values (stored
 * before encryption was introduced) are returned unchanged so existing
 * connections keep working until the next write.
 */
export function decryptSecret(payload: string): string {
	if (!payload.startsWith(`${PREFIX}:`)) return payload;

	const [, ivB64, tagB64, dataB64] = payload.split(":");
	try {
		const decipher = createDecipheriv(
			"aes-256-gcm",
			getKey(),
			Buffer.from(ivB64, "base64"),
		);
		decipher.setAuthTag(Buffer.from(tagB64, "base64"));
		const decrypted = Buffer.concat([
			decipher.update(Buffer.from(dataB64, "base64")),
			decipher.final(),
		]);
		return decrypted.toString("utf8");
	} catch {
		throw new Error("Failed to decrypt stored secret");
	}
}
