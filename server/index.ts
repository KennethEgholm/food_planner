import "./env";
import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { verifyCloudflareJWT } from "./middleware/auth";
import authRoutes from "./routes/auth";
import ingredientRoutes from "./routes/ingredients";
import mealPlanRoutes from "./routes/mealPlans";
import mealRoutes from "./routes/meals";
import settingsRoutes from "./routes/settings";
import snackRoutes from "./routes/snacks";

const app: Express = express();
const PORT = process.env.SERVER_PORT;
if (!PORT) throw new Error("Missing required env var: SERVER_PORT");

app.set("trust proxy", 1);

// Cross-origin access is denied unless explicitly allowlisted (the client is
// served same-origin via Vite proxy / nginx, so CORS is normally unnecessary).
const corsOrigin = process.env.CORS_ORIGIN;
if (corsOrigin) {
	app.use(
		cors({
			origin: corsOrigin.split(",").map((origin) => origin.trim()),
		}),
	);
}

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 1000,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: { error: "Too many requests, please try again later." },
	}),
);

// Google OAuth callback is exempt from CF JWT auth — secured by Google's one-time
// code + signed state instead. Skip JWT verification for that path only.
app.use((req, res, next) => {
	if (req.path === "/auth/google/callback") return next();
	return verifyCloudflareJWT(req, res, next);
});

// Uploaded files are private: this sits behind the auth middleware above.
app.use(
	"/uploads",
	express.static(path.join(process.cwd(), "uploads"), {
		setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
	}),
);

app.get("/", (_req: Request, res: Response) => {
	res.send("Food Planner API is running");
});

// Routes
app.use("/ingredients", ingredientRoutes);
app.use("/meals", mealRoutes);
app.use("/meal-plans", mealPlanRoutes);
app.use("/snacks", snackRoutes);
app.use("/settings", settingsRoutes);
app.use("/auth/google", authRoutes);

// Global error handler — never leak internal error details on 5xx.
app.use((err: any, _req: Request, res: Response, _next: any) => {
	console.error(err.stack ?? err);
	const status = err?.status ?? (err?.name === "MulterError" ? 400 : 500);
	const message =
		status >= 500 ? "Something went wrong!" : err.message || "Bad request";
	res.status(status).json({ error: message });
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
