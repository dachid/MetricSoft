-- CreateTable
CREATE TABLE "public"."org_unit_kpi_champions" (
    "id" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_unit_kpi_champions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_unit_kpi_champions_orgUnitId_userId_key" ON "public"."org_unit_kpi_champions"("orgUnitId", "userId");

-- AddForeignKey
ALTER TABLE "public"."org_unit_kpi_champions" ADD CONSTRAINT "org_unit_kpi_champions_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_unit_kpi_champions" ADD CONSTRAINT "org_unit_kpi_champions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
