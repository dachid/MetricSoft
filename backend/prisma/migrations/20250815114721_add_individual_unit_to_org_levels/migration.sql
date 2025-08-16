/*
  Warnings:

  - Added the required column `level` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenantId` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_tenantId_fkey";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "isIndividualUnit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "level" INTEGER NOT NULL,
ALTER COLUMN "tenantId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
