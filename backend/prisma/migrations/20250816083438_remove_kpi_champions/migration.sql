/*
  Warnings:

  - You are about to drop the `kpi_champion_assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."kpi_champion_assignments" DROP CONSTRAINT "kpi_champion_assignments_fiscalYearId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_champion_assignments" DROP CONSTRAINT "kpi_champion_assignments_orgLevelId_fkey";

-- DropForeignKey
ALTER TABLE "public"."kpi_champion_assignments" DROP CONSTRAINT "kpi_champion_assignments_userId_fkey";

-- DropTable
DROP TABLE "public"."kpi_champion_assignments";
