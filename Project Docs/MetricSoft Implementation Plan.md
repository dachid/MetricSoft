# MetricSoft Implementation Plan
*Multi-Tenant Performance Management System*

**Technology Stack:**
- Frontend: React 18+ with TypeScript
- Styling: Tailwind CSS with headlessUI/shadcn components
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- State Management: Zustand or React Query
- Charts: Recharts or Chart.js
- File Upload: React Dropzone
- PDF Generation: React-PDF or Puppeteer

---

## Phase 1: Foundation & Core MVP (8-10 weeks)

### Week 1-2: Project Setup & Authentication
**Goals:** Establish development environment and user authentication

**Deliverables:**
- [x] Project scaffolding with Vite/Create React App
- [x] Complete folder structure setup
- [x] Development tooling configuration (ESLint, Prettier, TypeScript)
- [x] Supabase project setup with PostgreSQL database
- [x] Multi-tenant authentication system
- [x] Role-based access control (RBAC) foundation
- [x] Basic routing and layout structure

**Project Folder Structure:**
```
metricsoft/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── index.ts
│   │   ├── forms/              # Form-specific components
│   │   │   ├── KPIForm.tsx
│   │   │   ├── ObjectiveForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── index.ts
│   │   ├── charts/             # Chart and visualization components
│   │   │   ├── TrendChart.tsx
│   │   │   ├── RAGHeatmap.tsx
│   │   │   ├── CascadeVisualization.tsx
│   │   │   └── index.ts
│   │   ├── layout/             # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── index.ts
│   │   ├── features/           # Feature-specific components
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── SignupForm.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── kpis/
│   │   │   │   ├── KPIList.tsx
│   │   │   │   ├── KPICard.tsx
│   │   │   │   └── KPIBuilder.tsx
│   │   │   ├── cascading/
│   │   │   │   ├── CascadeBuilder.tsx
│   │   │   │   └── CascadeTree.tsx
│   │   │   ├── reviews/
│   │   │   │   ├── ReviewDashboard.tsx
│   │   │   │   └── ReviewForm.tsx
│   │   │   └── reporting/
│   │   │       ├── Dashboard.tsx
│   │   │       └── ReportBuilder.tsx
│   │   └── common/             # Shared components
│   │       ├── FileUploader.tsx
│   │       ├── NotificationCenter.tsx
│   │       ├── SearchBar.tsx
│   │       └── Pagination.tsx
│   ├── pages/                  # Page components
│   │   ├── Dashboard.tsx
│   │   ├── KPIs.tsx
│   │   ├── Objectives.tsx
│   │   ├── Reviews.tsx
│   │   ├── Reports.tsx
│   │   ├── Settings.tsx
│   │   ├── Admin.tsx
│   │   ├── Login.tsx
│   │   └── NotFound.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useKPIs.ts
│   │   ├── useReviews.ts
│   │   ├── useNotifications.ts
│   │   ├── useTenant.ts
│   │   └── index.ts
│   ├── services/               # API services and external integrations
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── kpis.ts
│   │   │   ├── objectives.ts
│   │   │   ├── reviews.ts
│   │   │   ├── reports.ts
│   │   │   ├── tenants.ts
│   │   │   └── index.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   └── database.ts
│   │   └── integrations/
│   │       ├── email.ts
│   │       ├── fileStorage.ts
│   │       └── notifications.ts
│   ├── stores/                 # State management (Zustand stores)
│   │   ├── authStore.ts
│   │   ├── kpiStore.ts
│   │   ├── tenantStore.ts
│   │   ├── uiStore.ts
│   │   └── index.ts
│   ├── types/                  # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── kpi.ts
│   │   ├── organization.ts
│   │   ├── review.ts
│   │   ├── tenant.ts
│   │   ├── api.ts
│   │   └── index.ts
│   ├── utils/                  # Utility functions and helpers
│   │   ├── formatters.ts       # Date, number, currency formatters
│   │   ├── validators.ts       # Form validation utilities
│   │   ├── constants.ts        # App constants
│   │   ├── helpers.ts          # General helper functions
│   │   ├── calculations.ts     # KPI and target calculations
│   │   └── index.ts
│   ├── styles/                 # Global styles and Tailwind config
│   │   ├── globals.css
│   │   ├── components.css
│   │   └── utilities.css
│   ├── lib/                    # Third-party library configurations
│   │   ├── react-query.ts
│   │   ├── router.ts
│   │   └── charts.ts
│   ├── assets/                 # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── config/                 # Configuration files
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── app.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── supabase/                   # Supabase configuration and migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_auth_setup.sql
│   │   ├── 003_kpi_tables.sql
│   │   └── 004_cascade_tables.sql
│   ├── functions/              # Edge functions
│   │   ├── send-notification/
│   │   ├── process-bulk-import/
│   │   └── generate-report/
│   └── config.toml
├── docs/                       # Project documentation
│   ├── api/                    # API documentation
│   ├── deployment/             # Deployment guides
│   └── user-guide/             # User documentation
├── tests/                      # Test files
│   ├── __mocks__/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── setup.ts
├── .env.example
├── .env.local
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── eslint.config.js
├── prettier.config.js
└── README.md
```

