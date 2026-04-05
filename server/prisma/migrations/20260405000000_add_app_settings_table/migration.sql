-- CreateTable
CREATE TABLE IF NOT EXISTS "app_settings" (
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
