-- Enhanced Organizational Structure Migration
-- Phase 1, Week 5-6: Fully Optional Levels & Custom Organizational Structure
-- Run this manually in Supabase SQL Editor

-- Step 1: Update tenant_settings table to include org structure configuration
ALTER TABLE tenant_settings 
ADD COLUMN IF NOT EXISTS org_structure_config JSONB DEFAULT '{"enabledLevels":["ORGANIZATION","DEPARTMENT","INDIVIDUAL"],"customLevels":[]}'::jsonb;

-- Step 2: Create level_definitions table for flexible organizational levels
CREATE TABLE IF NOT EXISTS level_definitions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- ORGANIZATION, DEPARTMENT, TEAM, INDIVIDUAL, or custom
    name TEXT NOT NULL, -- Display name (e.g., "Department", "Region", "Business Unit")
    plural_name TEXT NOT NULL, -- Plural form (e.g., "Departments", "Regions") 
    hierarchy_level INTEGER NOT NULL, -- 0=Organization, 1=Department, 2=Team, 3=Individual, etc.
    is_standard BOOLEAN DEFAULT true, -- Standard vs custom level
    is_enabled BOOLEAN DEFAULT true, -- Can be disabled to hide level
    icon TEXT, -- Optional icon
    color TEXT DEFAULT '#6B7280', -- Default gray
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible config storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code),
    UNIQUE(tenant_id, hierarchy_level)
);

-- Step 3: Create org_units table for the organizational hierarchy
CREATE TABLE IF NOT EXISTS org_units (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    level_definition_id TEXT NOT NULL REFERENCES level_definitions(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Auto-generated or manual
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT REFERENCES org_units(id), -- Self-referential for hierarchy
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible data storage
    effective_from TIMESTAMPTZ DEFAULT NOW(), -- For re-orgs
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, level_definition_id, code)
);

-- Step 4: Create user_org_assignments table for flexible user assignments
CREATE TABLE IF NOT EXISTS user_org_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_unit_id TEXT NOT NULL REFERENCES org_units(id) ON DELETE CASCADE,
    role TEXT, -- "MANAGER", "MEMBER", "OWNER", etc.
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, org_unit_id)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_level_definitions_tenant_id ON level_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_level_definitions_hierarchy_level ON level_definitions(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_org_units_tenant_id ON org_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_units_parent_id ON org_units(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_units_level_definition_id ON org_units(level_definition_id);
CREATE INDEX IF NOT EXISTS idx_user_org_assignments_user_id ON user_org_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_assignments_org_unit_id ON user_org_assignments(org_unit_id);

-- Step 6: Insert default level definitions for existing tenants
-- This will create the standard 4-level structure for all existing tenants
INSERT INTO level_definitions (tenant_id, code, name, plural_name, hierarchy_level, is_standard, is_enabled, icon, color)
SELECT 
    t.id as tenant_id,
    levels.code,
    levels.name,
    levels.plural_name,
    levels.hierarchy_level,
    levels.is_standard,
    levels.is_enabled,
    levels.icon,
    levels.color
FROM tenants t
CROSS JOIN (
    VALUES 
        ('ORGANIZATION', 'Organization', 'Organizations', 0, true, true, '🏢', '#3B82F6'),
        ('DEPARTMENT', 'Department', 'Departments', 1, true, true, '🏬', '#10B981'),
        ('TEAM', 'Team', 'Teams', 2, true, false, '👥', '#F59E0B'), -- Disabled by default per mixed-level concept
        ('INDIVIDUAL', 'Individual', 'Individuals', 3, true, true, '👤', '#8B5CF6')
) AS levels(code, name, plural_name, hierarchy_level, is_standard, is_enabled, icon, color)
WHERE NOT EXISTS (
    -- Only insert if tenant doesn't already have level definitions
    SELECT 1 FROM level_definitions ld WHERE ld.tenant_id = t.id
);

-- Step 7: Create a root organization unit for each tenant
-- This gives every tenant a starting point in their hierarchy
INSERT INTO org_units (tenant_id, level_definition_id, code, name, description)
SELECT 
    t.id as tenant_id,
    ld.id as level_definition_id,
    UPPER(REPLACE(t.name, ' ', '_')) as code,
    t.name as name,
    'Root organization unit' as description
FROM tenants t
JOIN level_definitions ld ON ld.tenant_id = t.id AND ld.code = 'ORGANIZATION'
WHERE NOT EXISTS (
    -- Only create if tenant doesn't already have an org unit
    SELECT 1 FROM org_units ou WHERE ou.tenant_id = t.id
);

-- Step 8: Add updated_at trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_level_definitions_updated_at ON level_definitions;
CREATE TRIGGER update_level_definitions_updated_at BEFORE UPDATE ON level_definitions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_units_updated_at ON org_units;
CREATE TRIGGER update_org_units_updated_at BEFORE UPDATE ON org_units FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_org_assignments_updated_at ON user_org_assignments;
CREATE TRIGGER update_user_org_assignments_updated_at BEFORE UPDATE ON user_org_assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Migration completed successfully!
-- Run the following command in your terminal after executing this SQL:
-- cd backend && npx prisma db pull && npx prisma generate
