-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
