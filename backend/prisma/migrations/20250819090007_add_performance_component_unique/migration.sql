/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name,organizationalLevel]` on the table `performance_components` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "performance_components_tenantId_name_organizationalLevel_key" ON "public"."performance_components"("tenantId", "name", "organizationalLevel");
