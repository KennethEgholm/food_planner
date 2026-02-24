-- CreateTable
CREATE TABLE "app_settings" (
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50),

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_ingredients" (
    "meal_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2),

    CONSTRAINT "meal_ingredients_pkey" PRIMARY KEY ("meal_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "meal_plan_days" (
    "meal_plan_id" INTEGER NOT NULL,
    "day" VARCHAR(20) NOT NULL,
    "meal_id" INTEGER,

    CONSTRAINT "meal_plan_days_pkey" PRIMARY KEY ("meal_plan_id","day")
);

-- CreateTable
CREATE TABLE "meal_plan_snacks" (
    "id" SERIAL NOT NULL,
    "meal_plan_id" INTEGER,
    "snack_id" INTEGER,

    CONSTRAINT "meal_plan_snacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "suitable_for_weekend" BOOLEAN DEFAULT false,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snack_ingredients" (
    "snack_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantity" DECIMAL(10,2),

    CONSTRAINT "snack_ingredients_pkey" PRIMARY KEY ("snack_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "snacks" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "snacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_name_key" ON "meal_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "meals_name_key" ON "meals"("name");

-- CreateIndex
CREATE UNIQUE INDEX "snacks_name_key" ON "snacks"("name");

-- AddForeignKey
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_plan_days" ADD CONSTRAINT "meal_plan_days_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_plan_days" ADD CONSTRAINT "meal_plan_days_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_plan_snacks" ADD CONSTRAINT "meal_plan_snacks_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meal_plan_snacks" ADD CONSTRAINT "meal_plan_snacks_snack_id_fkey" FOREIGN KEY ("snack_id") REFERENCES "snacks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snack_ingredients" ADD CONSTRAINT "snack_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "snack_ingredients" ADD CONSTRAINT "snack_ingredients_snack_id_fkey" FOREIGN KEY ("snack_id") REFERENCES "snacks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
