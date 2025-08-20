/*
  Warnings:

  - You are about to drop the column `profilePicture` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."tenant_settings" ALTER COLUMN "terminology" SET DEFAULT '{"kpis": "KPIs", "targets": "Targets", "objectives": "Objectives", "initiatives": "Initiatives", "perspectives": "Perspectives"}';

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "profilePicture";

-- AddForeignKey
ALTER TABLE "public"."performance_components" ADD CONSTRAINT "performance_components_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
