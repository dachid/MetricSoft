# **MetricSoft Performance Components Implementation Plan**

## **📋 Implementation Overview**

### **Phase 1**: Fiscal Year-Scoped Organizational Structure
### **Phase 2**: Performance Components Configuration System
### **Phase 3**: Integration and Advanced Features

---

## **🚀 Phase 1: Fiscal Year-Scoped Organizational Structure**

### **1.1 Database Schema Updates**

#### **New Tables:**
```sql
-- Fiscal years management
fiscal_years (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL, -- "FY 2025", "2025", etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'locked', 'archived'
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fiscal year org structures (replaces global level_definitions)
fiscal_year_level_definitions (
    id TEXT PRIMARY KEY,
    fiscal_year_id TEXT REFERENCES fiscal_years(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- ORGANIZATION, DEPARTMENT, etc.
    name TEXT NOT NULL,
    plural_name TEXT NOT NULL,
    hierarchy_level INTEGER NOT NULL,
    is_standard BOOLEAN DEFAULT true,
    is_enabled BOOLEAN DEFAULT true,
    icon TEXT,
    color TEXT DEFAULT '#6B7280',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fiscal_year_id, code),
    UNIQUE(fiscal_year_id, hierarchy_level)
);

-- Fiscal year org structure confirmation
fiscal_year_confirmations (
    id TEXT PRIMARY KEY,
    fiscal_year_id TEXT REFERENCES fiscal_years(id),
    confirmation_type VARCHAR(50) NOT NULL, -- 'org_structure', 'performance_components'
    confirmed_by TEXT REFERENCES users(id),
    confirmed_at TIMESTAMPTZ NOT NULL,
    can_modify BOOLEAN DEFAULT false
);
```

#### **Migration Strategy:**
```sql
-- Auto-migrate existing org structures to FY 2025
INSERT INTO fiscal_years (tenant_id, name, start_date, end_date, status, is_current)
SELECT DISTINCT tenant_id, 'FY 2025', '2025-01-01', '2025-12-31', 'draft', true
FROM level_definitions;

-- Migrate level definitions to fiscal year scope
INSERT INTO fiscal_year_level_definitions 
SELECT 
    gen_random_uuid()::text,
    fy.id as fiscal_year_id,
    ld.code,
    ld.name,
    ld.plural_name,
    ld.hierarchy_level,
    ld.is_standard,
    ld.is_enabled,
    ld.icon,
    ld.color,
    ld.metadata,
    NOW()
FROM level_definitions ld
JOIN fiscal_years fy ON ld.tenant_id = fy.tenant_id;
```

### **1.2 Backend API Updates**

#### **New API Endpoints:**
```typescript
// Fiscal Year Management
GET    /api/tenants/{id}/fiscal-years
POST   /api/tenants/{id}/fiscal-years
PUT    /api/tenants/{id}/fiscal-years/{fyId}
DELETE /api/tenants/{id}/fiscal-years/{fyId} // Super Admin only

// Fiscal Year Org Structure
GET    /api/tenants/{id}/fiscal-years/{fyId}/org-structure
PUT    /api/tenants/{id}/fiscal-years/{fyId}/org-structure
POST   /api/tenants/{id}/fiscal-years/{fyId}/org-structure/confirm
POST   /api/tenants/{id}/fiscal-years/{fyId}/org-structure/copy-from/{sourceFyId}

// Level Definitions (now fiscal year scoped)
GET    /api/tenants/{id}/fiscal-years/{fyId}/level-definitions
PUT    /api/tenants/{id}/fiscal-years/{fyId}/level-definitions
```

### **1.3 Frontend Components**

#### **1.3.1 Fiscal Year Management**
```typescript
// Components to create:
components/
├── FiscalYear/
│   ├── FiscalYearSelector.tsx
│   ├── FiscalYearCreator.tsx  
│   ├── FiscalYearManager.tsx
│   └── FiscalYearStatus.tsx
```

#### **1.3.2 Updated Hierarchy Configuration**
```typescript
// Update existing component:
components/features/HierarchyConfiguration.tsx
// Add fiscal year context and scoping
```

### **1.4 Phase 1 Implementation Steps**

1. **Database Migration** (Week 1)
   - Create new fiscal year tables
   - Migrate existing org structures to FY 2025
   - Add confirmation tracking

