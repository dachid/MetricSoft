-- Migration: Make orgUnitId optional in KPIObjective table for individual objectives
-- This allows individual objectives to have null orgUnitId while organizational objectives require it

BEGIN;

-- First, drop the foreign key constraint
ALTER TABLE "KPIObjective" DROP CONSTRAINT "KPIObjective_orgUnitId_fkey";

-- Make orgUnitId nullable
ALTER TABLE "KPIObjective" ALTER COLUMN "orgUnitId" DROP NOT NULL;

-- Re-add the foreign key constraint but only for non-null values
ALTER TABLE "KPIObjective" 
ADD CONSTRAINT "KPIObjective_orgUnitId_fkey" 
FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE;

COMMIT;