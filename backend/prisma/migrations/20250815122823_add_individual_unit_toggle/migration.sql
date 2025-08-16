-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_tenantId_fkey";

-- AlterTable
ALTER TABLE "public"."fiscal_year_level_definitions" ADD COLUMN     "isIndividualUnit" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