2. **Backend APIs** (Week 1-2)
   - Fiscal year CRUD operations
   - Updated level definitions APIs (fiscal year scoped)
   - Confirmation endpoints

3. **Frontend Foundation** (Week 2)
   - Fiscal year selector component
   - Updated hierarchy configuration with FY context
   - Confirmation workflow

4. **Testing & Integration** (Week 2)
   - API testing
   - Frontend integration testing
   - Migration validation

---

## **🎯 Phase 2: Performance Components Configuration System**

### **2.1 Database Schema - Performance Components**

```sql
-- Performance component templates
performance_component_templates (
    id TEXT PRIMARY KEY,
    fiscal_year_id TEXT REFERENCES fiscal_years(id),
    org_level_id TEXT REFERENCES fiscal_year_level_definitions(id),
    component_type VARCHAR(50) NOT NULL, -- 'perspective', 'entry', 'objective', 'kpi', 'target', 'exit'
    component_name TEXT NOT NULL, -- Custom terminology
    is_standard BOOLEAN DEFAULT false,
    is_mandatory BOOLEAN DEFAULT false,
    sequence_order INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fiscal_year_id, org_level_id, component_type)
);

-- Cascade relationships between levels
performance_cascade_relationships (
    id TEXT PRIMARY KEY,
    fiscal_year_id TEXT REFERENCES fiscal_years(id),
    from_level_id TEXT REFERENCES fiscal_year_level_definitions(id),
    to_level_id TEXT REFERENCES fiscal_year_level_definitions(id),
    exit_component_id TEXT REFERENCES performance_component_templates(id),
    entry_component_id TEXT REFERENCES performance_component_templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perspectives (global for fiscal year)
fiscal_year_perspectives (
    id TEXT PRIMARY KEY,
    fiscal_year_id TEXT REFERENCES fiscal_years(id),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2.2 Backend API - Performance Components**

#### **API Endpoints:**
```typescript
// Performance Components Management
GET    /api/tenants/{id}/fiscal-years/{fyId}/performance-components
PUT    /api/tenants/{id}/fiscal-years/{fyId}/performance-components
POST   /api/tenants/{id}/fiscal-years/{fyId}/performance-components/confirm
POST   /api/tenants/{id}/fiscal-years/{fyId}/performance-components/copy-from/{sourceFyId}

// Perspectives Management  
GET    /api/tenants/{id}/fiscal-years/{fyId}/perspectives
POST   /api/tenants/{id}/fiscal-years/{fyId}/perspectives
PUT    /api/tenants/{id}/fiscal-years/{fyId}/perspectives/{perspectiveId}
DELETE /api/tenants/{id}/fiscal-years/{fyId}/perspectives/{perspectiveId}

// Cascade Preview
GET    /api/tenants/{id}/fiscal-years/{fyId}/performance-cascade-preview
```

### **2.3 Frontend Components - Performance Components**

#### **Component Structure:**
```typescript
components/
├── PerformanceComponents/
│   ├── PerformanceComponentsManager.tsx     // Main container
│   ├── LevelSelector.tsx                    // Select org level to configure
│   ├── ComponentBuilder.tsx                 // Configure components per level
│   ├── TerminologyEditor.tsx                // Rename components
│   ├── CascadeVisualizer.tsx                // Show flow between levels
│   ├── PerspectiveManager.tsx               // Manage perspectives
│   └── ComponentConfirmation.tsx            // Review & confirm
```

### **2.4 Phase 2 Implementation Steps**

1. **Database Schema** (Week 3)
   - Performance components tables
   - Cascade relationships
   - Perspectives management

2. **Backend APIs** (Week 3-4)
   - Performance components CRUD
   - Cascade logic
   - Validation rules

3. **Frontend Components** (Week 4-5)
   - Performance components manager
   - Level-by-level configuration
   - Cascade visualization

4. **Integration** (Week 5)
   - Connect to fiscal year system
   - Confirmation workflow
   - Validation and preview

---

## **🔗 Phase 3: Integration and Advanced Features**

### **3.1 Settings Page Integration**

#### **Updated Settings Navigation:**
```typescript
// Update existing settings page
src/app/settings/page.tsx

