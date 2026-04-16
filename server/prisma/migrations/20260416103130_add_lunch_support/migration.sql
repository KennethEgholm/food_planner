-- AlterTable
ALTER TABLE "meal_plan_days" ADD COLUMN     "lunch_meal_id" INTEGER;

-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "suitable_for_lunch" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "meal_plan_days" ADD CONSTRAINT "meal_plan_days_lunch_meal_id_fkey" FOREIGN KEY ("lunch_meal_id") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
