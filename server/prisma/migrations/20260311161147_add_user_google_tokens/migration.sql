-- CreateTable
CREATE TABLE "user_google_tokens" (
    "user_email" VARCHAR(255) NOT NULL,
    "tokens" TEXT NOT NULL,

    CONSTRAINT "user_google_tokens_pkey" PRIMARY KEY ("user_email")
);

-- AddForeignKey
ALTER TABLE "user_google_tokens" ADD CONSTRAINT "user_google_tokens_user_email_fkey" FOREIGN KEY ("user_email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;
