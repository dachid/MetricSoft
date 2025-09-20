-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_orgUnitId_fkey";

-- AlterTable
ALTER TABLE "public"."kpis" ALTER COLUMN "orgUnitId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
