-- AlterTable
ALTER TABLE "public"."tenant_settings" ADD COLUMN     "orgStructureConfig" JSONB NOT NULL DEFAULT '{"enabledLevels":["ORGANIZATION","DEPARTMENT","INDIVIDUAL"],"customLevels":[]}';

-- CreateTable
CREATE TABLE "public"."level_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pluralName" TEXT NOT NULL,
    "hierarchyLevel" INTEGER NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."org_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "levelDefinitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_org_assignments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "role" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_org_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_definitions_tenantId_code_key" ON "public"."level_definitions"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "level_definitions_tenantId_hierarchyLevel_key" ON "public"."level_definitions"("tenantId", "hierarchyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "org_units_tenantId_levelDefinitionId_code_key" ON "public"."org_units"("tenantId", "levelDefinitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_assignments_userId_orgUnitId_key" ON "public"."user_org_assignments"("userId", "orgUnitId");

-- AddForeignKey
ALTER TABLE "public"."level_definitions" ADD CONSTRAINT "level_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_levelDefinitionId_fkey" FOREIGN KEY ("levelDefinitionId") REFERENCES "public"."level_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_org_assignments" ADD CONSTRAINT "user_org_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_org_assignments" ADD CONSTRAINT "user_org_assignments_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
