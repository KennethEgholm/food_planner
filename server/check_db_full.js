const sqlite3 = require("sqlite3").verbose();
const path = require("node:path");
const fs = require("node:fs");

// Assuming running from server/ directory
const dbPath = path.resolve(__dirname, "food_planner.db");
const outputPath = path.resolve(__dirname, "db_check_output.txt");

// Remove old file
if (fs.existsSync(outputPath)) {
	try {
		fs.unlinkSync(outputPath);
	} catch (_e) {}
}

const log = (msg) => {
	fs.appendFileSync(outputPath, `${msg}\n`);
};

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		log(`DB Connection Error: ${err.message}`);
	} else {
		log(`DB Connected: ${dbPath}`);
	}
});

db.serialize(() => {
	log("Starting Queries...");

	// 1. Check Meal Plans
	db.all("SELECT id, name FROM meal_plans", (err, rows) => {
		if (err) log(`Meal Plans Error: ${err.message}`);
		else log(`Meal Plans: ${JSON.stringify(rows)}`);
	});

	// 2. Check Meal Plan Days
	db.all("SELECT * FROM meal_plan_days", (err, rows) => {
		if (err) log(`Meal Plan Days Error: ${err.message}`);
		else log(`Meal Plan Days: ${JSON.stringify(rows)}`);
	});

	// 3. Check Meal Ingredients
	db.all("SELECT * FROM meal_ingredients LIMIT 10", (err, rows) => {
		if (err) log(`Meal Ingredients Error: ${err.message}`);
		else log(`Meal Ingredients (Limit 10): ${JSON.stringify(rows)}`);
	});

	// 4. Check Meal Plan Snacks
	db.all("SELECT * FROM meal_plan_snacks", (err, rows) => {
		if (err) {
			// If table doesn't exist, log it
			log(`Meal Plan Snacks Error: ${err.message}`);
		} else log(`Meal Plan Snacks: ${JSON.stringify(rows)}`);
	});
});

db.close();