**Development Tooling Setup:**
```json
// package.json dependencies
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "@tanstack/react-query": "^4.35.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "zustand": "^4.4.1",
    "tailwindcss": "^3.3.0",
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "recharts": "^2.8.0",
    "react-dropzone": "^14.2.3",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.22",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "@vitejs/plugin-react": "^4.0.4",
    "eslint": "^8.49.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.0.3",
    "typescript": "^5.2.2",
    "vite": "^4.4.9",
    "vitest": "^0.34.6",
    "@testing-library/react": "^13.4.0"
  }
}
```

**Key Components:**
```typescript
// Core auth types
interface User {
  id: string;
  email: string;
  tenantId: string;
  roles: Role[];
  profile: UserProfile;
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  orgUnitScope?: string[];
}
```

**Database Schema (Supabase):**
```sql
-- Core tenant and user tables
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UX Focus:**
- Clean, modern login/signup flow
- Intuitive role-based navigation
- Responsive sidebar with clear menu structure

---

### Week 3-4: Tenant Setup & Configuration
**Goals:** Enable tenant customization and terminology management

**Deliverables:**
- [x] Tenant settings dashboard
- [x] Custom terminology configuration (Perspectives→Themes, etc.)
- [x] Fiscal year and period management
- [x] Basic branding (logo, colors)

**Key Features:**
- **Simple Setup Wizard:** Step-by-step tenant onboarding
- **Terminology Manager:** Easy rename of classic elements
- **Period Configuration:** Visual calendar for fiscal periods

**Database Schema:**
```sql
CREATE TABLE tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  terminology JSONB DEFAULT '{"perspectives":"Perspectives","objectives":"Objectives","kpis":"KPIs","targets":"Targets","initiatives":"Initiatives"}',
  fiscal_year_start DATE DEFAULT '2025-01-01',
  periods JSONB DEFAULT '[]',
  branding JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE perspectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- hex color
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UX Components:**
- Drag-and-drop terminology editor
- Color picker for perspectives
- Preview of changes across UI

---

### Week 5-6: Enhanced Organizational Structure & Fully Optional Levels
**Goals:** Build ultra-flexible org structure with all levels optional (except Organization) and custom level support

**Deliverables:**
- [x] Organization hierarchy builder with optional levels
- [x] Custom organizational level creation and management
- [x] Fully configurable level activation/deactivation per tenant
- [x] Dynamic cascading engine that adapts to active levels
- [x] User assignment to any active level combination
- [x] Bulk import supporting flexible level structures

**Key Features:**
- **Universal Level Optionality:** All levels except Organization can be disabled
- **Custom Level Designer:** Create unlimited custom levels (Region, Division, Business Unit, etc.)
- **Flexible Hierarchy:** Insert custom levels anywhere in the structure
- **Smart Cascading:** Automatic skip-level cascading for any level combination

**Enhanced Database Schema:**
```sql
-- New table for flexible level definitions
CREATE TABLE level_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL, -- e.g., "Region", "Division", "Business Unit"
  code VARCHAR(50) NOT NULL,
  level_type VARCHAR(20) NOT NULL, -- 'STANDARD', 'CUSTOM'
  hierarchy_position INTEGER NOT NULL, -- 1=Org, 2=Custom/Dept, 3=Custom/Team, 4=Individual
  is_active BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT false, -- only true for Organization level
  metadata JSONB DEFAULT '{}', -- custom attributes per level
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code),
  UNIQUE(tenant_id, hierarchy_position)
);

-- Enhanced org_units table
CREATE TABLE org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  level_definition_id UUID REFERENCES level_definitions(id), -- links to flexible level
  parent_id UUID REFERENCES org_units(id),
  active_from DATE DEFAULT CURRENT_DATE,
  active_to DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- Update user assignments to work with flexible levels
CREATE TABLE user_org_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  org_unit_id UUID REFERENCES org_units(id),
  role_id UUID REFERENCES roles(id),
  active_from DATE DEFAULT CURRENT_DATE,
  active_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UX Components:**
```typescript
// Enhanced Level Configuration
interface LevelDefinition {
  id: string;
  name: string;
  code: string;
  levelType: 'STANDARD' | 'CUSTOM';
  hierarchyPosition: number;
  isActive: boolean;
  isMandatory: boolean;
  metadata: Record<string, any>;
}

