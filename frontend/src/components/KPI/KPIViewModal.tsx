'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

interface KPI {
  id: string;
  name: string;
  description?: string;
  perspectiveId?: string;
  perspective?: {
    id: string;
    fiscalYearId: string;
    code: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    sequenceOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  evaluatorId: string;
  createdById: string;
  tenantId: string;
  fiscalYearId: string;
  orgUnitId: string;
  parentObjectiveId?: string;
  code: string;
  isRecurring: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  dueDate?: string;
  
  evaluator: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  orgUnit?: {
    id: string;
    name: string;
    code: string;
    levelDefinition?: {
      id: string;
      name: string;
    };
  };
  target?: KPITarget;
  parentObjective?: KPIObjective;
  shares: KPIShare[];
  auditLogs: KPIAuditLog[];
}

interface KPITarget {
  id: string;
  kpiId: string;
  currentValue: string;
  targetValue: string;
  targetType: 'NUMERIC' | 'STATUS' | 'PERCENTAGE';
  targetLabel?: string;
  targetDirection: 'INCREASING' | 'DECREASING' | 'MAINTAINING';
  isAchieved?: boolean;
  achievedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface KPIObjective {
  id: string;
  tenantId: string;
  fiscalYearId: string;
  orgUnitId: string;
  name: string;
  description: string;
  createdById: string;
  isCompleted?: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  active: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
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

  const handleStatusChange = async (newStatus: boolean) => {
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/kpis/${kpi.id}`, {
        isActive: newStatus
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

  const handleTargetToggle = async (isAchieved: boolean) => {
    if (!kpi.target) return;
    
    try {
      setLoading(true);
      const response = await apiClient.put(`/api/kpis/${kpi.id}/target`, {
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
    // This would need to be implemented if objectives functionality is needed
    console.log('Objective toggle not implemented yet', { objectiveId, isCompleted });
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

  // Calculate progress based on actual data structure
  const targetCompleted = kpi.target?.isAchieved ? 1 : 0;
  const totalTargets = kpi.target ? 1 : 0;
  
  // For now, objectives are not implemented in the current schema
  const completedObjectives = 0;
  const totalObjectives = 0;

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
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[kpi.isActive ? 'active' : 'inactive']}`}>
                  {statusLabels[kpi.isActive ? 'active' : 'inactive']}
                </span>
              </div>
              <p className="text-gray-600 mb-3">
                {kpi.description || 'No description provided'}
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>Perspective: <strong>{kpi.perspective?.name || 'None'}</strong></span>
                <span>Fiscal Year ID: <strong>{kpi.fiscalYearId}</strong></span>
                {kpi.orgUnit && (
                  <span>Org Unit: <strong>{kpi.orgUnit.name}</strong></span>
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
              { id: 'targets', label: `Target (${targetCompleted}/${totalTargets})` },
              { id: 'objectives', label: `Objectives (${completedObjectives}/${totalObjectives})` },
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
                    {targetCompleted} / {totalTargets}
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${totalTargets > 0 ? (targetCompleted / totalTargets) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">Objective Progress</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {completedObjectives} / {totalObjectives}
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0}%` }}
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
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created By</dt>
                      <dd className="text-sm text-gray-900">{kpi.createdBy.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Evaluator</dt>
                      <dd className="text-sm text-gray-900">{kpi.evaluator.name}</dd>
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
                <h3 className="text-lg font-medium text-gray-900">Target</h3>
                <span className="text-sm text-gray-500">
                  {targetCompleted} of {totalTargets} completed
                </span>
              </div>

              {!kpi.target ? (
                <div className="text-center py-8 text-gray-500">
                  No target defined for this KPI
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-lg border ${
                      kpi.target.isAchieved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={kpi.target.isAchieved || false}
                            onChange={(e) => handleTargetToggle(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {kpi.target.targetLabel || `${kpi.target.targetDirection} to ${kpi.target.targetValue}`}
                            </div>
                            <div className="text-sm text-gray-600">
                              Current: {kpi.target.currentValue}
                            </div>
                            {kpi.target.achievedAt && (
                              <div className="text-sm text-green-600">
                                Achieved on {new Date(kpi.target.achievedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        kpi.target.isAchieved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {kpi.target.isAchieved ? 'Achieved' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'objectives' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Objectives</h3>
                <span className="text-sm text-gray-500">
                  {completedObjectives} of {totalObjectives} completed
                </span>
              </div>

              <div className="text-center py-8 text-gray-500">
                Objectives functionality is not yet implemented
              </div>
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
                  <button
                    onClick={() => handleStatusChange(true)}
                    disabled={loading || kpi.isActive}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      kpi.isActive
                        ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => handleStatusChange(false)}
                    disabled={loading || !kpi.isActive}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      !kpi.isActive
                        ? 'bg-gray-100 text-gray-800 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Deactivate
                  </button>
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
