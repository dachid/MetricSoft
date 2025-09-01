-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('NUMERIC', 'STATUS', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "TargetDirection" AS ENUM ('INCREASING', 'DECREASING', 'N_A');

-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "KPIStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "perspectiveId" TEXT,
    "parentObjectiveId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "FrequencyType",
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_targets" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL DEFAULT '0',
    "targetValue" TEXT NOT NULL,
    "targetType" "TargetType" NOT NULL DEFAULT 'NUMERIC',
    "targetLabel" TEXT,
    "targetDirection" "TargetDirection" NOT NULL DEFAULT 'INCREASING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_objectives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentExitComponentId" TEXT,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_shares" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_audit_logs" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpis_tenantId_fiscalYearId_code_key" ON "kpis"("tenantId", "fiscalYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_targets_kpiId_key" ON "kpi_targets"("kpiId");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_shares_kpiId_sharedWithUserId_key" ON "kpi_shares"("kpiId", "sharedWithUserId");

-- CreateIndex
CREATE INDEX "kpi_audit_logs_kpiId_idx" ON "kpi_audit_logs"("kpiId");

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "fiscal_year_perspectives"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_parentObjectiveId_fkey" FOREIGN KEY ("parentObjectiveId") REFERENCES "kpi_objectives"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_targets" ADD CONSTRAINT "kpi_targets_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_objectives" ADD CONSTRAINT "kpi_objectives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_objectives" ADD CONSTRAINT "kpi_objectives_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_objectives" ADD CONSTRAINT "kpi_objectives_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org_units"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_objectives" ADD CONSTRAINT "kpi_objectives_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_shares" ADD CONSTRAINT "kpi_shares_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_shares" ADD CONSTRAINT "kpi_shares_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_shares" ADD CONSTRAINT "kpi_shares_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_audit_logs" ADD CONSTRAINT "kpi_audit_logs_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "kpis"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_audit_logs" ADD CONSTRAINT "kpi_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
