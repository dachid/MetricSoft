-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "terminology" JSONB NOT NULL DEFAULT '{"perspectives":"Perspectives","objectives":"Objectives","kpis":"KPIs","targets":"Targets","initiatives":"Initiatives"}',
    "orgStructureConfig" JSONB NOT NULL DEFAULT '{"enabledLevels":["ORGANIZATION","DEPARTMENT","INDIVIDUAL"],"customLevels":[]}',
    "fiscalYearStart" TIMESTAMP(3) NOT NULL DEFAULT '2025-01-01 00:00:00 +00:00',
    "periods" JSONB NOT NULL DEFAULT '[]',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "setupStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."perspectives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."org_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "public"."fiscal_years" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fiscal_year_level_definitions" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
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

    CONSTRAINT "fiscal_year_level_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fiscal_year_confirmations" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "confirmationType" TEXT NOT NULL,
    "confirmedBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "canModify" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_year_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fiscal_year_perspectives" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "icon" TEXT,
    "sequenceOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_year_perspectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_component_templates" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "orgLevelId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "isStandard" BOOLEAN NOT NULL DEFAULT false,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "sequenceOrder" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_component_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_cascade_relationships" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "fromLevelId" TEXT NOT NULL,
    "toLevelId" TEXT NOT NULL,
    "exitComponentId" TEXT NOT NULL,
    "entryComponentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_cascade_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "public"."tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "public"."tenant_settings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "perspectives_tenantId_code_key" ON "public"."perspectives"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "public"."roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_tenantId_roleId_key" ON "public"."user_roles"("userId", "tenantId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "public"."sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "auth_codes_email_key" ON "public"."auth_codes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "org_units_fiscalYearId_levelDefinitionId_code_key" ON "public"."org_units"("fiscalYearId", "levelDefinitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_assignments_userId_orgUnitId_key" ON "public"."user_org_assignments"("userId", "orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_tenantId_name_key" ON "public"."fiscal_years"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_year_level_definitions_fiscalYearId_code_key" ON "public"."fiscal_year_level_definitions"("fiscalYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_year_level_definitions_fiscalYearId_hierarchyLevel_key" ON "public"."fiscal_year_level_definitions"("fiscalYearId", "hierarchyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_year_confirmations_fiscalYearId_confirmationType_key" ON "public"."fiscal_year_confirmations"("fiscalYearId", "confirmationType");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_year_perspectives_fiscalYearId_code_key" ON "public"."fiscal_year_perspectives"("fiscalYearId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_year_perspectives_fiscalYearId_sequenceOrder_key" ON "public"."fiscal_year_perspectives"("fiscalYearId", "sequenceOrder");

-- CreateIndex
CREATE UNIQUE INDEX "performance_component_templates_fiscalYearId_orgLevelId_com_key" ON "public"."performance_component_templates"("fiscalYearId", "orgLevelId", "componentType");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."perspectives" ADD CONSTRAINT "perspectives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_levelDefinitionId_fkey" FOREIGN KEY ("levelDefinitionId") REFERENCES "public"."fiscal_year_level_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."org_units" ADD CONSTRAINT "org_units_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."org_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_org_assignments" ADD CONSTRAINT "user_org_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_org_assignments" ADD CONSTRAINT "user_org_assignments_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "public"."org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fiscal_years" ADD CONSTRAINT "fiscal_years_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fiscal_year_level_definitions" ADD CONSTRAINT "fiscal_year_level_definitions_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fiscal_year_confirmations" ADD CONSTRAINT "fiscal_year_confirmations_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fiscal_year_perspectives" ADD CONSTRAINT "fiscal_year_perspectives_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_component_templates" ADD CONSTRAINT "performance_component_templates_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_component_templates" ADD CONSTRAINT "performance_component_templates_orgLevelId_fkey" FOREIGN KEY ("orgLevelId") REFERENCES "public"."fiscal_year_level_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_cascade_relationships" ADD CONSTRAINT "performance_cascade_relationships_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "public"."fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_cascade_relationships" ADD CONSTRAINT "performance_cascade_relationships_fromLevelId_fkey" FOREIGN KEY ("fromLevelId") REFERENCES "public"."fiscal_year_level_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_cascade_relationships" ADD CONSTRAINT "performance_cascade_relationships_toLevelId_fkey" FOREIGN KEY ("toLevelId") REFERENCES "public"."fiscal_year_level_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_cascade_relationships" ADD CONSTRAINT "performance_cascade_relationships_exitComponentId_fkey" FOREIGN KEY ("exitComponentId") REFERENCES "public"."performance_component_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_cascade_relationships" ADD CONSTRAINT "performance_cascade_relationships_entryComponentId_fkey" FOREIGN KEY ("entryComponentId") REFERENCES "public"."performance_component_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
