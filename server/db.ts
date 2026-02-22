import path from "node:path";
import sqlite3 from "sqlite3";

const sqlite = sqlite3.verbose();
const dbPath = path.resolve(__dirname, "food_planner.db");

const db = new sqlite.Database(dbPath, (err) => {
	if (err) {
		console.error(`Error opening database: ${err.message}`);
	} else {
		console.log("Connected to the SQLite database.");
		/* Initialize tables */
		db.serialize(() => {
			// Ingredients Table
			db.run(
				`CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            unit TEXT
        )`,
				(err) => {
					if (err) {
						console.error("Error creating ingredients table", err);
					} else {
						// Check if unit column exists (migration for existing db)
						db.all("PRAGMA table_info(ingredients)", (err, rows) => {
							if (err) {
								console.error("Error checking table schema", err);
								return;
							}
							const hasUnit = rows.some((row: any) => row.name === "unit");
							if (!hasUnit) {
								console.log(
									"Adding missing column 'unit' to ingredients table",
								);
								db.run(
									"ALTER TABLE ingredients ADD COLUMN unit TEXT",
									(err) => {
										if (err) console.error("Error adding column unit", err);
									},
								);
							}
						});
					}
				},
			);

			// Meals Table
			db.run(
				`CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            suitable_for_weekend INTEGER DEFAULT 0
        )`,
				(err) => {
					if (err) console.error("Error creating meals table", err);
				},
			);

			// Meal Ingredients Join Table
			db.run(
				`CREATE TABLE IF NOT EXISTS meal_ingredients (
            meal_id INTEGER,
            ingredient_id INTEGER,
            quantity REAL,
            PRIMARY KEY (meal_id, ingredient_id),
            FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
        )`,
				(err) => {
					if (err) console.error("Error creating meal_ingredients table", err);
				},
			);

			// Meal Plans Table
			db.run(
				`CREATE TABLE IF NOT EXISTS meal_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`,
				(err) => {
					if (err) console.error("Error creating meal_plans table", err);
				},
			);

			// Meal Plan Days Table (Templates)
			db.run(
				`CREATE TABLE IF NOT EXISTS meal_plan_days (
            meal_plan_id INTEGER,
            day TEXT NOT NULL,
            meal_id INTEGER,
            PRIMARY KEY (meal_plan_id, day),
            FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
            FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
        )`,
				(err) => {
					if (err) console.error("Error creating meal_plan_days table", err);
				},
			);

			// Snacks Table
			db.run(
				`CREATE TABLE IF NOT EXISTS snacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`,
				(err) => {
					if (err) console.error("Error creating snacks table", err);
				},
			);

			// Snack Ingredients Join Table
			db.run(
				`CREATE TABLE IF NOT EXISTS snack_ingredients (
            snack_id INTEGER,
            ingredient_id INTEGER,
            quantity REAL,
            PRIMARY KEY (snack_id, ingredient_id),
            FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE,
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
        )`,
				(err) => {
					if (err) console.error("Error creating snack_ingredients table", err);
				},
			);

			// Meal Plan Snacks Table
			db.run(
				`CREATE TABLE IF NOT EXISTS meal_plan_snacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meal_plan_id INTEGER,
            snack_id INTEGER,
            FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
            FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
        )`,
				(err) => {
					if (err) console.error("Error creating meal_plan_snacks table", err);
				},
			);

			// App Settings Table (Key-Value Store for Auth Tokens etc.)
			db.run(
				`CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`,
				(err) => {
					if (err) console.error("Error creating app_settings table", err);
				},
			);
		});
	}
});

// A simple query wrapper to mimic pg.Pool.query interface
export const query = (
	text: string,
	params: any[] = [],
): Promise<{ rows: any[] }> => {
	// 1. Identify all postgres-style parameters ($1, $2, etc.) in order
	const matches = text.match(/\$\d+/g);
	let sqliteParams = params;

	if (matches) {
		// Map the input params to match the order of appearance in the SQL string
		sqliteParams = matches.map((param) => {
			const index = Number.parseInt(param.substring(1), 10) - 1;
			return params[index];
		});
	}

	// 2. Convert to SQLite style (?)
	const sql = text.replace(/\$\d+/g, "?");

	return new Promise((resolve, reject) => {
		const upperText = text.trim().toUpperCase();

		if (upperText.startsWith("SELECT")) {
			db.all(sql, sqliteParams, (err, rows) => {
				if (err) return reject(err);
				resolve({ rows });
			});
		} else if (
			text.trim().toUpperCase().startsWith("INSERT") &&
			text.toUpperCase().includes("RETURNING *")
		) {
			// Extract table name to fetch the inserted row
			// Matches "INSERT INTO tableName"
			const tableNameMatch = text.match(/INSERT\s+INTO\s+(\w+)/i);
			const tableName = tableNameMatch ? tableNameMatch[1] : null;

			if (!tableName) {
				return reject(new Error("Could not parse table name for RETURNING *"));
			}

			// Remove RETURNING * for SQLite
			const sqlRun = sql.replace(/RETURNING \*/i, "");

			// We must use function() here to access `this.lastID`
			db.run(sqlRun, sqliteParams, function (err) {
				if (err) return reject(err);
				// Fetch the last inserted ID
				const lastId = this.lastID;
				db.get(
					`SELECT * FROM ${tableName} WHERE id = ?`,
					[lastId],
					(err, row) => {
						if (err) return reject(err);
						resolve({ rows: [row] }); // Return single row in array
					},
				);
			});
		} else {
			// UPDATE, DELETE, etc.
			db.run(sql, sqliteParams, (err) => {
				if (err) return reject(err);
				resolve({ rows: [] });
			});
		}
	});
};

export default { query };
