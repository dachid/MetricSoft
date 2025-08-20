/*
  Warnings:

  - A unique constraint covering the columns `[csrfToken]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."sessions" ADD COLUMN     "csrfToken" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_csrfToken_key" ON "public"."sessions"("csrfToken");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
