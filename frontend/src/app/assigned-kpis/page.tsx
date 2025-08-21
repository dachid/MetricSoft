'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/apiClient';

interface OrganizationalUnit {
  id: string;
  name: string;
  type: string;
  level: string;
  levelDefinition?: {
    name: string;
    pluralName: string;
    hierarchyLevel: number;
  };
}

interface PerformanceComponent {
  id: string;
  name: string;
  description?: string;
  weight: number;
  organizationalLevel: string;
}

interface AssignedKPI {
  id: string;
  name: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  componentId: string;
  component: PerformanceComponent;
  organizationalUnitId: string;
  organizationalUnit: OrganizationalUnit;
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NewAssignedKPI {
  name: string;
  description: string;
  targetValue: number;
  unit: string;
  componentId: string;
  organizationalUnitId: string;
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

export default function AssignedKPIsPage() {
  const { user } = useAuth();
  const [assignedKpis, setAssignedKpis] = useState<AssignedKPI[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([]);
  const [components, setComponents] = useState<PerformanceComponent[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<AssignedKPI | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newKpi, setNewKpi] = useState<NewAssignedKPI>({
    name: '',
    description: '',
    targetValue: 0,
    unit: '',
    componentId: '',
    organizationalUnitId: '',
  });

  useEffect(() => {
    if (user) {
      fetchAssignedKPIs();
      fetchOrganizationalUnits();
      fetchOrganizationalComponents();
    }
  }, [selectedUnit, user]);

  const fetchAssignedKPIs = async () => {
    try {
      const url = selectedUnit 
        ? `/kpis/assigned-kpis?unitId=${selectedUnit}`
        : '/kpis/assigned-kpis';
      
      const response = await apiClient.get(url);
      if (response.success && response.data) {
        setAssignedKpis(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching assigned KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationalUnits = async () => {
    try {
      if (!user?.tenantId) return;
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/org-units`);
      if (response.success && response.data) {
        // Extract orgUnits from the response structure
        const orgUnits = (response.data as any).orgUnits || [];
        
        // Filter to only include units where the user is a KPI champion
        const assignedUnits = orgUnits.filter((unit: any) => 
          unit.kpiChampions?.some((champion: any) => champion.user?.id === user.id)
        );
        
        setOrganizationalUnits(assignedUnits);
      }
    } catch (error) {
      console.error('Error fetching organizational units:', error);
    }
  };

  const fetchOrganizationalComponents = async () => {
    try {
      const response = await apiClient.get('/performance-components?level=ORGANIZATIONAL');
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
      const response = await apiClient.post('/kpis/assigned-kpis', newKpi);

      if (response.success && response.data) {
        const createdKpi = response.data as AssignedKPI;
        setAssignedKpis([...assignedKpis, createdKpi]);
        setIsModalOpen(false);
        setNewKpi({
          name: '',
          description: '',
          targetValue: 0,
          unit: '',
          componentId: '',
          organizationalUnitId: '',
        });
      }
    } catch (error) {
      console.error('Error creating assigned KPI:', error);
    }
  };

  const handleUpdateProgress = async (kpiId: string, currentValue: number) => {
    try {
      const response = await apiClient.put(`/kpis/assigned-kpis/${kpiId}/progress`, { currentValue });

      if (response.success && response.data) {
        const updatedKpi = response.data as AssignedKPI;
        setAssignedKpis(assignedKpis.map(kpi => kpi.id === kpiId ? updatedKpi : kpi));
      }
    } catch (error) {
      console.error('Error updating KPI progress:', error);
    }
  };

  const openViewModal = (kpi: AssignedKPI) => {
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

  const filteredKpis = selectedUnit 
    ? assignedKpis.filter(kpi => kpi.organizationalUnitId === selectedUnit)
    : assignedKpis;

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
    <DashboardLayout title="Assigned KPIs" subtitle="Manage KPIs for organizational units where you serve as KPI Champion">
      <div className="space-y-6">
        {/* Create KPI Button */}
        <div className="flex justify-end">
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Organizational KPI
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Filter by Organizational Unit:
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Units</option>
              {organizationalUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.levelDefinition?.name || unit.type || 'Unknown'})
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {filteredKpis.length} KPIs
            </span>
          </div>
        </div>

        {/* KPIs Grid */}
        {filteredKpis.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Assigned KPIs</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating organizational KPIs for units you champion.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKpis.map((kpi) => {
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
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {kpi.description}
                  </p>
                  
                  <div className="text-sm text-blue-600 mb-3 font-medium">
                    {kpi.organizationalUnit.name} ({kpi.organizationalUnit.type})
                  </div>
                  
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
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Component: {kpi.component.name}</div>
                      <div>Assigned by: {kpi.assignedBy.firstName} {kpi.assignedBy.lastName}</div>
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
                  {isViewMode ? 'Organizational KPI Details' : 'Create Organizational KPI'}
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
                      Organizational Unit
                    </label>
                    <p className="text-sm text-gray-600">
                      {selectedKpi.organizationalUnit.name} ({selectedKpi.organizationalUnit.type})
                    </p>
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned By
                    </label>
                    <p className="text-sm text-gray-600">
                      {selectedKpi.assignedBy.firstName} {selectedKpi.assignedBy.lastName}
                    </p>
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
                      Organizational Unit
                    </label>
                    <select
                      value={newKpi.organizationalUnitId}
                      onChange={(e) => setNewKpi({ ...newKpi, organizationalUnitId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select an organizational unit</option>
                      {organizationalUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.levelDefinition?.name || unit.type || 'Unknown'})
                        </option>
                      ))}
                    </select>
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