const LevelConfigurationManager = () => {
  const [levelDefs, setLevelDefs] = useState<LevelDefinition[]>([]);
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Organizational Level Configuration</h2>
        <div className="grid gap-4">
          <LevelToggleList levels={standardLevels} onToggle={handleToggle} />
          <CustomLevelCreator onCreateLevel={handleCreateCustomLevel} />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Hierarchy Preview</h3>
        <HierarchyPreview levels={activeLevels} />
      </div>
    </div>
  );
};

// Dynamic Org Structure Builder
const DynamicOrgBuilder = () => {
  const activeLevels = useActiveLevels();
  
  return (
    <div className="space-y-6">
      <LevelBreadcrumb levels={activeLevels} currentPath={currentPath} />
      <OrgChart 
        levels={activeLevels} 
        units={orgUnits} 
        onUpdate={handleOrgUpdate}
        supportsCascading={true}
      />
    </div>
  );
};
```

---

### Week 7-8: Enhanced Definition Framework & Custom Definitions
**Goals:** Create flexible definition system with optional classic elements and custom definition types

**Deliverables:**
- [x] Configurable definition type management (make Perspectives, Objectives, Initiatives optional)
- [x] Custom definition type creation and management
- [x] Dynamic definition hierarchy configuration
- [x] Flexible attribute system for custom definitions
- [x] Enhanced import/export supporting custom frameworks
- [x] KPI and Target management (always mandatory)

**Key Features:**
- **Definition Type Designer:** Create unlimited custom definition types (Outcomes, Key Results, Themes, etc.)
- **Optional Classic Elements:** Enable/disable Perspectives, Objectives, Initiatives per tenant
- **Custom Attributes:** Add custom fields to any definition type
- **Flexible Hierarchy:** Configure definition cascade relationships per tenant

**Enhanced Database Schema:**
```sql
-- New table for flexible definition types
CREATE TABLE definition_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL, -- e.g., "Outcomes", "Key Results", "Themes"
  code VARCHAR(50) NOT NULL,
  type_category VARCHAR(20) NOT NULL, -- 'STANDARD', 'CUSTOM'
  is_active BOOLEAN DEFAULT true,
  is_mandatory BOOLEAN DEFAULT false, -- true for KPI and Target only
  hierarchy_level INTEGER NOT NULL, -- defines cascade order (1=highest, 5=lowest)
  custom_attributes JSONB DEFAULT '[]', -- array of attribute definitions
  validation_rules JSONB DEFAULT '{}',
  lifecycle_states JSONB DEFAULT '["DRAFT","ACTIVE","ARCHIVED"]',
  icon VARCHAR(50), -- UI icon reference
  color VARCHAR(7), -- hex color for UI theming
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code),
  UNIQUE(tenant_id, hierarchy_level)
);

-- Unified table for all definition instances
CREATE TABLE definition_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  definition_type_id UUID REFERENCES definition_types(id),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  custom_data JSONB DEFAULT '{}', -- stores custom attribute values
  parent_id UUID REFERENCES definition_instances(id), -- for hierarchy within same type
  status VARCHAR(20) DEFAULT 'ACTIVE',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, definition_type_id, code)
);

-- Enhanced cascade relationships supporting any definition type
CREATE TABLE definition_cascades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  parent_definition_id UUID REFERENCES definition_instances(id),
  child_definition_id UUID REFERENCES definition_instances(id),
  parent_org_unit_id UUID REFERENCES org_units(id),
  child_org_unit_id UUID REFERENCES org_units(id),
  cascade_type VARCHAR(20) DEFAULT 'DIRECT', -- 'DIRECT', 'WEIGHTED', 'FORMULA'
  weight DECIMAL(5,2) DEFAULT 100.00,
  formula TEXT, -- for calculated cascades
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, parent_definition_id, child_definition_id, parent_org_unit_id, child_org_unit_id)
);

-- Maintain backward compatibility with existing tables
ALTER TABLE kpis ADD COLUMN definition_instance_id UUID REFERENCES definition_instances(id);
ALTER TABLE targets ADD COLUMN definition_instance_id UUID REFERENCES definition_instances(id);

