import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Express, type Request, type Response } from "express";
import { verifyCloudflareJWT } from "./middleware/auth";
import authRoutes from "./routes/auth";
import ingredientRoutes from "./routes/ingredients";
import mealPlanRoutes from "./routes/mealPlans";
import mealRoutes from "./routes/meals";
import settingsRoutes from "./routes/settings";
import snackRoutes from "./routes/snacks";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app: Express = express();
const PORT = process.env.SERVER_PORT;
if (!PORT) throw new Error("Missing required env var: SERVER_PORT");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Google OAuth callback is exempt from CF JWT auth — secured by Google's one-time
// code + signed state instead. Skip JWT verification for that path only.
app.use((req, res, next) => {
	if (req.path === "/auth/google/callback") return next();
	return verifyCloudflareJWT(req, res, next);
});

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

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
	console.error(err.stack);
	res.status(500).json({ error: err.message || "Something went wrong!" });
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
