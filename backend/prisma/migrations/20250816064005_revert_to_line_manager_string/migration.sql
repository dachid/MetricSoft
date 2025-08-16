/*
  Warnings:

  - You are about to drop the column `lineManagerId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_lineManagerId_fkey";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "lineManagerId",
ADD COLUMN     "lineManager" TEXT;