-- Optional: Keep existing tables for migration purposes, but reference new system
ALTER TABLE perspectives ADD COLUMN definition_instance_id UUID REFERENCES definition_instances(id);
ALTER TABLE objectives ADD COLUMN definition_instance_id UUID REFERENCES definition_instances(id);
ALTER TABLE initiatives ADD COLUMN definition_instance_id UUID REFERENCES definition_instances(id);
```

**UX Features:**
- **Definition Framework Designer:** Visual designer for custom definition types and hierarchies
- **Custom Attribute Builder:** Drag-and-drop form builder for definition attributes
- **Framework Templates:** Pre-built templates for common frameworks (OKR, BSC, Custom)
- **Dynamic Forms:** Auto-generated forms based on active definition types and custom attributes

**TypeScript Interfaces:**
```typescript
interface DefinitionType {
  id: string;
  name: string;
  code: string;
  typeCategory: 'STANDARD' | 'CUSTOM';
  isActive: boolean;
  isMandatory: boolean;
  hierarchyLevel: number;
  customAttributes: CustomAttribute[];
  validationRules: ValidationRule[];
  lifecycleStates: string[];
  icon?: string;
  color?: string;
}

interface CustomAttribute {
  id: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'MULTISELECT' | 'BOOLEAN' | 'TEXTAREA';
  isRequired: boolean;
  defaultValue?: any;
  options?: string[]; // for dropdown/multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface DefinitionInstance {
  id: string;
  definitionTypeId: string;
  code: string;
  name: string;
  description?: string;
  customData: Record<string, any>;
  parentId?: string;
  status: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

// Enhanced Framework Configuration
const DefinitionFrameworkDesigner = () => {
  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Definition Framework Configuration</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StandardDefinitionToggles types={standardTypes} onToggle={handleToggle} />
          <CustomDefinitionCreator onCreateType={handleCreateType} />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Framework Hierarchy</h3>
        <HierarchyDesigner 
          definitionTypes={activeTypes}
          onReorder={handleReorder}
          onRelationshipChange={handleRelationshipChange}
        />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Framework Preview</h3>
        <FrameworkPreview 
          types={activeTypes}
          sampleData={sampleDefinitions}
        />
      </div>
    </div>
  );
};
```

---

### Week 9-10: Enhanced Cascading Engine & Dynamic Data Entry
**Goals:** Implement adaptive cascading for flexible levels and definition types with dynamic data entry

**Deliverables:**
- [x] Multi-level adaptive cascading algorithm
- [x] Custom definition type cascading support
- [x] Dynamic data entry forms based on active definitions
- [x] Enhanced evidence management system
- [x] Flexible cascade visualization for any level/definition combination

**Key Features:**
- **Universal Cascading:** Works with any combination of active levels and definition types
- **Smart Skip-Level:** Automatically handles missing intermediate levels
- **Definition Cascading:** Support cascades between any definition types (not just KPIs)
- **Dynamic Forms:** Auto-generated forms based on tenant's active configuration

**Enhanced Database Schema:**
```sql
-- Enhanced cascade links supporting flexible definitions and levels
CREATE TABLE cascade_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  parent_definition_id UUID REFERENCES definition_instances(id),
  child_definition_id UUID REFERENCES definition_instances(id),
  parent_org_unit_id UUID REFERENCES org_units(id),
  child_org_unit_id UUID REFERENCES org_units(id),
  cascade_type VARCHAR(20) DEFAULT 'DIRECT', -- 'DIRECT', 'WEIGHTED', 'FORMULA', 'ROLLUP'
  weight DECIMAL(5,2) DEFAULT 100.00,
  formula TEXT,
  cascade_rules JSONB DEFAULT '{}', -- flexible rules for custom cascading logic
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced actuals supporting any definition type (not just KPIs)
CREATE TABLE definition_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_instance_id UUID REFERENCES definition_instances(id),
  org_unit_id UUID REFERENCES org_units(id),
  user_id UUID REFERENCES users(id),
  period VARCHAR(20) NOT NULL,
  value JSONB NOT NULL, -- flexible value storage (number, text, object, etc.)
  comment TEXT,
  status VARCHAR(20) DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced targets supporting flexible definitions and levels
CREATE TABLE definition_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_instance_id UUID REFERENCES definition_instances(id),
  org_unit_id UUID REFERENCES org_units(id),
  period VARCHAR(20) NOT NULL,
  target_value JSONB NOT NULL, -- flexible target storage
  green_threshold JSONB,
  amber_threshold JSONB,
  red_threshold JSONB,
  target_type VARCHAR(20) DEFAULT 'NUMERIC', -- 'NUMERIC', 'PERCENTAGE', 'BOOLEAN', 'TEXT'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced evidence supporting any definition type
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actual_id UUID REFERENCES definition_actuals(id),
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  checksum VARCHAR(64),
  metadata JSONB DEFAULT '{}', -- additional file metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintain backward compatibility
