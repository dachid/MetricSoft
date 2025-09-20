/*
  Warnings:

  - The column `parentObjectiveId` on the `kpis` table has been renamed to `objectiveId` and made required.

*/
-- DropForeignKey
ALTER TABLE "public"."kpis" DROP CONSTRAINT "kpis_parentObjectiveId_fkey";

-- First, ensure all NULL values have a default objective (we'll handle this if needed)
-- For now, since we want to make this NOT NULL, any existing NULL values need to be addressed

-- Rename the column
ALTER TABLE "public"."kpis" RENAME COLUMN "parentObjectiveId" TO "objectiveId";

-- Make the column NOT NULL (this will fail if there are any NULL values)
ALTER TABLE "public"."kpis" ALTER COLUMN "objectiveId" SET NOT NULL;

-- AddForeignKey with new constraint name
ALTER TABLE "public"."kpis" ADD CONSTRAINT "kpis_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."kpi_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
