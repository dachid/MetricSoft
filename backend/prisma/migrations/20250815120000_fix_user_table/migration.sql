/*
  Fix incorrect migration - remove level and isIndividualUnit from users table
  and make tenantId optional again for Super Admins
*/
-- AlterTable
ALTER TABLE "public"."users" 
DROP COLUMN "level",
DROP COLUMN "isIndividualUnit",
ALTER COLUMN "tenantId" DROP NOT NULL;

-- Update foreign key constraint to allow NULL tenantId
ALTER TABLE "public"."users" DROP CONSTRAINT "users_tenantId_fkey";
ALTER TABLE "public"."users" ADD CONSTRAINT "users_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
