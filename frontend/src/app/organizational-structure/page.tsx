'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { HierarchyConfiguration } from '@/components/features/HierarchyConfiguration';
import FiscalYearSelector from '@/components/FiscalYear/FiscalYearSelector';
import { Building2, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';

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

function OrganizationalStructureContent() {
  const { user } = useAuth();
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
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

  // Load fiscal years
  useEffect(() => {
    const loadFiscalYears = async () => {
      let tenantIdToUse;
      
      if (isSuperAdmin) {
        if (!selectedTenantId) {
          setLoading(false);
          return;
        }
        tenantIdToUse = selectedTenantId;
      } else {
        if (!user?.tenantId) {
          setLoading(false);
          return;
        }
        tenantIdToUse = user.tenantId;
      }
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');

        // Load fiscal years
        const fyResponse = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/fiscal-years`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Fiscal years response status:', fyResponse.status);
        
        if (fyResponse.ok) {
          const fyResult = await fyResponse.json();
          console.log('Fiscal years response:', fyResult);
          
          // Handle both array response and object with data property
          const fiscalYearsData = Array.isArray(fyResult) ? fyResult : (fyResult.data || []);
          console.log('Processed fiscal years:', fiscalYearsData);
          
          setFiscalYears(fiscalYearsData);
          // Auto-select current fiscal year
          const currentFY = fiscalYearsData.find((fy: FiscalYear) => fy.isCurrent);
          if (currentFY) {
            setSelectedFiscalYear(currentFY);
          } else if (fiscalYearsData.length > 0) {
            setSelectedFiscalYear(fiscalYearsData[0]);
          }
        } else {
          const errorText = await fyResponse.text();
          console.log('Fiscal years request failed:', fyResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error loading fiscal years:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFiscalYears();
  }, [user, selectedTenantId, isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading organizational structure...</p>
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
              <p className="text-sm text-blue-700 mt-1">Select an organization to manage its structure</p>
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
            Please select an organization from the dropdown above to manage its organizational structure.
          </p>
        </div>
      )}

      {/* Prerequisites Check */}
      {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && (
        <>
          {/* Check Fiscal Year Exists */}
          {fiscalYears.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <Calendar className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-amber-900 mb-2">Fiscal Year Required</h3>
                  <p className="text-amber-700 mb-4">
                    A fiscal year must be created before configuring the organizational structure.
                  </p>
                  <div className="flex items-center space-x-4">
                    <a
                      href="/fiscal-year"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Fiscal Years
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Only show if fiscal year exists */}
          {fiscalYears.length > 0 && (
            <>
              {/* Fiscal Year Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Organizational Structure</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure the organizational levels and hierarchy for your selected fiscal year.
                    </p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Fiscal Year
                  </label>
                  <div className="max-w-md">
                    <select
                      value={selectedFiscalYear?.id || ''}
                      onChange={(e) => {
                        const fy = fiscalYears.find(f => f.id === e.target.value);
                        setSelectedFiscalYear(fy || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a fiscal year...</option>
                      {fiscalYears.map((fy) => (
                        <option key={fy.id} value={fy.id}>
                          {fy.name} ({fy.status}) {fy.isCurrent ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedFiscalYear && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
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
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hierarchy Configuration */}
              {selectedFiscalYear && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Hierarchy Configuration - {selectedFiscalYear.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure the organizational levels for this fiscal year. This defines your hierarchy structure.
                    </p>
                  </div>
                  
                  <HierarchyConfiguration 
                    tenantId={selectedTenantId || user?.tenantId || ''}
                    fiscalYearId={selectedFiscalYear.id}
                    onSuccess={setSuccessMessage}
                    onError={setErrorMessage}
                  />
                </div>
              )}

              {/* Next Steps */}
              {selectedFiscalYear && selectedFiscalYear._count.levelDefinitions > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <p className="text-sm text-gray-600">Configure performance management for each level</p>
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
        </>
      )}
    </div>
  );
}

export default function OrganizationalStructurePage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Organizational Structure" subtitle="Configure organizational levels and hierarchy">
        <OrganizationalStructureContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
