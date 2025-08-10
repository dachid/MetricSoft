'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';

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

function TenantSettingsContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminology' | 'fiscal' | 'branding' | 'perspectives'>('terminology');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Load tenant settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.tenantId) return;
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`/api/tenants/${user.tenantId}/settings`, {
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
          showMessage('error', error.error || 'Failed to load settings');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        showMessage('error', 'Network error loading settings');
      }
    };

    const loadPerspectives = async () => {
      if (!user?.tenantId) return;
      
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`/api/tenants/${user.tenantId}/perspectives`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setPerspectives(result.data);
        } else {
          const error = await response.json();
          showMessage('error', error.error || 'Failed to load perspectives');
        }
      } catch (error) {
        console.error('Error loading perspectives:', error);
        showMessage('error', 'Network error loading perspectives');
      }
    };

    Promise.all([loadSettings(), loadPerspectives()])
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (!user?.tenantId) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user.tenantId}/settings`, {
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
        showMessage('success', 'Settings saved successfully!');
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPerspective = async () => {
    const name = prompt('Enter perspective name:');
    if (!name || !user?.tenantId) return;

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(`/api/tenants/${user.tenantId}/perspectives`, {
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
        showMessage('success', 'Perspective added successfully!');
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to add perspective');
      }
    } catch (error) {
      console.error('Error adding perspective:', error);
      showMessage('error', 'Network error adding perspective');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tenant settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'terminology', 
      label: 'Terminology', 
      icon: '📝',
      description: 'Customize naming conventions'
    },
    { 
      id: 'fiscal', 
      label: 'Fiscal Settings', 
      icon: '📅',
      description: 'Configure reporting periods'
    },
    { 
      id: 'branding', 
      label: 'Branding', 
      icon: '🎨',
      description: 'Customize appearance'
    },
    { 
      id: 'perspectives', 
      label: 'Perspectives', 
      icon: '👁️',
      description: 'Manage strategic views'
    }
  ];

  return (
    <>
      {/* Alert Messages */}
      {message && (
        <div className={`mb-6 rounded-md p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Overview Card */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {settings?.tenant.name} Configuration
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Subdomain: {settings?.tenant.subdomain} • Setup: {settings?.setupCompleted ? 'Complete' : 'In Progress'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              settings?.setupCompleted 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {settings?.setupCompleted ? '✅ Complete' : '⚠️ Setup Required'}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors duration-200
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{tab.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs text-gray-400 hidden sm:block">{tab.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Terminology Tab */}
          {activeTab === 'terminology' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Customize Terminology
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Rename core elements to match your organization's language and culture.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(formData.terminology).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          terminology: {
                            ...formData.terminology,
                            [key]: e.target.value
                          }
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Enter custom term for ${key}`}
                    />
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">🔍 Preview</h4>
                <p className="text-sm text-blue-700">
                  Your navigation will show: <span className="font-medium">{Object.values(formData.terminology).join(' • ')}</span>
                </p>
              </div>
            </div>
          )}

          {/* Fiscal Settings Tab */}
          {activeTab === 'fiscal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Fiscal Year Configuration
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Set your organization's fiscal year start date and reporting periods.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fiscal Year Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.fiscalYearStart}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fiscalYearStart: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    When does your fiscal year begin?
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reporting Frequency
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    How often do you collect performance data?
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Changing the fiscal year will affect all historical data views and reports. Please ensure this is correct before saving.</p>
                    </div>
                  </div>
                </div>
              </div>
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
                  Customize the look and feel of your MetricSoft instance to match your brand.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    URL to your company logo (recommended size: 200x50px)
                  </p>
                </div>
              </div>

              {/* Color Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Color Preview</h4>
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-16 h-16 rounded-lg shadow-sm border"
                    style={{ backgroundColor: formData.branding.primaryColor }}
                  ></div>
                  <div>
                    <p className="text-sm text-gray-600">This color will be used for:</p>
                    <ul className="text-xs text-gray-500 mt-1">
                      <li>• Navigation highlights</li>
                      <li>• Button backgrounds</li>
                      <li>• Chart accents</li>
                    </ul>
                  </div>
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
                    {formData.terminology.perspectives} Management
                  </h3>
                  <p className="text-sm text-gray-600">
                    Create and manage your strategic {formData.terminology.perspectives.toLowerCase()} for better organizational alignment.
                  </p>
                </div>
                <button
                  onClick={handleAddPerspective}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add {formData.terminology.perspectives.slice(0, -1)}</span>
                </button>
              </div>

              {perspectives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {perspectives.map((perspective) => (
                    <div key={perspective.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: perspective.color }}
                        ></div>
                        <h4 className="font-medium text-gray-900">{perspective.name}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          perspective.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {perspective.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {perspective.description || 'No description provided'}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {perspective.code}
                        </span>
                        <span>Sort: {perspective.sortOrder}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="text-gray-400 text-6xl mb-4">👁️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No {formData.terminology.perspectives} Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Get started by adding your first strategic {formData.terminology.perspectives.toLowerCase().slice(0, -1)} to organize your performance measurement framework.
                  </p>
                  <button
                    onClick={handleAddPerspective}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    Add Your First {formData.terminology.perspectives.slice(0, -1)}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Save Button for non-perspectives tabs */}
          {(activeTab === 'terminology' || activeTab === 'fiscal' || activeTab === 'branding') && (
            <div className="flex justify-end pt-6 border-t border-gray-200 mt-8">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function TenantSettingsPage() {
  return (
    <ProtectedRoute 
      requiredRoles={['SUPER_ADMIN', 'STRATEGY_TEAM']}
      fallbackUrl="/dashboard"
    >
      <DashboardLayout 
        title="Tenant Settings" 
        subtitle="Configure your MetricSoft tenant settings and customization options"
      >
        <TenantSettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
