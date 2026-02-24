-- CreateTable
CREATE TABLE "meal_images" (
    "id" SERIAL NOT NULL,
    "meal_id" INTEGER NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_images_pkey" PRIMARY KEY ("id")
);

-- Migrate existing image_path data into the new table
INSERT INTO meal_images (meal_id, path, sort_order)
SELECT id, image_path, 0
FROM meals
WHERE image_path IS NOT NULL;

-- AlterTable: drop image_path from meals
ALTER TABLE "meals" DROP COLUMN "image_path";

-- AddForeignKey
ALTER TABLE "meal_images" ADD CONSTRAINT "meal_images_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
