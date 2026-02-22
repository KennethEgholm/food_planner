const sqlite3 = require("sqlite3").verbose();
const path = require("node:path");
const fs = require("node:fs");

const dbPath = path.resolve(__dirname, "server/food_planner.db");
const db = new sqlite3.Database(dbPath);
const outputPath = path.resolve(__dirname, "db_check_output.txt");

const log = (msg) => {
	fs.appendFileSync(outputPath, `${msg}\n`);
};

// Clear previous output
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

db.serialize(() => {
	db.all("SELECT count(*) as count FROM meals", (err, rows) => {
		if (err) log(`Meals Count Error: ${err}`);
		else log(`Meals Count: ${rows[0].count}`);
	});
	db.all("SELECT count(*) as count FROM meal_ingredients", (err, rows) => {
		if (err) log(`Meal Ingredients Count Error: ${err}`);
		else log(`Meal Ingredients Count: ${rows[0].count}`);
	});
	db.all("SELECT count(*) as count FROM meal_plans", (err, rows) => {
		if (err) log(`Meal Plans Count Error: ${err}`);
		else log(`Meal Plans Count: ${rows[0].count}`);
	});
	db.all("SELECT count(*) as count FROM meal_plan_days", (err, rows) => {
		if (err) log(`Meal Plan Days Count Error: ${err}`);
		else log(`Meal Plan Days Count: ${rows[0].count}`);
	});
	db.all("SELECT count(*) as count FROM meal_plan_snacks", (err, rows) => {
		if (err) log(`Meal Plan Snacks Count Error: ${err}`);
		else log(`Meal Plan Snacks Count: ${rows[0].count}`);
	});
	// Check specific meal plan linkage
	db.all("SELECT * FROM meal_plan_days LIMIT 5", (err, rows) => {
		if (err) log(`Meal Plan Days Sample Error: ${err}`);
		else log(`Meal Plan Days Sample: ${JSON.stringify(rows)}`);
	});

	// Check ingredients attached to a meal
	db.all("SELECT * FROM meal_ingredients LIMIT 5", (err, rows) => {
		if (err) log(`Meal Ingredients Sample Error: ${err}`);
		else log(`Meal Ingredients Sample: ${JSON.stringify(rows)}`);
	});
});

db.close();
