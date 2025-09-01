'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';
import { Save, RotateCcw, Eye } from 'lucide-react';

interface TerminologyEditForm {
  kpis: string;
  targets: string;
  objectives: string;
  initiatives: string;
  perspectives: string;
  performance: string;
  metrics: string;
  dashboard: string;
  reports: string;
  orgUnits: string;
  departments: string;
}

interface PerspectiveManagerProps {
  onTerminologyUpdate?: () => void;
}

export default function PerspectiveManager({ onTerminologyUpdate }: PerspectiveManagerProps) {
  const { user } = useAuth();
  const { terminology, isLoading } = useTerminology();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TerminologyEditForm>({
    kpis: '',
    targets: '',
    objectives: '',
    initiatives: '',
    perspectives: '',
    performance: '',
    metrics: '',
    dashboard: '',
    reports: '',
    orgUnits: '',
    departments: ''
  });
  const [previewMode, setPreviewMode] = useState(false);

  // Super Admins always see standard terminology and can't edit
  const isSuperAdmin = user?.roles?.some(role => role.code === 'SUPER_ADMIN');
  const canEdit = !isSuperAdmin && user?.roles?.some(role => role.code === 'ORGANIZATION_ADMIN');

  useEffect(() => {
    if (terminology) {
      setFormData({
        kpis: terminology.kpis || '',
        targets: terminology.targets || '',
        objectives: terminology.objectives || '',
        initiatives: terminology.initiatives || '',
        perspectives: terminology.perspectives || '',
        performance: terminology.performance || '',
        metrics: terminology.metrics || '',
        dashboard: terminology.dashboard || '',
        reports: terminology.reports || '',
        orgUnits: terminology.orgUnits || '',
        departments: terminology.departments || ''
      });
    }
  }, [terminology]);

  const handleInputChange = (field: keyof TerminologyEditForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!user?.tenantId) return;

    setIsSaving(true);
    try {
      await apiClient.put(`/api/tenants/${user.tenantId}/settings`, {
        terminology: formData
      });

      setIsEditing(false);
      onTerminologyUpdate?.();
      
      // Show success message
      alert('Terminology updated successfully!');
    } catch (error) {
      console.error('Failed to update terminology:', error);
      alert('Failed to update terminology. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (terminology) {
      setFormData({
        kpis: terminology.kpis || '',
        targets: terminology.targets || '',
        objectives: terminology.objectives || '',
        initiatives: terminology.initiatives || '',
        perspectives: terminology.perspectives || '',
        performance: terminology.performance || '',
        metrics: terminology.metrics || '',
        dashboard: terminology.dashboard || '',
        reports: terminology.reports || '',
        orgUnits: terminology.orgUnits || '',
        departments: terminology.departments || ''
      });
    }
    setIsEditing(false);
  };

  const handlePreviewToggle = () => {
    setPreviewMode(!previewMode);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading terminology settings...</span>
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Eye className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Super Admin View
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                As a Super Admin, you always see the standard terminology across all organizations.
                Organization Admins can customize terminology for their tenants.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Terminology Settings
          </h3>
          <p className="text-gray-600">
            You don't have permission to edit terminology settings.
            Contact your Organization Administrator for changes.
          </p>
        </div>
      </div>
    );
  }

  const terminologyFields = [
    { key: 'kpis' as keyof TerminologyEditForm, label: 'Key Performance Indicators', placeholder: 'e.g., KPIs, Metrics, Objectives' },
    { key: 'targets' as keyof TerminologyEditForm, label: 'Targets', placeholder: 'e.g., Targets, Goals, Benchmarks' },
    { key: 'objectives' as keyof TerminologyEditForm, label: 'Objectives', placeholder: 'e.g., Objectives, Goals, Aims' },
    { key: 'initiatives' as keyof TerminologyEditForm, label: 'Initiatives', placeholder: 'e.g., Initiatives, Projects, Actions' },
    { key: 'perspectives' as keyof TerminologyEditForm, label: 'Perspectives', placeholder: 'e.g., Perspectives, Dimensions, Areas' },
    { key: 'performance' as keyof TerminologyEditForm, label: 'Performance', placeholder: 'e.g., Performance, Results, Outcomes' },
    { key: 'metrics' as keyof TerminologyEditForm, label: 'Metrics', placeholder: 'e.g., Metrics, Measures, Indicators' },
    { key: 'dashboard' as keyof TerminologyEditForm, label: 'Dashboard', placeholder: 'e.g., Dashboard, Overview, Summary' },
    { key: 'reports' as keyof TerminologyEditForm, label: 'Reports', placeholder: 'e.g., Reports, Analytics, Insights' },
    { key: 'orgUnits' as keyof TerminologyEditForm, label: 'Organizational Units', placeholder: 'e.g., Departments, Teams, Units' },
    { key: 'departments' as keyof TerminologyEditForm, label: 'Departments', placeholder: 'e.g., Departments, Divisions, Teams' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Terminology Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Customize how performance management terms appear throughout your organization.
          </p>
        </div>
        <div className="flex space-x-3">
          {isEditing && (
            <>
              <button
                onClick={handleReset}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Terminology
            </button>
          )}
        </div>
      </div>

      {/* Preview Mode Toggle */}
      {isEditing && (
        <div className="flex items-center">
          <button
            onClick={handlePreviewToggle}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Eye className="w-4 h-4 mr-1" />
            {previewMode ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      )}

      {/* Preview Section */}
      {previewMode && isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">Preview: Navigation Items</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-white rounded px-3 py-2 border">📊 {formData.dashboard}</div>
            <div className="bg-white rounded px-3 py-2 border">📈 {formData.performance}</div>
            <div className="bg-white rounded px-3 py-2 border">📋 {formData.reports}</div>
            <div className="bg-white rounded px-3 py-2 border">🎯 My {formData.kpis}</div>
            <div className="bg-white rounded px-3 py-2 border">📝 Assigned {formData.kpis}</div>
            <div className="bg-white rounded px-3 py-2 border">🏢 {formData.orgUnits}</div>
          </div>
        </div>
      )}

      {/* Terminology Form */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Custom Terminology</h3>
          <p className="mt-1 text-sm text-gray-600">
            Define how your organization refers to key performance management concepts.
          </p>
        </div>
        
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {terminologyFields.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    id={field.key}
                    value={formData[field.key]}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                    {formData[field.key] || field.placeholder.split('e.g., ')[1]?.split(',')[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">
              Important Notes
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Changes will be reflected immediately across your organization's interface</li>
                <li>All users in your organization will see the new terminology</li>
                <li>Super Admins will continue to see standard terminology</li>
                <li>Consider communicating terminology changes to your team</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}