-- CreateTable
CREATE TABLE "public"."performance_components" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organizationalLevel" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."individual_kpis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizational_kpis" (
    "id" TEXT NOT NULL,
    "organizationalUnitId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizational_kpis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."individual_kpis" ADD CONSTRAINT "individual_kpis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."individual_kpis" ADD CONSTRAINT "individual_kpis_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "public"."performance_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizational_kpis" ADD CONSTRAINT "organizational_kpis_organizationalUnitId_fkey" FOREIGN KEY ("organizationalUnitId") REFERENCES "public"."org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizational_kpis" ADD CONSTRAINT "organizational_kpis_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "public"."performance_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizational_kpis" ADD CONSTRAINT "organizational_kpis_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