CREATE VIEW kpi_actuals AS
SELECT 
  da.id,
  da.definition_instance_id as kpi_id,
  da.org_unit_id,
  da.user_id,
  da.period,
  (da.value->>'numeric_value')::DECIMAL as value,
  da.comment,
  da.status,
  da.submitted_at,
  da.created_at
FROM definition_actuals da
JOIN definition_instances di ON da.definition_instance_id = di.id
JOIN definition_types dt ON di.definition_type_id = dt.id
WHERE dt.code = 'KPI';
```

**TypeScript Interfaces:**
```typescript
interface CascadeConfig {
  id: string;
  tenantId: string;
  activeLevels: LevelDefinition[];
  activeDefinitionTypes: DefinitionType[];
  cascadeRules: CascadeRule[];
}

interface CascadeRule {
  fromDefinitionType: string;
  toDefinitionType: string;
  fromLevel: string;
  toLevel: string;
  cascadeType: 'DIRECT' | 'WEIGHTED' | 'FORMULA' | 'ROLLUP';
  weight?: number;
  formula?: string;
  isAutomatic: boolean;
}

interface FlexibleActual {
  id: string;
  definitionInstanceId: string;
  orgUnitId: string;
  userId: string;
  period: string;
  value: any; // flexible value type based on definition
  comment?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';
  evidence: Evidence[];
}

// Dynamic Cascading Engine
class AdaptiveCascadeEngine {
  constructor(private config: CascadeConfig) {}
  
  // Generate cascade paths based on active levels and definitions
  generateCascadePaths(): CascadePath[] {
    const paths: CascadePath[] = [];
    
    for (const defType of this.config.activeDefinitionTypes) {
      for (let i = 0; i < this.config.activeLevels.length - 1; i++) {
        const fromLevel = this.config.activeLevels[i];
        const toLevel = this.config.activeLevels[i + 1];
        
        paths.push({
          definitionType: defType.code,
          fromLevel: fromLevel.code,
          toLevel: toLevel.code,
          isActive: true
        });
      }
    }
    
    return paths;
  }
  
  // Handle skip-level cascading when intermediate levels are inactive
  resolveSkipLevelCascade(fromUnit: OrgUnit, activeLevel: string): OrgUnit[] {
    // Find next active level in hierarchy
    const activeLevels = this.config.activeLevels
      .sort((a, b) => a.hierarchyPosition - b.hierarchyPosition);
    
    // Implementation for skip-level resolution
    return this.findNextActiveLevelUnits(fromUnit, activeLevels);
  }
}
```

**UX Components:**
```typescript
// Dynamic Cascading Visualization
const AdaptiveCascadeVisualization = ({ definitionId, orgUnitId }: CascadeVisualizationProps) => {
  const activeLevels = useActiveLevels();
  const activeDefinitions = useActiveDefinitionTypes();
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Definition Cascade Flow</h3>
      <div className="space-y-4">
        {activeLevels.map((level, index) => (
          <div key={level.id} className="cascade-level">
            <CascadeLevel 
              level={level} 
              definitions={getDefinitionsForLevel(level.id)}
              cascadeType={getCascadeTypeForLevel(index)}
            />
            {index < activeLevels.length - 1 && <CascadeConnector />}
          </div>
        ))}
      </div>
    </div>
  );
};

