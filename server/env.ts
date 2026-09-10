import path from "node:path";
import dotenv from "dotenv";

// Must be the first import in index.ts so every module sees the environment
// at load time (previously dotenv ran after imports, so middleware-level reads
// happened too early).
dotenv.config({
	path: [
		path.resolve(__dirname, "../.env"),
		path.resolve(__dirname, ".env"),
	],
	quiet: true,
});
