'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import FiscalYearSelector from '@/components/FiscalYear/FiscalYearSelector';
import FiscalYearCreator from '@/components/FiscalYear/FiscalYearCreator';
import { Calendar, Building2, AlertTriangle, ArrowRight } from 'lucide-react';

interface FiscalYear {
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

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

function FiscalYearContent() {
  const { user } = useAuth();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null);
  const [showFiscalYearCreator, setShowFiscalYearCreator] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [hasOrganization, setHasOrganization] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN');

  // Load available tenants for Super Admin
  useEffect(() => {
    const loadTenants = async () => {
      if (!isSuperAdmin) return;
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`http://localhost:5000/api/admin/tenants`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setAvailableTenants(result.data);
          if (result.data.length > 0 && !selectedTenantId) {
            setSelectedTenantId(result.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
        setErrorMessage('Failed to load tenants');
      }
    };

    loadTenants();
  }, [isSuperAdmin, user]);

  // Check if organization exists
  useEffect(() => {
    const checkOrganization = async () => {
      console.log('🔍 [DEBUG] Starting organization check...');
      
      let tenantIdToUse;
      
      if (isSuperAdmin) {
        console.log('👑 [DEBUG] User is Super Admin');
        if (!selectedTenantId) {
          console.log('❌ [DEBUG] No tenant selected for Super Admin, stopping check');
          setLoading(false);
          return;
        }
        tenantIdToUse = selectedTenantId;
        console.log('🏢 [DEBUG] Using selected tenant ID:', tenantIdToUse);
      } else {
        console.log('👤 [DEBUG] User is Organizational Admin');
        if (!user?.tenantId) {
          console.log('❌ [DEBUG] No tenant ID found for user, stopping check');
          setLoading(false);
          return;
        }
        tenantIdToUse = user.tenantId;
        console.log('🏢 [DEBUG] Using user tenant ID:', tenantIdToUse);
      }
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        console.log('🔑 [DEBUG] Token exists:', !!token);
        console.log('🔑 [DEBUG] Token value (first 20 chars):', token?.substring(0, 20));
        
        console.log('🚀 [DEBUG] Making API call to:', `http://localhost:5000/api/tenants/${tenantIdToUse}/settings`);
        
        // Check if the tenant/organization exists by trying to fetch tenant settings
        const tenantResponse = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📡 [DEBUG] Response status:', tenantResponse.status);
        console.log('📡 [DEBUG] Response ok:', tenantResponse.ok);
        console.log('📡 [DEBUG] Response headers:', Object.fromEntries(tenantResponse.headers.entries()));
        
        if (tenantResponse.ok) {
          const tenantResult = await tenantResponse.json();
          console.log('✅ [DEBUG] Tenant response data:', tenantResult);
          
          // Check if tenant data exists (organization exists)
          const hasOrg = !!tenantResult.data;
          console.log('🏢 [DEBUG] Has organization:', hasOrg);
          console.log('🏢 [DEBUG] tenantResult.success:', tenantResult.success);
          console.log('🏢 [DEBUG] tenantResult.data:', tenantResult.data);
          
          // If we have tenant data, the organization exists
          setHasOrganization(hasOrg);
        } else {
          const errorText = await tenantResponse.text();
          console.log('❌ [DEBUG] Tenant settings request failed:', tenantResponse.status, errorText);
          setHasOrganization(false);
        }
      } catch (error) {
        console.error('💥 [DEBUG] Error checking organization:', error);
        setHasOrganization(false);
      } finally {
        console.log('🏁 [DEBUG] Setting loading to false');
        setLoading(false);
      }
    };

    console.log('🔄 [DEBUG] Organization check useEffect triggered');
    console.log('🔄 [DEBUG] Dependencies - user:', user?.email, 'selectedTenantId:', selectedTenantId, 'isSuperAdmin:', isSuperAdmin);
    checkOrganization();
  }, [user, selectedTenantId, isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fiscal year information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Organization Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Super Admin - Organization Management</h3>
              <p className="text-sm text-blue-700 mt-1">Select an organization to manage its fiscal years</p>
            </div>
            <div className="min-w-64">
              <label htmlFor="tenant-select" className="block text-sm font-medium text-blue-900 mb-2">
                Select Organization
              </label>
              <select
                id="tenant-select"
                value={selectedTenantId || ''}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an organization...</option>
                {availableTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.subdomain})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no organization selected for Super Admin */}
      {isSuperAdmin && !selectedTenantId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
          <p className="text-gray-600">
            Please select an organization from the dropdown above to manage its fiscal years.
          </p>
        </div>
      )}

      {/* Check Organization Prerequisites */}
      {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && !hasOrganization && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-amber-900 mb-2">Organization Setup Required</h3>
              <p className="text-amber-700 mb-4">
                Before managing fiscal years, an organization must be created and configured.
              </p>
              {isSuperAdmin ? (
                <div className="flex items-center space-x-4">
                  <a
                    href="/organization/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Create Organization
                  </a>
                  <a
                    href="/settings"
                    className="inline-flex items-center px-4 py-2 border border-amber-300 text-sm font-medium rounded-md text-amber-700 bg-white hover:bg-amber-50"
                  >
                    Go to Settings
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </div>
              ) : (
                <div className="bg-amber-100 rounded-md p-4">
                  <p className="text-sm text-amber-800 mb-3">
                    <strong>Note:</strong> You don't have permissions to create an organization. Please reach out to your site administrator.
                  </p>
                  <p className="text-xs text-amber-700">
                    Contact your system administrator to set up the organization before managing fiscal years.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Year Management Content - Only show if organization exists */}
      {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && hasOrganization && (
        <>
          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Fiscal Year Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage fiscal years for your organization. All organizational structures and performance components are scoped to fiscal years.
                </p>
              </div>
              <button
                onClick={() => setShowFiscalYearCreator(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Create New Fiscal Year
              </button>
            </div>
            
            {/* Fiscal Year Selector */}
            <div className="space-y-4">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Current Fiscal Year</h4>
                <FiscalYearSelector
                  tenantId={selectedTenantId || user?.tenantId || ''}
                  selectedFiscalYear={selectedFiscalYear}
                  onFiscalYearChange={setSelectedFiscalYear}
                  onCreateNew={() => setShowFiscalYearCreator(true)}
                  className="max-w-md"
                />
              </div>

              {selectedFiscalYear && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-blue-900">{selectedFiscalYear.name}</h5>
                      <p className="text-sm text-blue-600 mt-1">
                        {new Date(selectedFiscalYear.startDate).toLocaleDateString()} - {new Date(selectedFiscalYear.endDate).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-blue-600">
                        <span>Status: <strong className="capitalize">{selectedFiscalYear.status}</strong></span>
                        <span>Org Levels: <strong>{selectedFiscalYear._count.levelDefinitions}</strong></span>
                        <span>Perspectives: <strong>{selectedFiscalYear._count.perspectives}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          {selectedFiscalYear && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/organizational-structure"
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-gray-900">Organizational Structure</h4>
                      <p className="text-sm text-gray-600">Configure organizational levels and hierarchy</p>
                    </div>
                  </div>
                </a>
                
                <a
                  href="/performance-components"
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900">Performance Components</h4>
                      <p className="text-sm text-gray-600">Set up performance management system</p>
                    </div>
                  </div>
                </a>
                
                <a
                  href="/perspectives"
                  className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-gray-900">Perspectives</h4>
                      <p className="text-sm text-gray-600">Manage strategic perspectives</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fiscal Year Creator Modal */}
      <FiscalYearCreator
        tenantId={selectedTenantId || user?.tenantId || ''}
        isOpen={showFiscalYearCreator}
        onClose={() => setShowFiscalYearCreator(false)}
        onFiscalYearCreated={(newFiscalYear) => {
          const extendedFiscalYear: FiscalYear = {
            ...newFiscalYear,
            status: newFiscalYear.status as 'draft' | 'active' | 'locked' | 'archived',
            confirmations: [],
            _count: {
              levelDefinitions: 0,
              perspectives: 0
            }
          };
          setSelectedFiscalYear(extendedFiscalYear);
          setShowFiscalYearCreator(false);
          setSuccessMessage(`Fiscal Year "${newFiscalYear.name}" created successfully!`);
          setTimeout(() => setSuccessMessage(''), 3000);
        }}
      />
    </div>
  );
}

export default function FiscalYearPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Fiscal Year Management" subtitle="Manage fiscal years and organizational timeline">
        <FiscalYearContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
