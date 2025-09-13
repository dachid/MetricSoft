-- Add performance component relationship to KPIs
-- This allows KPIs to link to performance components (initiatives) for cascade relationships

-- Add the performance_component_id column to the kpis table
ALTER TABLE "kpis" ADD COLUMN "performance_component_id" TEXT;

-- Add foreign key constraint (optional, but recommended for data integrity)
-- Note: We're not adding the constraint now to avoid issues with existing data
-- ALTER TABLE "kpis" ADD CONSTRAINT "kpis_performance_component_id_fkey" 
-- FOREIGN KEY ("performance_component_id") REFERENCES "performance_components"("id") ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX "idx_kpis_performance_component_id" ON "kpis"("performance_component_id");
