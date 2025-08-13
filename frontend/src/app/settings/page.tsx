'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { OrganizationalStructure } from '@/components/features/OrganizationalStructure';
import { HierarchyConfiguration } from '@/components/features/HierarchyConfiguration';
import { PerformanceComponentsManager } from '@/components/features/PerformanceComponentsManager';
import FiscalYearSelector from '@/components/FiscalYear/FiscalYearSelector';
import FiscalYearCreator from '@/components/FiscalYear/FiscalYearCreator';
import { Calendar, Building2, Target, Users } from 'lucide-react';

interface TenantSettings {
  id: string;
  tenantId: string;
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
  tenant: {
    name: string;
    subdomain: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

interface Perspective {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

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

function TenantSettingsContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'fiscal-year' | 'org-structure' | 'performance-components' | 'branding' | 'perspectives'>('fiscal-year');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Fiscal Year Management
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<FiscalYear | null>(null);
  const [showFiscalYearCreator, setShowFiscalYearCreator] = useState(false);
  
  // Super Admin specific state
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN');

  const [formData, setFormData] = useState({
    terminology: {
      perspectives: 'Perspectives',
      objectives: 'Objectives', 
      kpis: 'KPIs',
      targets: 'Targets',
      initiatives: 'Initiatives'
    },
    fiscalYearStart: '2025-01-01',
    branding: {
      primaryColor: '#3B82F6',
      logoUrl: '',
      companyName: ''
    }
  });

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
          // Auto-select first tenant if available
          if (result.data.length > 0 && !selectedTenantId) {
            setSelectedTenantId(result.data[0].id);
          }
        } else {
          console.error('Failed to load tenants');
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
      }
    };

