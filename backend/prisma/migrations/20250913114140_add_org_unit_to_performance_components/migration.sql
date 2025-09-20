-- DropIndex
DROP INDEX "public"."idx_kpis_performance_component_id";

-- AlterTable
ALTER TABLE "public"."performance_components" ADD COLUMN     "orgUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."performance_components" ADD CONSTRAINT "performance_components_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_performance_component_id_fkey" FOREIGN KEY ("performance_component_id") REFERENCES "public"."performance_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
