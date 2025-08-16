-- CreateTable
CREATE TABLE "public"."kpi_champion_assignments" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "orgLevelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_champion_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_champion_assignments_fiscalYearId_orgLevelId_key" ON "public"."kpi_champion_assignments"("fiscalYearId", "orgLevelId");

-- AddForeignKey
ALTER TABLE "public"."kpi_champion_assignments" ADD CONSTRAINT "kpi_champion_assignments_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_champion_assignments" ADD CONSTRAINT "kpi_champion_assignments_orgLevelId_fkey" FOREIGN KEY ("orgLevelId") REFERENCES "public"."fiscal_year_level_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kpi_champion_assignments" ADD CONSTRAINT "kpi_champion_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