    loadTenants();
  }, [isSuperAdmin, user]);

  // Load tenant settings
  useEffect(() => {
    const loadSettings = async () => {
      let tenantIdToUse;
      
      if (isSuperAdmin) {
        if (!selectedTenantId) return;
        tenantIdToUse = selectedTenantId;
      } else {
        if (!user?.tenantId) return;
        tenantIdToUse = user.tenantId;
      }
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setSettings(result.data);
          setFormData({
            terminology: result.data.terminology,
            fiscalYearStart: result.data.fiscalYearStart.split('T')[0],
            branding: result.data.branding
          });
        } else {
          const error = await response.json();
          setErrorMessage(error.error || 'Failed to load settings');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setErrorMessage('Failed to load settings');
      }
    };

    const loadPerspectives = async () => {
      let tenantIdToUse;
      
      if (isSuperAdmin) {
        if (!selectedTenantId) return;
        tenantIdToUse = selectedTenantId;
      } else {
        if (!user?.tenantId) return;
        tenantIdToUse = user.tenantId;
      }
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/perspectives`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setPerspectives(result.data);
        }
      } catch (error) {
        console.error('Error loading perspectives:', error);
      }
    };

    Promise.all([loadSettings(), loadPerspectives()])
      .finally(() => setLoading(false));
  }, [user, selectedTenantId, isSuperAdmin]);

  const handleSave = async () => {
    let tenantIdToUse;
    
    if (isSuperAdmin) {
      if (!selectedTenantId) return;
      tenantIdToUse = selectedTenantId;
    } else {
      if (!user?.tenantId) return;
      tenantIdToUse = user.tenantId;
    }
    
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPerspective = async () => {
    const name = prompt('Enter perspective name:');
    
    let tenantIdToUse;
    if (isSuperAdmin) {
      if (!selectedTenantId) return;
      tenantIdToUse = selectedTenantId;
    } else {
      if (!user?.tenantId) return;
      tenantIdToUse = user.tenantId;
    }
    
    if (!name) return;

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantIdToUse}/perspectives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name,
          description: '',
          color: '#3B82F6'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPerspectives([...perspectives, result.data]);
        setSuccessMessage('Perspective added successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to add perspective');
      }
    } catch (error) {
      console.error('Error adding perspective:', error);
      setErrorMessage('Failed to add perspective');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'fiscal-year', label: 'Fiscal Year', icon: '📅', description: 'Manage fiscal years and timeline' },
    { id: 'org-structure', label: 'Organizational Structure', icon: '🏢', description: 'Configure organizational levels' },
    { id: 'performance-components', label: 'Performance Components', icon: '🎯', description: 'Setup performance management system' },
    { id: 'branding', label: 'Branding', icon: '🎨', description: 'Customize your brand appearance' },
    { id: 'perspectives', label: 'Perspectives', icon: '👁️', description: 'Manage strategic perspectives' }
  ];

  return (
    <div className="space-y-6">
      {/* Organization Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Super Admin - Organization Management</h3>
              <p className="text-sm text-blue-700 mt-1">Select an organization to manage its settings</p>
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
          
          {selectedTenantId && settings && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex items-center space-x-4 text-sm text-blue-800">
                <span><strong>Managing:</strong> {settings.tenant.name}</span>
                <span><strong>Subdomain:</strong> {settings.tenant.subdomain}</span>
                <span><strong>Status:</strong> Active</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Show message if no organization selected for Super Admin */}
      {isSuperAdmin && !selectedTenantId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
          <p className="text-gray-600">
            Please select an organization from the dropdown above to manage its settings.
          </p>
        </div>
      )}

      {/* Settings Content - Only show if organization is selected (for Super Admin) or user has tenant */}
      {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && (
        <>
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

      {/* Overview Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {settings?.tenant.name} Configuration
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Customize your MetricSoft experience • Subdomain: {settings?.tenant.subdomain}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              settings?.setupCompleted 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {settings?.setupCompleted ? '✅ Setup Complete' : '⚠️ Setup Incomplete'}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Fiscal Year Management Tab */}
          {activeTab === 'fiscal-year' && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">Fiscal Year Management</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage fiscal years for your organization. All organizational structures and performance components are scoped to fiscal years.
                </p>
              </div>
              
              {/* Fiscal Year Selector */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-md font-medium text-gray-900">Current Fiscal Year</h4>
                  <button
                    onClick={() => setShowFiscalYearCreator(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Create New Fiscal Year
                  </button>
                </div>
                
                <FiscalYearSelector
                  tenantId={selectedTenantId || user?.tenantId || ''}
                  selectedFiscalYear={selectedFiscalYear}
                  onFiscalYearChange={setSelectedFiscalYear}
                  onCreateNew={() => setShowFiscalYearCreator(true)}
                  className="max-w-md"
                />

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
                          <span>Status: <strong>{selectedFiscalYear.status}</strong></span>
                          <span>Org Levels: <strong>{selectedFiscalYear._count.levelDefinitions}</strong></span>
                          <span>Perspectives: <strong>{selectedFiscalYear._count.perspectives}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              {selectedFiscalYear && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Next Steps</h5>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>1. Configure your organizational structure in the "Organizational Structure" tab</p>
                    <p>2. Set up performance components in the "Performance Components" tab</p>
                    <p>3. Customize terminology and perspectives as needed</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Organizational Structure Tab */}
          {activeTab === 'org-structure' && selectedFiscalYear && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Organizational Structure - {selectedFiscalYear.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure the organizational levels for this fiscal year. This defines your hierarchy structure.
                </p>
              </div>
              
              {/* Use the updated HierarchyConfiguration component */}
              <HierarchyConfiguration 
                tenantId={selectedTenantId || user?.tenantId || ''}
                fiscalYearId={selectedFiscalYear.id}
                onSuccess={setSuccessMessage}
                onError={setErrorMessage}
              />
            </div>
          )}

          {/* Performance Components Tab */}
          {activeTab === 'performance-components' && selectedFiscalYear && (
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Performance Components - {selectedFiscalYear.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Configure performance management components for each organizational level.
                </p>
              </div>
              
              <PerformanceComponentsManager 
                fiscalYearId={selectedFiscalYear.id}
                onComplete={() => {
                  // Handle completion - could show success message or redirect
                  console.log('Performance components configuration completed');
                }}
              />
            </div>
          )}

          {/* Message when no fiscal year selected */}
          {(activeTab === 'org-structure' || activeTab === 'performance-components') && !selectedFiscalYear && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Fiscal Year Selected</h3>
              <p className="text-gray-600 mb-6">
                Please select or create a fiscal year to manage organizational structure and performance components.
              </p>
              <button
                onClick={() => setActiveTab('fiscal-year')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Fiscal Year Management
              </button>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Brand Customization
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Customize the look and feel of your MetricSoft instance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.branding.companyName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branding: {
                          ...formData.branding,
                          companyName: e.target.value
                        }
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your Company Name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.branding.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          branding: {
                            ...formData.branding,
                            primaryColor: e.target.value
                          }
                        })
                      }
                      className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 font-mono">
                      {formData.branding.primaryColor || '#3B82F6'}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={formData.branding.logoUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        branding: {
                          ...formData.branding,
                          logoUrl: e.target.value
                        }
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500">
                    URL to your company logo (recommended size: 200x50px)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Perspectives Tab */}
          {activeTab === 'perspectives' && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Perspectives
                  </h3>
                  <p className="text-sm text-gray-600">
                    Manage your strategic perspectives.
                  </p>
                </div>
                <button
                  onClick={handleAddPerspective}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Perspective
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {perspectives.map((perspective) => (
                  <div key={perspective.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: perspective.color }}
                      ></div>
                      <h4 className="font-medium text-gray-900 truncate">{perspective.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {perspective.description || 'No description provided'}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">Code: {perspective.code}</span>
                      <span>#{perspective.sortOrder}</span>
                    </div>
                  </div>
                ))}
              </div>

              {perspectives.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">👁️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Perspectives Yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Start by adding your first strategic perspective to organize your performance metrics.
                  </p>
                  <button
                    onClick={handleAddPerspective}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Your First Perspective
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save Button for non-perspective tabs */}
          {activeTab === 'branding' && (
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fiscal Year Creator Modal */}
      <FiscalYearCreator
        tenantId={selectedTenantId || user?.tenantId || ''}
        isOpen={showFiscalYearCreator}
        onClose={() => setShowFiscalYearCreator(false)}
        onFiscalYearCreated={(newFiscalYear) => {
          // Convert the created fiscal year to our extended type
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
        }}
      />
        </>
      )}
    </div>
  );
}

export default function TenantSettingsPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Organization Settings" subtitle="Configure your MetricSoft experience">
        <TenantSettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