// Dynamic Data Entry Form
const DynamicDataEntryForm = ({ definitionInstance, orgUnit, period }: DataEntryProps) => {
  const definitionType = useDefinitionType(definitionInstance.definitionTypeId);
  
  return (
    <form className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {definitionInstance.name} ({definitionType.name})
          </label>
          <DynamicValueInput 
            definitionType={definitionType}
            value={currentValue}
            onChange={handleValueChange}
          />
        </div>
        
        {/* Custom attribute fields */}
        {definitionType.customAttributes.map(attr => (
          <div key={attr.id}>
            <label className="block text-sm font-medium text-gray-700">
              {attr.name} {attr.isRequired && '*'}
            </label>
            <CustomAttributeInput 
              attribute={attr}
              value={definitionInstance.customData[attr.name]}
              onChange={handleCustomDataChange}
            />
          </div>
        ))}
        
        {/* Evidence upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Supporting Evidence
          </label>
          <EnhancedFileUploader 
            onUpload={handleEvidenceUpload}
            maxSize={definitionType.evidencePolicy?.maxSizeMB}
            acceptedTypes={definitionType.evidencePolicy?.allowedTypes}
          />
        </div>
      </div>
    </form>
  );
};

// Adaptive Cascade Builder
const AdaptiveCascadeBuilder = ({ tenantConfig }: { tenantConfig: CascadeConfig }) => {
  const [cascadeRules, setCascadeRules] = useState<CascadeRule[]>([]);
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Cascade Configuration</h3>
        <div className="grid gap-4">
          {tenantConfig.activeDefinitionTypes.map(defType => (
            <DefinitionTypeCascadeConfig 
              key={defType.id}
              definitionType={defType}
              activeLevels={tenantConfig.activeLevels}
              rules={cascadeRules.filter(r => r.fromDefinitionType === defType.code)}
              onRuleChange={handleRuleChange}
            />
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Cascade Preview</h3>
        <CascadeFlowPreview 
          config={tenantConfig}
          rules={cascadeRules}
          sampleData={sampleDefinitions}
        />
      </div>
    </div>
  );
};
```

---

## Phase 2: Enhanced Workflow & Advanced Flexibility (8-10 weeks)

### Week 11-12: Dynamic UI Adaptation & Configuration Management
**Goals:** Build UI that adapts to tenant's flexible configuration and provide advanced configuration tools

**Deliverables:**
- [x] Dynamic navigation based on active levels and definition types
- [x] Adaptive forms and wizards
- [x] Configuration migration tools
- [x] Framework template library (OKR, BSC, Custom, etc.)
- [x] Advanced validation for flexible configurations

**Key Features:**
- **Adaptive Navigation:** Menu items appear/disappear based on tenant configuration
- **Dynamic Forms:** Auto-generated forms with custom attributes and validation
- **Configuration Templates:** Pre-built frameworks for quick setup
- **Migration Wizards:** Help convert between different frameworks

**UX Components:**
```typescript
// Adaptive Navigation System
const AdaptiveNavigation = () => {
  const activeLevels = useActiveLevels();
  const activeDefinitions = useActiveDefinitionTypes();
  
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-8">
          <NavItem to="/dashboard" label="Dashboard" />
          
          {/* Show level-specific navigation */}
          {activeLevels.map(level => (
            <NavItem 
              key={level.id}
              to={`/${level.code.toLowerCase()}`}
              label={level.name}
            />
          ))}
          
          {/* Show definition-type specific navigation */}
          {activeDefinitions.map(defType => (
            <NavItem 
              key={defType.id}
              to={`/${defType.code.toLowerCase()}`}
              label={defType.name}
            />
          ))}
          
          <NavItem to="/reports" label="Reports" />
          <NavItem to="/settings" label="Settings" />
        </div>
      </div>
    </nav>
  );
};

