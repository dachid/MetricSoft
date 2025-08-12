-- Manual migration to add orgStructureConfig column to tenant_settings table
-- Run this in your Supabase SQL editor

-- First, let's check what columns exist in the existing tables
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('tenants', 'users', 'tenant_settings') 
ORDER BY table_name, ordinal_position;

-- Add the orgStructureConfig column to tenant_settings table
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS "orgStructureConfig" JSONB DEFAULT '{"enabledLevels":["ORGANIZATION","DEPARTMENT","INDIVIDUAL"],"customLevels":[]}'::JSONB;

-- Update any existing records that might have NULL values
UPDATE tenant_settings 
SET "orgStructureConfig" = '{"enabledLevels":["ORGANIZATION","DEPARTMENT","INDIVIDUAL"],"customLevels":[]}'::JSONB 
WHERE "orgStructureConfig" IS NULL;

-- Create organizational structure tables using snake_case column names to match existing schema
CREATE TABLE IF NOT EXISTS level_definitions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    plural_name TEXT NOT NULL,
    hierarchy_level INTEGER NOT NULL,
    is_standard BOOLEAN DEFAULT true NOT NULL,
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    icon TEXT,
    color TEXT DEFAULT '#6B7280' NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT level_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT level_definitions_tenant_id_code_key UNIQUE (tenant_id, code),
    CONSTRAINT level_definitions_tenant_id_hierarchy_level_key UNIQUE (tenant_id, hierarchy_level)
);

CREATE TABLE IF NOT EXISTS org_units (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    level_definition_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    effective_from TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to TIMESTAMP(3),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT org_units_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT org_units_level_definition_id_fkey FOREIGN KEY (level_definition_id) REFERENCES level_definitions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT org_units_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES org_units(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT org_units_tenant_id_level_definition_id_code_key UNIQUE (tenant_id, level_definition_id, code)
);

CREATE TABLE IF NOT EXISTS user_org_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_unit_id TEXT NOT NULL,
    role TEXT,
    effective_from TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to TIMESTAMP(3),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT user_org_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT user_org_assignments_org_unit_id_fkey FOREIGN KEY (org_unit_id) REFERENCES org_units(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT user_org_assignments_user_id_org_unit_id_key UNIQUE (user_id, org_unit_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS level_definitions_tenant_id_idx ON level_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS level_definitions_hierarchy_level_idx ON level_definitions(hierarchy_level);

CREATE INDEX IF NOT EXISTS org_units_tenant_id_idx ON org_units(tenant_id);
CREATE INDEX IF NOT EXISTS org_units_level_definition_id_idx ON org_units(level_definition_id);
CREATE INDEX IF NOT EXISTS org_units_parent_id_idx ON org_units(parent_id);

CREATE INDEX IF NOT EXISTS user_org_assignments_user_id_idx ON user_org_assignments(user_id);
CREATE INDEX IF NOT EXISTS user_org_assignments_org_unit_id_idx ON user_org_assignments(org_unit_id);

-- Final verification query
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('tenant_settings', 'level_definitions', 'org_units', 'user_org_assignments')
ORDER BY table_name, ordinal_position;
