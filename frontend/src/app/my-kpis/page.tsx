'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

interface PerformanceComponent {
  id: string;
  name: string;
  description?: string;
  weight: number;
  organizationalLevel: string;
}

interface KPI {
  id: string;
  name: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  componentId: string;
  component: PerformanceComponent;
  createdAt: string;
  updatedAt: string;
}

interface NewKPI {
  name: string;
  description: string;
  targetValue: number;
  unit: string;
  componentId: string;
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
  const [components, setComponents] = useState<PerformanceComponent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newKpi, setNewKpi] = useState<NewKPI>({
    name: '',
    description: '',
    targetValue: 0,
    unit: '',
    componentId: '',
  });

  useEffect(() => {
    fetchMyKPIs();
    fetchIndividualComponents();
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

  const fetchIndividualComponents = async () => {
    try {
      const response = await apiClient.get('/performance-components?level=INDIVIDUAL');
      if (response.success && response.data) {
        setComponents(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching performance components:', error);
    }
  };

  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/kpis/my-kpis', newKpi);

      if (response.success && response.data) {
        const createdKpi = response.data as KPI;
        setKpis([...kpis, createdKpi]);
        setIsModalOpen(false);
        setNewKpi({
          name: '',
          description: '',
          targetValue: 0,
          unit: '',
          componentId: '',
        });
      }
    } catch (error) {
      console.error('Error creating KPI:', error);
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
            Create New {terminology.kpis.slice(0, -1)}
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
              const progress = getProgressPercentage(kpi.currentValue, kpi.targetValue);
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
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[kpi.status]
                      }`}
                    >
                      {statusLabels[kpi.status]}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {kpi.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">
                        {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Component: {kpi.component.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {isViewMode ? `${terminology.kpis.slice(0, -1)} Details` : `Create New ${terminology.kpis.slice(0, -1)}`}
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

              {isViewMode && selectedKpi ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Progress
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={selectedKpi.currentValue}
                        onChange={(e) => {
                          const newValue = Number(e.target.value);
                          setSelectedKpi({ ...selectedKpi, currentValue: newValue });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">/ {selectedKpi.targetValue} {selectedKpi.unit}</span>
                      <button
                        onClick={() => handleUpdateProgress(selectedKpi.id, selectedKpi.currentValue)}
                        className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-600">{selectedKpi.description}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Performance Component
                    </label>
                    <p className="text-sm text-gray-600">{selectedKpi.component.name}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateKPI} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KPI Name
                    </label>
                    <input
                      type="text"
                      value={newKpi.name}
                      onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newKpi.description}
                      onChange={(e) => setNewKpi({ ...newKpi, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Performance Component
                    </label>
                    <select
                      value={newKpi.componentId}
                      onChange={(e) => setNewKpi({ ...newKpi, componentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a component</option>
                      {components.map((component) => (
                        <option key={component.id} value={component.id}>
                          {component.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Value
                      </label>
                      <input
                        type="number"
                        value={newKpi.targetValue}
                        onChange={(e) => setNewKpi({ ...newKpi, targetValue: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={newKpi.unit}
                        onChange={(e) => setNewKpi({ ...newKpi, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., %, hours, units"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create KPI
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
