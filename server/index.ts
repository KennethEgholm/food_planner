import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Express, type Request, type Response } from "express";
import authRoutes from "./routes/auth";
import ingredientRoutes from "./routes/ingredients";
import mealPlanRoutes from "./routes/mealPlans";
import mealRoutes from "./routes/meals";
import snackRoutes from "./routes/snacks";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app: Express = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
	res.send("Food Planner API is running");
});

// Routes
app.use("/ingredients", ingredientRoutes);
app.use("/meals", mealRoutes);
app.use("/meal-plans", mealPlanRoutes);
app.use("/snacks", snackRoutes);
app.use("/auth/google", authRoutes);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
