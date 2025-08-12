-- Rollback script for Enhanced Organizational Structure Migration
-- Run this if you need to undo the changes made by 001_enhanced_org_structure.sql

-- Step 1: Drop triggers
DROP TRIGGER IF EXISTS update_level_definitions_updated_at ON level_definitions;
DROP TRIGGER IF EXISTS update_org_units_updated_at ON org_units;
DROP TRIGGER IF EXISTS update_user_org_assignments_updated_at ON user_org_assignments;

-- Step 2: Drop indexes
DROP INDEX IF EXISTS idx_level_definitions_tenant_id;
DROP INDEX IF EXISTS idx_level_definitions_hierarchy_level;
DROP INDEX IF EXISTS idx_org_units_tenant_id;
DROP INDEX IF EXISTS idx_org_units_parent_id;
DROP INDEX IF EXISTS idx_org_units_level_definition_id;
DROP INDEX IF EXISTS idx_user_org_assignments_user_id;
DROP INDEX IF EXISTS idx_user_org_assignments_org_unit_id;

-- Step 3: Drop tables (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS user_org_assignments;
DROP TABLE IF EXISTS org_units;
DROP TABLE IF EXISTS level_definitions;

-- Step 4: Remove column from tenant_settings
ALTER TABLE tenant_settings DROP COLUMN IF EXISTS org_structure_config;

-- Step 5: Drop trigger function if not used elsewhere
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- Rollback completed!
