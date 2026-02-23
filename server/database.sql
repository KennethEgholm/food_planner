DROP TABLE IF EXISTS meal_plan_days CASCADE;
DROP TABLE IF EXISTS meal_ingredients CASCADE;
DROP TABLE IF EXISTS snack_ingredients CASCADE;
DROP TABLE IF EXISTS meal_plan_snacks CASCADE;
DROP TABLE IF EXISTS meal_plans CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS snacks CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    unit VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS meals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    suitable_for_weekend BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
    meal_id INTEGER,
    ingredient_id INTEGER,
    quantity DECIMAL(10, 2),
    PRIMARY KEY (meal_id, ingredient_id),
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS meal_plan_days (
    meal_plan_id INTEGER,
    day VARCHAR(20) NOT NULL,
    meal_id INTEGER,
    PRIMARY KEY (meal_plan_id, day),
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS snacks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS snack_ingredients (
    snack_id INTEGER,
    ingredient_id INTEGER,
    quantity DECIMAL(10, 2),
    PRIMARY KEY (snack_id, ingredient_id),
    FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_plan_snacks (
    id SERIAL PRIMARY KEY,
    meal_plan_id INTEGER,
    snack_id INTEGER,
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (snack_id) REFERENCES snacks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT
);

