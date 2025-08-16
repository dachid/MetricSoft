-- AlterTable
ALTER TABLE "public"."tenants" ADD COLUMN     "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];
