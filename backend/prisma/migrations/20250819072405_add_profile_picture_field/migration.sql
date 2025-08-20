-- AlterTable
ALTER TABLE "public"."tenant_settings" ALTER COLUMN "terminology" SET DEFAULT '{"kpis": "KPIs", "targets": "Targets", "objectives": "Objectives", "perspectives": "Perspectives"}';

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "profilePicture" TEXT;
