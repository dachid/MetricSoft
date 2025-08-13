/**
 * Tenant-related TypeScript interfaces and types
 */

export interface TenantSettings {
  id?: string;
  tenantId?: string;
  terminology: {
    perspectives: string;
    objectives: string;
    kpis: string;
    targets: string;
    initiatives: string;
  };
  fiscalYearStart: string;
  periods: any[];
  branding: {
    primaryColor?: string;
    logoUrl?: string;
    companyName?: string;
  };
  setupCompleted: boolean;
  setupStep: number;
  tenant?: {
    name: string;
    subdomain: string;
  };
}

export interface Perspective {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'locked' | 'archived';
  isCurrent: boolean;
  confirmations: Array<{
    confirmationType: string;
    confirmedAt: string;
  }>;
  _count: {
    levelDefinitions: number;
    perspectives: number;
  };
}

export interface LevelDefinition {
  id: string;
  code: string;
  name: string;
  pluralName: string;
  hierarchyLevel: number;
  isStandard: boolean;
  isEnabled: boolean;
  icon?: string;
  color: string;
  metadata: Record<string, any>;
}

export interface TerminologyPreset {
  name: string;
  description: string;
  config: {
    perspectives: string;
    objectives: string;
    kpis: string;
    targets: string;
    initiatives: string;
  };
}

export interface PerformanceComponent {
  id?: string;
  componentType: 'perspective' | 'entry' | 'objective' | 'kpi' | 'target' | 'exit';
  componentName: string;
  isStandard: boolean;
  isMandatory: boolean;
  sequenceOrder: number;
  metadata?: Record<string, any>;
}

export interface PerformanceCascadeRelationship {
  id?: string;
  fromLevelId: string;
  toLevelId: string;
  exitComponentId: string;
  entryComponentId: string;
}
