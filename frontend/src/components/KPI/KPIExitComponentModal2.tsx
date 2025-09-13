'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

interface ExitComponentTemplate {
  id: string;
  componentName: string;
  componentType: string;
  sequenceOrder: number;
  orgLevel: {
    id: string;
    name: string;
    code: string;
  };
  exitRelationships: Array<{
    entryComponent: {
      id: string;
      componentName: string;
      orgLevel: {
        id: string;
        name: string;
      };
    };
  }>;
}

interface ExistingObjective {
  id: string;
  name: string;
  description?: string;
  parentExitComponentId?: string;
  createdAt: string;
}

interface KPIInfo {
  id: string;
  name: string;
  orgUnit: {
    id: string;
    name: string;
    levelDefinition: {
      id: string;
      name: string;
    };
  };
  level: {
    id: string;
    name: string;
  };
}

interface KPIExitComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  kpiId: string;
}

interface CreateExitComponentForm {
  name: string;
  description: string;
  parentExitComponentId?: string;
}

const KPIExitComponentModal: React.FC<KPIExitComponentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  kpiId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitComponents, setExitComponents] = useState<ExitComponentTemplate[]>([]);
  const [existingObjectives, setExistingObjectives] = useState<ExistingObjective[]>([]);
  const [kpiInfo, setKpiInfo] = useState<KPIInfo | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreateExitComponentForm>({
    name: '',
    description: '',
    parentExitComponentId: undefined
  });

  useEffect(() => {
    if (isOpen && kpiId) {
      fetchExitComponentData();
    }
  }, [isOpen, kpiId]);

  const fetchExitComponentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/kpis/${kpiId}/exit-components`);
      
      if (response.data) {
        const data = response.data as {
          exitComponents: ExitComponentTemplate[];
          existingObjectives: ExistingObjective[];
          kpi: KPIInfo;
        };
        setExitComponents(data.exitComponents || []);
        setExistingObjectives(data.existingObjectives || []);
        setKpiInfo(data.kpi || null);
      }
    } catch (err) {
      console.error('Error fetching exit component data:', err);
      setError('Failed to load exit component information');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExitComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post(`/kpis/${kpiId}/exit-components`, {
        name: form.name,
        description: form.description,
        parentExitComponentId: form.parentExitComponentId
      });

      // Reset form
      setForm({
        name: '',
        description: '',
        parentExitComponentId: undefined
      });
      setShowCreateForm(false);

      // Refresh data
      await fetchExitComponentData();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating exit component:', err);
      setError('Failed to create exit component. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setForm({
      name: '',
      description: '',
      parentExitComponentId: undefined
    });
    setError(null);
    onClose();
  };

  const getExitComponentDisplayName = (template: ExitComponentTemplate): string => {
    return template.componentName;
  };

  const getTargetLevelName = (template: ExitComponentTemplate): string => {
    if (template.exitRelationships.length > 0) {
      return template.exitRelationships[0].entryComponent.orgLevel.name;
    }
    return 'Next Level';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl px-6 py-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl sm:max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Manage Exit Components
              </h3>
              {kpiInfo && (
                <p className="text-sm text-gray-500 mt-1">
                  KPI: {kpiInfo.name} ({kpiInfo.orgUnit.name} - {kpiInfo.level.name})
                </p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Content */}
          {!loading && (
            <div className="space-y-6">
              {/* Available Exit Components */}
              {exitComponents.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Available Exit Components for this Level
                  </h4>
                  <div className="space-y-2">
                    {exitComponents.map(template => (
                      <div
                        key={template.id}
                        className="p-3 border border-gray-200 rounded-md bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {getExitComponentDisplayName(template)}
                            </h5>
                            <p className="text-sm text-gray-600">
                              Cascades to: {getTargetLevelName(template)}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                parentExitComponentId: template.id,
                                name: `${getExitComponentDisplayName(template)} for ${kpiInfo?.name || 'KPI'}`
                              }));
                              setShowCreateForm(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 flex items-center text-sm"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Objectives */}
              {existingObjectives.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Existing Exit Components
                  </h4>
                  <div className="space-y-2">
                    {existingObjectives.map(objective => (
                      <div
                        key={objective.id}
                        className="p-3 border border-green-200 rounded-md bg-green-50"
                      >
                        <h5 className="font-medium text-green-900">{objective.name}</h5>
                        {objective.description && (
                          <p className="text-sm text-green-700 mt-1">{objective.description}</p>
                        )}
                        <p className="text-xs text-green-600 mt-1">
                          Created: {new Date(objective.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Exit Components Available */}
              {!loading && exitComponents.length === 0 && existingObjectives.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-gray-500">
                    No exit components are available for this organizational level.
                  </p>
                </div>
              )}

              {/* Create Form */}
              {showCreateForm && (
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Create New Exit Component
                  </h4>
                  <form onSubmit={handleCreateExitComponent} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter exit component name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter description (optional)"
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {submitting ? 'Creating...' : 'Create Exit Component'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIExitComponentModal;
