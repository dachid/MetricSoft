-- CreateEnum
CREATE TYPE "public"."ComponentType" AS ENUM ('ENTRY', 'EXIT');

-- DropForeignKey
ALTER TABLE "public"."kpi_audit_logs" DROP CONSTRAINT "kpi_audit_logs_kpiId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_audit_logs" DROP CONSTRAINT "kpi_audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_objectives" DROP CONSTRAINT "kpi_objectives_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_objectives" DROP CONSTRAINT "kpi_objectives_fiscalYearId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_objectives" DROP CONSTRAINT "kpi_objectives_orgUnitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_objectives" DROP CONSTRAINT "kpi_objectives_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_shares" DROP CONSTRAINT "kpi_shares_kpiId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_shares" DROP CONSTRAINT "kpi_shares_sharedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_shares" DROP CONSTRAINT "kpi_shares_sharedWithUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_targets" DROP CONSTRAINT "kpi_targets_kpiId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_evaluatorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_fiscalYearId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_orgUnitId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_parentObjectiveId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_perspectiveId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_tenantId_fkey";

-- AlterTable
ALTER TABLE "public"."performance_components" ADD COLUMN     "componentType" "public"."ComponentType" NOT NULL DEFAULT 'ENTRY',
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "kpiId" TEXT,
ADD COLUMN     "templateId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."performance_components" ADD CONSTRAINT "performance_components_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "public"."kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_components" ADD CONSTRAINT "performance_components_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."performance_component_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_components" ADD CONSTRAINT "performance_components_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "public"."fiscal_year_perspectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_parentObjectiveId_fkey" FOREIGN KEY ("parentObjectiveId") REFERENCES "public"."kpi_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_targets" ADD CONSTRAINT "kpi_targets_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "public"."kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_objectives" ADD CONSTRAINT "kpi_objectives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_objectives" ADD CONSTRAINT "kpi_objectives_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_objectives" ADD CONSTRAINT "kpi_objectives_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_objectives" ADD CONSTRAINT "kpi_objectives_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_shares" ADD CONSTRAINT "kpi_shares_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "public"."kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_shares" ADD CONSTRAINT "kpi_shares_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_shares" ADD CONSTRAINT "kpi_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_audit_logs" ADD CONSTRAINT "kpi_audit_logs_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "public"."kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_audit_logs" ADD CONSTRAINT "kpi_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
