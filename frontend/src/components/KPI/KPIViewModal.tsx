'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

interface KPI {
  id: string;
  name: string;
  description?: string;
  perspective: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  userId: string;
  tenantId: string;
  fiscalYearId: string;
  exitComponentId?: string;
  isRecurring: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  dueDate?: string;
  
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  fiscalYear: {
    id: string;
    year: string;
    startDate: string;
    endDate: string;
  };
  exitComponent?: {
    id: string;
    name: string;
  };
  targets: KPITarget[];
  objectives: KPIObjective[];
  shares: KPIShare[];
  auditLogs: KPIAuditLog[];
}

interface KPITarget {
  id: string;
  type: 'NUMERIC' | 'STATUS' | 'PERCENTAGE';
  direction: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
  numericValue?: number;
  unit?: string;
  statusValue?: string;
  percentageValue?: number;
  isAchieved: boolean;
  achievedAt?: string;
  kpiId: string;
}

interface KPIObjective {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  kpiId: string;
}

interface KPIShare {
  id: string;
  sharedWithUserId: string;
  sharedWithUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  canEdit: boolean;
  canView: boolean;
  kpiId: string;
}

interface KPIAuditLog {
  id: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  kpiId: string;
}

interface KPIViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: KPI | null;
  onUpdate: (updatedKpi: KPI) => void;
  onDelete: (kpiId: string) => void;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function KPIViewModal({
  isOpen,
  onClose,
  kpi,
  onUpdate,
  onDelete
}: KPIViewModalProps) {
  const { user } = useAuth();
  const { terminology } = useTerminology();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !kpi) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/kpis/${kpi.id}`, {
        status: newStatus
      });
      
      if (response.success && response.data) {
        onUpdate(response.data as KPI);
      }
    } catch (error) {
      console.error('Error updating KPI status:', error);
      setError('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetToggle = async (targetId: string, isAchieved: boolean) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/kpis/${kpi.id}/targets/${targetId}`, {
        isAchieved,
        achievedAt: isAchieved ? new Date().toISOString() : null
      });
      
      if (response.success && response.data) {
        onUpdate(response.data as KPI);
      }
    } catch (error) {
      console.error('Error updating target:', error);
      setError('Failed to update target');
    } finally {
      setLoading(false);
    }
  };

  const handleObjectiveToggle = async (objectiveId: string, isCompleted: boolean) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/kpis/${kpi.id}/objectives/${objectiveId}`, {
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null
      });
      
      if (response.success && response.data) {
        onUpdate(response.data as KPI);
      }
    } catch (error) {
      console.error('Error updating objective:', error);
      setError('Failed to update objective');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this KPI? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.delete(`/api/kpis/${kpi.id}`);
      
      if (response.success) {
        onDelete(kpi.id);
        onClose();
      }
    } catch (error) {
      console.error('Error deleting KPI:', error);
      setError('Failed to delete KPI');
    } finally {
      setLoading(false);
    }
  };

  const completedTargets = kpi.targets.filter(t => t.isAchieved).length;
  const completedObjectives = kpi.objectives.filter(o => o.isCompleted).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {kpi.name}
                </h2>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[kpi.status]}`}>
                  {statusLabels[kpi.status]}
                </span>
              </div>
              <p className="text-gray-600 mb-3">
                {kpi.description || 'No description provided'}
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>Perspective: <strong>{kpi.perspective}</strong></span>
                <span>Fiscal Year: <strong>{kpi.fiscalYear.year}</strong></span>
                {kpi.exitComponent && (
                  <span>Exit Component: <strong>{kpi.exitComponent.name}</strong></span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'targets', label: `Targets (${completedTargets}/${kpi.targets.length})` },
              { id: 'objectives', label: `Objectives (${completedObjectives}/${kpi.objectives.length})` },
              { id: 'activity', label: 'Activity' },
              { id: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Target Progress</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {completedTargets} / {kpi.targets.length}
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${kpi.targets.length > 0 ? (completedTargets / kpi.targets.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Objective Progress</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {completedObjectives} / {kpi.objectives.length}
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${kpi.objectives.length > 0 ? (completedObjectives / kpi.objectives.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Key Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Key Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">{new Date(kpi.createdAt).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">{new Date(kpi.updatedAt).toLocaleDateString()}</dd>
                    </div>
                    {kpi.dueDate && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                        <dd className="text-sm text-gray-900">{new Date(kpi.dueDate).toLocaleDateString()}</dd>
                      </div>
                    )}
                    {kpi.isRecurring && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Frequency</dt>
                        <dd className="text-sm text-gray-900">{kpi.frequency}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Sharing</h3>
                  {kpi.shares.length > 0 ? (
                    <ul className="space-y-1">
                      {kpi.shares.map((share) => (
                        <li key={share.id} className="text-sm text-gray-600">
                          {share.sharedWithUser.firstName} {share.sharedWithUser.lastName}
                          <span className="text-gray-400 ml-2">
                            ({share.canEdit ? 'Can edit' : 'View only'})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Not shared with anyone</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'targets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Targets</h3>
                <span className="text-sm text-gray-500">
                  {completedTargets} of {kpi.targets.length} completed
                </span>
              </div>

              {kpi.targets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No targets defined for this KPI
                </div>
              ) : (
                <div className="space-y-3">
                  {kpi.targets.map((target) => (
                    <div
                      key={target.id}
                      className={`p-4 rounded-lg border ${
                        target.isAchieved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={target.isAchieved}
                              onChange={(e) => handleTargetToggle(target.id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {target.type === 'NUMERIC' && (
                                  <>
                                    {target.direction} to {target.numericValue} {target.unit}
                                  </>
                                )}
                                {target.type === 'PERCENTAGE' && (
                                  <>
                                    {target.direction} to {target.percentageValue}%
                                  </>
                                )}
                                {target.type === 'STATUS' && (
                                  <>
                                    {target.direction} to "{target.statusValue}"
                                  </>
                                )}
                              </div>
                              {target.achievedAt && (
                                <div className="text-sm text-green-600">
                                  Achieved on {new Date(target.achievedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          target.isAchieved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {target.isAchieved ? 'Achieved' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'objectives' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Objectives</h3>
                <span className="text-sm text-gray-500">
                  {completedObjectives} of {kpi.objectives.length} completed
                </span>
              </div>

              {kpi.objectives.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No objectives defined for this KPI
                </div>
              ) : (
                <div className="space-y-3">
                  {kpi.objectives.map((objective) => (
                    <div
                      key={objective.id}
                      className={`p-4 rounded-lg border ${
                        objective.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={objective.isCompleted}
                          onChange={(e) => handleObjectiveToggle(objective.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{objective.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{objective.description}</div>
                          {objective.completedAt && (
                            <div className="text-sm text-green-600 mt-1">
                              Completed on {new Date(objective.completedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          objective.isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {objective.isCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>
              
              {kpi.auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity recorded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {kpi.auditLogs.map((log) => (
                    <div key={log.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{log.action}</div>
                          {log.oldValue && log.newValue && (
                            <div className="text-sm text-gray-600 mt-1">
                              Changed from "{log.oldValue}" to "{log.newValue}"
                            </div>
                          )}
                          <div className="text-sm text-gray-500 mt-1">
                            by {log.user.firstName} {log.user.lastName}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status Management</h3>
                <div className="flex space-x-2">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => handleStatusChange(value)}
                      disabled={loading || kpi.status === value}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        kpi.status === value
                          ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete KPI'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone. The KPI and all associated data will be permanently deleted.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
