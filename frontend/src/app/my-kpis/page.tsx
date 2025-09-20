'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';
import IndividualKPICreateModal from '@/components/KPI/IndividualKPICreateModal';

interface OrgUnit {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface Perspective {
  id: string;
  name: string;
}

interface KPITarget {
  id: string;
  targetValue: number;
  unit: string;
}

interface KPI {
  id: string;
  name: string;
  description?: string;
  code: string;
  orgUnitId?: string | null; // null for individual KPIs
  orgUnit?: OrgUnit | null;
  evaluator: User;
  createdBy: User;
  perspective?: Perspective | null;
  target?: KPITarget | null;
  isRecurring: boolean;
  frequency?: string | null;
  dueDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

const statusLabels = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
};

export default function MyKPIsPage() {
  const { user } = useAuth();
  const { terminology } = useTerminology();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyKPIs();
  }, []);

  const fetchMyKPIs = async () => {
    try {
      const response = await apiClient.get('/kpis/my-kpis');
      if (response.success && response.data) {
        setKpis(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching my KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (kpiId: string, currentValue: number) => {
    try {
      const response = await apiClient.put(`/kpis/my-kpis/${kpiId}/progress`, { currentValue });

      if (response.success && response.data) {
        const updatedKpi = response.data as KPI;
        setKpis(kpis.map(kpi => kpi.id === kpiId ? updatedKpi : kpi));
      }
    } catch (error) {
      console.error('Error updating KPI progress:', error);
    }
  };

  const openViewModal = (kpi: KPI) => {
    setSelectedKpi(kpi);
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedKpi(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedKpi(null);
    setIsViewMode(false);
  };

  const getProgressPercentage = (current: number, target: number) => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`My ${terminology.kpis}`} subtitle={`Manage and track your individual ${terminology.kpis}`}>
      <div className="space-y-6">
        {/* Create KPI Button */}
        <div className="flex justify-end">
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New {terminology.kpis}
          </button>
        </div>

        {/* KPIs Grid */}
        {kpis.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No KPIs</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first KPI.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((kpi) => {
              const progress = kpi.target ? getProgressPercentage(0, kpi.target.targetValue) : 0;
              return (
                <div
                  key={kpi.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openViewModal(kpi)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {kpi.name}
                    </h3>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                    >
                      Active
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {kpi.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">
                        Target: {kpi.target?.targetValue || 'Not set'} {kpi.target?.unit || ''}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {kpi.orgUnit ? `Org Unit: ${kpi.orgUnit.name}` : 'Individual KPI'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        <IndividualKPICreateModal
          isOpen={isModalOpen && !isViewMode}
          onClose={closeModal}
          onKPICreated={() => {
            fetchMyKPIs();
            closeModal();
          }}
        />

        {/* View KPI Modal */}
        {isModalOpen && isViewMode && selectedKpi && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {terminology.kpis} Details
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{selectedKpi.name}</h3>
                  <p className="text-sm text-gray-600">{selectedKpi.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Value
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold">
                      {selectedKpi.target?.targetValue || 'Not set'}
                    </span>
                    <span className="text-sm text-gray-600">{selectedKpi.target?.unit || ''}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <p className="text-sm text-gray-600">
                    {selectedKpi.orgUnit ? `Organizational (${selectedKpi.orgUnit.name})` : 'Individual KPI'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evaluator
                  </label>
                  <p className="text-sm text-gray-600">{selectedKpi.evaluator.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
