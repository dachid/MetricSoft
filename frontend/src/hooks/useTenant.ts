/**
 * Tenant-related hooks for MetricSoft
 * Phase 1 implementation focusing on fiscal year management
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';

interface TenantSettings {
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

export function useTenantSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load tenant settings
  useEffect(() => {
    if (user?.tenantId) {
      loadTenantSettings();
    }
  }, [user?.tenantId]);

  const loadTenantSettings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading tenant settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Record<string, any>) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        return { success: true };
      }
      return { success: false, error: 'Failed to update settings' };
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      return { success: false, error: 'Failed to update settings' };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    settings,
    isLoading,
    isUpdating,
    updateSettings,
    refetch: loadTenantSettings
  };
}

export function useSetupWizard(totalSteps: number = 4) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return {
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    progressPercentage,
    showPreview,
    nextStep,
    prevStep,
    goToStep,
    togglePreview
  };
}

/**
 * Hook for managing fiscal years
 */
export function useFiscalYears() {
  const { user } = useAuth();
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load fiscal years
  useEffect(() => {
    if (user?.tenantId) {
      loadFiscalYears();
    }
  }, [user?.tenantId]);

  const loadFiscalYears = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user?.tenantId}/fiscal-years`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFiscalYears(data.fiscalYears || []);
        
        // Set current fiscal year (either explicitly current or the first one)
        const current = data.fiscalYears?.find((fy: any) => fy.isCurrent) || data.fiscalYears?.[0];
        setCurrentFiscalYear(current);
      }
    } catch (error) {
      console.error('Error loading fiscal years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fiscalYears,
    currentFiscalYear,
    isLoading,
    reloadFiscalYears: loadFiscalYears
  };
}
