-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "department" TEXT,
ADD COLUMN     "lineManager" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);
