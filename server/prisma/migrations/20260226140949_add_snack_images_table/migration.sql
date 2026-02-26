-- CreateTable
CREATE TABLE "snack_images" (
    "id" SERIAL NOT NULL,
    "snack_id" INTEGER NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "snack_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "snack_images" ADD CONSTRAINT "snack_images_snack_id_fkey" FOREIGN KEY ("snack_id") REFERENCES "snacks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
