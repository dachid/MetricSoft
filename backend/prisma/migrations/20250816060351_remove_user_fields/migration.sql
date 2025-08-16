/*
  Warnings:

  - You are about to drop the column `department` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "department",
DROP COLUMN "position",
DROP COLUMN "startDate";