// Add new tabs:
tabs = [
  { id: 'fiscal-year', name: 'Fiscal Year', icon: Calendar },
  { id: 'org-structure', name: 'Organizational Structure', icon: Building2 },
  { id: 'performance-components', name: 'Performance Components', icon: Target },
  { id: 'users', name: 'Users & Permissions', icon: Users }
];
```

### **3.2 Copy Functionality**

#### **Selective Copy Features:**
```typescript
// Copy org structure from previous FY
POST /api/tenants/{id}/fiscal-years/{fyId}/copy-org-structure/{fromFyId}

// Copy performance components from previous FY  
POST /api/tenants/{id}/fiscal-years/{fyId}/copy-performance-components/{fromFyId}

// Frontend copy wizard
components/FiscalYear/CopyWizard.tsx
```

### **3.3 Validation and Business Rules**

#### **Validation Rules:**
- Fiscal year cannot be deleted if confirmed
- Org structure must be confirmed before performance components setup
- Standard components (Objective→KPI→Target) always mandatory
- Cascade integrity validation
- Super Admin override capabilities

### **3.4 Phase 3 Implementation Steps**

1. **Settings Integration** (Week 6)
   - Update settings page navigation
   - Integrate fiscal year, org structure, and performance components

2. **Copy Functionality** (Week 6)
   - Copy org structure wizard
   - Copy performance components wizard
   - Selective copying interface

3. **Validation & Business Rules** (Week 7)
   - Confirmation workflows
   - Business rule validation
   - Super Admin controls

4. **Testing & Polish** (Week 7-8)
   - End-to-end testing
   - User experience polish
   - Documentation

---

## **📊 Implementation Timeline**

| **Phase** | **Duration** | **Key Deliverables** | **Dependencies** |
|-----------|-------------|---------------------|-----------------|
| **Phase 1** | 2 weeks | Fiscal Year-Scoped Org Structure | Database migration |
| **Phase 2** | 3 weeks | Performance Components System | Phase 1 complete |
| **Phase 3** | 2 weeks | Integration & Advanced Features | Phase 1 & 2 complete |
| **Total** | **7 weeks** | Complete Performance Components System | - |

## **🎯 Success Criteria**

### **Functional Requirements:**
- ✅ Fiscal year management (create, select, confirm, delete)
- ✅ Fiscal year-scoped organizational structure
- ✅ Performance components configuration per org level
- ✅ Cascade flow visualization and validation
- ✅ Terminology customization
- ✅ Confirmation locking mechanism
- ✅ Selective copying between fiscal years
- ✅ Super Admin controls

### **Technical Requirements:**
- ✅ Database migration from global to fiscal year scoping
- ✅ API backwards compatibility during migration
- ✅ Performance optimization for multi-FY data
- ✅ Data integrity and validation rules
- ✅ User experience continuity

---

## **📝 Key Decisions Made**

### **Architecture Decisions:**
1. **Fiscal Year Scoping**: Both organizational structure AND performance components scoped to fiscal years
2. **Auto Migration**: Existing org structures automatically migrated to "FY 2025"
3. **Selective Copying**: Separate copy functionality for org structure and performance components
4. **Separate Confirmation**: Lock org structure first, then performance components separately
5. **Explicit FY Setup**: Require explicit fiscal year setup (no defaults)

### **Business Rules:**
1. **Standard Components**: Objective → KPI → Target always mandatory at every level
2. **Perspectives**: Set once per fiscal year, inherited (read-only) by all levels
3. **Cascade Logic**: Exit component from Level N = Entry component for Level N+1
4. **Confirmation Locking**: Once confirmed, configurations cannot be modified (except by Super Admin)
5. **Data Integrity**: Deleting fiscal year = ALL related data lost

### **User Experience:**
1. **Progressive Setup**: Fiscal Year → Org Structure → Performance Components
2. **Visual Validation**: Real-time cascade preview and validation
3. **Terminology Freedom**: All component names can be customized per organization
4. **Copy Wizards**: Easy replication from previous fiscal years
5. **Clear Status**: Always visible confirmation status and next steps

**This implementation plan provides a comprehensive roadmap for building MetricSoft's sophisticated Performance Components system, transforming it into a truly enterprise-ready performance management platform.**
