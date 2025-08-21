'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/apiClient';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Palette, Upload, Eye, Save } from 'lucide-react';

interface BrandingSettings {
  primaryColor: string;
  logoUrl: string;
  companyName: string;
}

interface TenantSettings {
  id: string;
  tenantId: string;
  branding: BrandingSettings;
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

function BrandingContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<BrandingSettings>({
    primaryColor: '#3B82F6',
    logoUrl: '',
    companyName: ''
  });
  
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN');

  // Load available tenants for Super Admin
  useEffect(() => {
    const loadTenants = async () => {
      if (!isSuperAdmin) return;
      
      try {
        const response = await apiClient.get('/admin/tenants');
        if (response.success && response.data) {
          const tenants = Array.isArray(response.data) ? response.data : [];
          setAvailableTenants(tenants);
          if (tenants.length > 0 && !selectedTenantId) {
            setSelectedTenantId(tenants[0].id);
          }
        } else {
          setErrorMessage('Failed to load tenants');
        }
      } catch (error) {
        console.error('Error loading tenants:', error);
        setErrorMessage('Failed to load tenants');
      }
    };

    loadTenants();
  }, [isSuperAdmin, user]);

  // Load tenant settings
  useEffect(() => {
    const loadSettings = async () => {
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
        const response = await apiClient.get(`/tenants/${tenantIdToUse}/settings`);
        
        if (response.success && response.data) {
          setSettings(response.data as TenantSettings);
          const settingsData = response.data as TenantSettings;
          setFormData({
            primaryColor: settingsData.branding?.primaryColor || '#3B82F6',
            logoUrl: settingsData.branding?.logoUrl || '',
            companyName: settingsData.branding?.companyName || ''
          });
        } else {
          setErrorMessage(typeof response.error === 'string' ? response.error : response.error?.message || 'Failed to load branding settings');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setErrorMessage('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, selectedTenantId, isSuperAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const response = await apiClient.put(`/tenants/${tenantIdToUse}/settings`, {
        branding: formData
      });

      if (response.success && response.data) {
        setSettings(response.data as TenantSettings);
        setSuccessMessage('Branding settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(typeof response.error === 'string' ? response.error : response.error?.message || 'Failed to save branding settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setFormData({
      primaryColor: '#3B82F6',
      logoUrl: '',
      companyName: settings?.tenant.name || ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading branding settings...</p>
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
              <p className="text-sm text-blue-700 mt-1">Select an organization to manage its branding</p>
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
          <div className="text-gray-400 text-6xl mb-4">🎨</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
          <p className="text-gray-600">
            Please select an organization from the dropdown above to manage its branding settings.
          </p>
        </div>
      )}

      {/* Main Content */}
      {((isSuperAdmin && selectedTenantId) || (!isSuperAdmin && user?.tenantId)) && settings && (
        <>
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Brand Customization</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Customize the look and feel of your MetricSoft instance for {settings.tenant.name}.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>

          {/* Branding Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Company Name"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will appear in the navigation and page headers.
                </p>
              </div>

              {/* Primary Color */}
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    id="primaryColor"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="h-12 w-24 border border-gray-300 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This color will be used for buttons, links, and accent elements throughout the application.
                </p>
              </div>

              {/* Logo URL */}
              <div>
                <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                  {formData.logoUrl && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">Preview:</span>
                      <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
                        <img
                          src={formData.logoUrl}
                          alt="Logo preview"
                          className="h-8 max-w-32 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Recommended size: 200x50px. Supports PNG, JPG, and SVG formats.
                </p>
              </div>

              {/* Color Preview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Preview</h4>
                <div className="space-y-4">
                  {/* Header Preview */}
                  <div 
                    className="rounded-lg p-4 text-white"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {formData.logoUrl ? (
                          <img
                            src={formData.logoUrl}
                            alt="Logo"
                            className="h-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {formData.companyName ? formData.companyName.charAt(0) : 'M'}
                            </span>
                          </div>
                        )}
                        <span className="font-bold text-lg">
                          {formData.companyName || 'MetricSoft'}
                        </span>
                      </div>
                      <div className="text-sm opacity-90">Sample Header</div>
                    </div>
                  </div>

                  {/* Button Preview */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md text-white text-sm font-medium"
                      style={{ backgroundColor: formData.primaryColor }}
                    >
                      Primary Button
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md text-sm font-medium border"
                      style={{ 
                        borderColor: formData.primaryColor,
                        color: formData.primaryColor 
                      }}
                    >
                      Secondary Button
                    </button>
                  </div>

                  {/* Link Preview */}
                  <div>
                    <a 
                      href="#" 
                      className="text-sm font-medium hover:underline"
                      style={{ color: formData.primaryColor }}
                    >
                      Sample Link Text
                    </a>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Palette className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 mb-2">Branding Tips</h3>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>Choose colors that align with your organization's brand identity</li>
                  <li>Ensure sufficient contrast for accessibility (WCAG guidelines)</li>
                  <li>Test your logo on both light and dark backgrounds</li>
                  <li>Keep file sizes small for faster loading times</li>
                  <li>Consider how colors will look on different devices and screen sizes</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function BrandingPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Branding" subtitle="Customize your organization's appearance and brand identity">
        <BrandingContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