// Framework Template Selector
const FrameworkTemplateSelector = ({ onSelectTemplate }: { onSelectTemplate: (template: FrameworkTemplate) => void }) => {
  const templates: FrameworkTemplate[] = [
    {
      name: "OKR Framework",
      description: "Objectives and Key Results approach",
      levels: ["Organization", "Department", "Individual"],
      definitions: ["Objectives", "Key Results", "Targets"],
      previewImage: "/templates/okr-preview.png"
    },
    {
      name: "Balanced Scorecard",
      description: "Traditional BSC with four perspectives",
      levels: ["Organization", "Department", "Team", "Individual"],
      definitions: ["Perspectives", "Objectives", "KPIs", "Targets", "Initiatives"],
      previewImage: "/templates/bsc-preview.png"
    },
    {
      name: "Custom Framework",
      description: "Build your own performance framework",
      levels: ["Organization"], // minimum
      definitions: ["KPIs", "Targets"], // minimum
      previewImage: "/templates/custom-preview.png"
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {templates.map(template => (
        <div key={template.name} className="bg-white border rounded-lg p-6 hover:shadow-lg cursor-pointer">
          <img src={template.previewImage} alt={template.name} className="w-full h-32 object-cover rounded mb-4" />
          <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
          <p className="text-gray-600 mb-4">{template.description}</p>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Levels:</span> {template.levels.join(", ")}
            </div>
            <div className="text-sm">
              <span className="font-medium">Elements:</span> {template.definitions.join(", ")}
            </div>
          </div>
          <button 
            onClick={() => onSelectTemplate(template)}
            className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Use This Framework
          </button>
        </div>
      ))}
    </div>
  );
};
```

---

### Week 13-14: Enhanced Review & Approval Workflow
**Goals:** Implement flexible approval workflows that adapt to any organizational structure and definition types

**Deliverables:**
- [x] Multi-level approval workflows supporting any active level combination
- [x] Definition-type specific review processes
- [x] Adaptive review dashboard for any organizational structure
- [x] Flexible notification system based on active configuration
- [x] Bulk review operations for efficient processing

**Key Features:**
- **Flexible Workflow Configuration:** Define approval paths for any level/definition combination
- **Adaptive Review Dashboard:** Shows reviews relevant to user's active organizational context
- **Smart Routing:** Automatically routes reviews based on organizational structure
- **Custom Review Criteria:** Different review requirements for different definition types

**Enhanced Database Schema:**
```sql
CREATE TABLE flexible_workflow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  definition_type_id UUID REFERENCES definition_types(id),
  org_level_definition_id UUID REFERENCES level_definitions(id),
  approval_steps JSONB NOT NULL, -- flexible approval step configuration
  escalation_rules JSONB DEFAULT '{}',
  notification_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE definition_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actual_id UUID REFERENCES definition_actuals(id),
  reviewer_id UUID REFERENCES users(id),
  workflow_step INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'PENDING', 'APPROVED', 'RETURNED', 'ESCALATED'
  comments TEXT,
  decision_data JSONB DEFAULT '{}', -- additional review decision data
  due_date TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Week 15-16: Advanced Reporting & Analytics
**Goals:** Build comprehensive reporting system that adapts to any organizational structure and definition framework

**Deliverables:**
- [x] Dynamic dashboard generation based on active configuration
- [x] Flexible filtering for any level and definition type combination
- [x] Cross-definition type analysis and correlation reports
- [x] Adaptive export formats supporting custom frameworks
- [x] Advanced visualization for complex hierarchies

**Key Features:**
- **Adaptive Dashboards:** Auto-generate dashboards based on tenant's active configuration
- **Multi-Dimensional Analysis:** Analyze performance across any combination of levels and definitions
- **Custom Chart Types:** Visualization components that work with any hierarchy depth
- **Intelligent Insights:** AI-powered insights that understand custom frameworks

---

### Week 17-18: Enhanced Notifications & Integration Framework
**Goals:** Build notification and integration systems that work with flexible configurations

**Deliverables:**
- [x] Context-aware notification system
- [x] Flexible API endpoints supporting any tenant configuration
- [x] Custom webhook payloads based on active definitions
- [x] Integration templates for common systems
- [x] Dynamic import/export schemas

**Database Schema:**
```sql
CREATE TABLE flexible_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL,
  context_type VARCHAR(50) NOT NULL, -- 'DEFINITION', 'LEVEL', 'REVIEW', etc.
  context_id UUID NOT NULL, -- references various entities based on context_type
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  channels JSONB DEFAULT '[]', -- email, in-app, webhook, etc.
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE integration_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  integration_type VARCHAR(50) NOT NULL, -- 'IMPORT', 'EXPORT', 'WEBHOOK'
  source_system VARCHAR(100),
  definition_type_id UUID REFERENCES definition_types(id),
  level_definition_id UUID REFERENCES level_definitions(id),
  field_mappings JSONB NOT NULL,
  transformation_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 3: Advanced Features & Polish (8-10 weeks)

### Week 11-12: Review & Approval Workflow
**Goals:** Implement approval workflows and review management

**Deliverables:**
- [x] Workflow state management
- [x] Review dashboard for managers
- [x] Comment and feedback system
- [x] Email notifications

**Database Schema:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actual_id UUID REFERENCES kpi_actuals(id),
  reviewer_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL, -- 'PENDING', 'APPROVED', 'RETURNED'
  comments TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workflow_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  org_unit_type VARCHAR(20) NOT NULL,
  approval_steps JSONB NOT NULL, -- array of reviewer roles
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key UX Features:**
- **Review Dashboard:** Clean list of pending reviews
- **Quick Actions:** Approve/Return with one click
- **Batch Operations:** Review multiple items at once
- **Mobile-Friendly:** Responsive design for mobile reviews

---

### Week 13-14: Change Requests & Versioning
**Goals:** Enable KPI modifications with approval workflow

**Deliverables:**
- [x] Change request creation interface
- [x] Approval workflow for changes
- [x] Version history tracking
- [x] Effective date management

**Database Schema:**
```sql
CREATE TABLE change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  requestor_id UUID REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL, -- 'kpi', 'target', 'objective'
  entity_id UUID NOT NULL,
  proposed_changes JSONB NOT NULL,
  justification TEXT,
  status VARCHAR(20) DEFAULT 'PROPOSED', -- 'PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED'
  effective_date DATE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entity_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Week 15-16: Reporting & Basic Analytics
**Goals:** Build essential reporting and dashboard functionality

**Deliverables:**
- [x] Dashboard with RAG status overview
- [x] Variance analysis charts
- [x] Export functionality (PDF/Excel)
- [x] Filtering and drill-down capabilities

**UX Components:**
```typescript
// Dashboard Overview
const DashboardOverview = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="On Track" value="67%" color="green" />
        <MetricCard title="At Risk" value="23%" color="yellow" />
        <MetricCard title="Behind" value="10%" color="red" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart title="Performance Trends" />
        <RAGHeatmap title="Department Overview" />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <FilterPanel onFilter={handleFilter} />
        <KPITable data={filteredData} />
      </div>
    </div>
  );
};
```

---

### Week 17-18: Notifications & Basic Integrations
**Goals:** Implement notification system and CSV import/export

**Deliverables:**
- [x] Email notification system
- [x] In-app notification center
- [x] CSV import/export functionality
- [x] Basic API endpoints

**Database Schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  notification_types JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 3: Advanced Features & Polish (6-8 weeks)

### Week 19-20: Advanced Cascading & Formula Engine
**Goals:** Implement sophisticated cascading rules and calculated KPIs

**Deliverables:**
- [x] Weighted cascading allocation
- [x] Formula-based KPI calculations
- [x] Cascade impact visualization
- [x] Auto-rollup functionality

---

### Week 21-22: Enhanced Reporting & Analytics
**Goals:** Build comprehensive reporting suite

**Deliverables:**
- [x] Advanced dashboard customization
- [x] Scheduled reports
- [x] Comparative analysis tools
- [x] Trend forecasting

---

### Week 23-24: User Experience Improvements
**Goals:** Polish UX and add convenience features

**Deliverables:**
- [x] Improved onboarding flow
- [x] Contextual help system
- [x] Keyboard shortcuts
- [x] Mobile optimization

---

### Week 25-26: Security & Compliance
**Goals:** Enhance security and prepare for production

**Deliverables:**
- [x] Audit log system
- [x] Data retention policies
- [x] Security scanning
- [x] GDPR compliance features

---

## Phase 4: Enterprise Features & Scaling (8-10 weeks)

### Week 27-30: White-Label & Multi-Tenancy
**Goals:** Complete white-label SaaS functionality

**Deliverables:**
- [x] Full tenant theming system
- [x] Custom domain support
- [x] Email template customization
- [x] Report branding

---

### Week 31-34: Advanced Integrations
**Goals:** Build enterprise integration capabilities

**Deliverables:**
- [x] REST API with comprehensive documentation
- [x] Webhook system
- [x] SFTP file processing
- [x] BI tool connectors

---

### Week 35-38: Performance & Scalability
**Goals:** Optimize for large-scale deployment

**Deliverables:**
- [x] Performance optimization
- [x] Caching strategy
- [x] Database indexing
- [x] Load testing

---

## Technical Architecture Overview

### Frontend Architecture
```typescript
// State Management with Zustand
interface AppState {
  user: User | null;
  tenant: Tenant | null;
  currentOrgUnit: OrgUnit | null;
  kpis: KPI[];
  // ... other state
}

// API Layer with React Query
const useKPIs = (filters: KPIFilters) => {
  return useQuery({
    queryKey: ['kpis', filters],
    queryFn: () => api.getKPIs(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Component Structure
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components
├── pages/               # Page components
├── hooks/               # Custom hooks
├── services/            # API services
├── types/               # TypeScript types
└── utils/               # Utility functions
```

### Database Design Principles
- **Multi-tenant isolation:** All tables include tenant_id
- **Temporal data:** Effective dates for versioning
- **Audit trail:** Comprehensive logging
- **Performance:** Proper indexing strategy

### **Key UX Design Principles**
1. **Progressive Disclosure:** Show simple options first, advanced on demand
2. **Adaptive Interface:** UI adapts to tenant's active configuration automatically
3. **Framework Agnostic:** Support any performance management methodology
4. **Visual Hierarchy:** Clear information architecture for complex structures
5. **Consistent Patterns:** Reusable components work with any configuration
6. **Mobile-First:** Responsive design for all screen sizes and complexity levels
7. **Accessibility:** WCAG 2.1 AA compliance across all adaptive interfaces

### **Enhanced Success Metrics**
- Framework setup completion: > 90%
- User adoption across all active levels: > 85%
- Data entry completion rate: > 90%
- Custom definition usage: > 70% of tenants
- Page load times with complex configurations: < 3 seconds
- User satisfaction with flexibility: > 4.7/5
- System availability: > 99.9%

### **Key Technical Innovations**
1. **Universal Flexibility:** All levels and definition types are configurable
2. **Adaptive Cascading:** Automatic handling of any level/definition combination
3. **Dynamic UI Generation:** Forms and interfaces adapt to configuration
4. **Smart Skip-Level:** Intelligent cascading when intermediate levels are inactive
5. **Custom Definition Framework:** Support for unlimited custom performance frameworks
6. **Template-Based Setup:** Pre-built frameworks for quick implementation

This enhanced implementation plan provides ultimate flexibility while maintaining the core strengths of strategic alignment and measurement discipline. The system can now adapt to any organizational structure or performance management methodology while providing a consistent, intuitive user experience.
