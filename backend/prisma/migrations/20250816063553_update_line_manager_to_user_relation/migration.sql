/*
  Warnings:

  - You are about to drop the column `lineManager` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "lineManager",
ADD COLUMN     "lineManagerId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_lineManagerId_fkey" FOREIGN KEY ("lineManagerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
