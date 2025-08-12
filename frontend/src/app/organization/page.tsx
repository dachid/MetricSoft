'use client';

import React, { useState, useEffect } from 'react';
import { OrganizationalStructure } from '@/components/features/OrganizationalStructure';
import { OrganizationSetupWizard } from '@/components/features/OrganizationSetupWizard';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, Button, Badge } from '@/components/ui';
import { 
  Building2, 
  Settings,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/lib/auth-context';

interface SetupStatus {
  isInitialized: boolean;
  hasLevelDefinitions: boolean;
  hasOrgUnits: boolean;
  levelDefinitionsCount: number;
  orgUnitsCount: number;
  configuredLevels: string[];
  customLevels: string[];
  initializedAt: string | null;
  nextSteps: Array<{
    step: string;
    title: string;
    description: string;
    required: boolean;
  }>;
}

interface ApiResponse {
  success: boolean;
  data?: SetupStatus;
  error?: {
    message: string;
  };
}

export default function OrganizationPage() {
  return (
    <ProtectedRoute requiredRoles={['ORGANIZATION_ADMIN']}>
      <OrganizationContent />
    </ProtectedRoute>
  );
}

function OrganizationContent() {
  const { user } = useAuth();
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only make API call when we have a valid user with a real tenant ID
    if (user && user.tenantId && user.tenantId !== 'temp-tenant-id') {
      checkSetupStatus();
    }
  }, [user?.tenantId]); // Depend on the actual user tenantId

  const checkSetupStatus = async () => {
    // Ensure we have a valid user and tenant ID before making the API call
    if (!user || !user.tenantId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/org-structure/setup-status`);
      const setupData = response.data as SetupStatus;
      setSetupStatus(setupData);
    } catch (err) {
      console.error('Error checking setup status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check setup status');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setShowWizard(false);
    checkSetupStatus(); // Refresh status
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading user...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card className="text-center p-6">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <div className="text-red-600 mb-2">Error loading organizational data</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={checkSetupStatus}>Retry</Button>
        </Card>
      </DashboardLayout>
    );
  }

  // Show setup wizard if not initialized or user explicitly requests it
  if (!setupStatus?.isInitialized || showWizard) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organization Setup</h1>
              <p className="text-gray-600 mt-1">
                Configure your organizational structure to get started
              </p>
            </div>
            {setupStatus?.isInitialized && (
              <Button
                variant="secondary"
                onClick={() => setShowWizard(false)}
              >
                Cancel Setup
              </Button>
            )}
          </div>
        </div>

        <OrganizationSetupWizard onComplete={handleSetupComplete} />
      </DashboardLayout>
    );
  }

  // Show main organizational structure management
  return (
    <DashboardLayout>
      {/* Header with status */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span>Organization</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your organizational structure and team assignments
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configured
            </Badge>
            <Button 
              variant="secondary"
              onClick={() => setShowWizard(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Reconfigure
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        {setupStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">
                {setupStatus.levelDefinitionsCount}
              </div>
              <div className="text-sm text-gray-600">Levels Defined</div>
            </Card>
            
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600">
                {setupStatus.orgUnitsCount}
              </div>
              <div className="text-sm text-gray-600">Units Created</div>
            </Card>
            
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">
                {setupStatus.configuredLevels.length}
              </div>
              <div className="text-sm text-gray-600">Enabled Levels</div>
            </Card>
            
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-orange-600">
                {setupStatus.customLevels.length}
              </div>
              <div className="text-sm text-gray-600">Custom Levels</div>
            </Card>
          </div>
        )}

        {/* Next steps if any */}
        {setupStatus?.nextSteps && setupStatus.nextSteps.length > 0 && (
          <Card className="mt-6 p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Recommended Next Steps</h3>
                <ul className="space-y-1">
                  {setupStatus.nextSteps.map((step, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{step.title}: {step.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Main organizational structure component */}
      <OrganizationalStructure />
    </DashboardLayout>
  );
}
