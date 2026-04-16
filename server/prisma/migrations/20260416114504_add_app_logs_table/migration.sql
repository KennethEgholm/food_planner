-- CreateTable
CREATE TABLE "app_logs" (
    "id" SERIAL NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);
