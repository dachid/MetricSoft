-- AlterTable
ALTER TABLE "public"."kpi_champion_assignments" ADD COLUMN     "email" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
