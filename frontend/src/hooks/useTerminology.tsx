'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/apiClient';

interface TerminologyConfig {
  // Raw database fields - no client-side logic
  [key: string]: string;
}

interface UseTerminologyResult {
  terminology: TerminologyConfig;
  isLoading: boolean;
  error: Error | null;
}

const defaultTerminology: TerminologyConfig = {
  // Database field names as they are stored
  perspectives: 'Perspective',
  perspectivesPlural: 'Perspectives',
  objectives: 'Objective', 
  objectivesPlural: 'Objectives',
  kpis: 'KPI',
  kpisPlural: 'KPIs',
  targets: 'Target',
  targetsPlural: 'Targets',
  performance: 'Performance',
  metrics: 'Metrics',
  dashboard: 'Dashboard',
  reports: 'Reports',
  orgUnits: 'Organizational Units',
  departments: 'Departments'
};

export function useTerminology(): UseTerminologyResult {
  const { user } = useAuth();
  
  // Super Admins always see standard terminology
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['terminology', user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId || isSuperAdmin) {
        return defaultTerminology;
      }
      
      try {
        const response = await apiClient.get(`/tenants/${user.tenantId}/settings`);
        const settings = response.data as { terminology?: Partial<TerminologyConfig> };
        if (settings?.terminology) {
          // Just merge the database values directly - no client-side logic
          return { ...defaultTerminology, ...settings.terminology };
        }
        return defaultTerminology;
      } catch (error) {
        console.warn('Failed to load custom terminology, using defaults:', error);
        return defaultTerminology;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    terminology: (data || defaultTerminology) as TerminologyConfig,
    isLoading,
    error: error as Error | null
  };
}