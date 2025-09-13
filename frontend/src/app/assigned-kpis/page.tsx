'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';
import KPICreateModal from '@/components/KPI/KPICreateModal';
import KPIViewModal from '@/components/KPI/KPIViewModal';
import KPIShareModal from '@/components/KPI/KPIShareModal';
import KPIExitComponentModal from '@/components/KPI/KPIExitComponentModal';

// New comprehensive KPI types based on our schema
interface KPI {
  id: string;
  name: string;
  description?: string;
  perspective: string;
  isActive: boolean; // Changed from status enum to isActive boolean
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  userId: string;
  tenantId: string;
  fiscalYearId: string;
  exitComponentId?: string;
  orgUnitId?: string; // Add this field for organizational unit association
  isRecurring: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  dueDate?: string;
  
  // Relations
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

interface OrgUnit {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  levelDefinition: {
    id: string;
    code: string;
    name: string;
    pluralName: string;
    hierarchyLevel: number;
    icon?: string;
    color?: string;
  };
  parent?: {
    id: string;
    name: string;
    code: string;
    levelDefinition: {
      name: string;
      hierarchyLevel: number;
    };
  };
  children?: {
    id: string;
    name: string;
    code: string;
    levelDefinition: {
      name: string;
      hierarchyLevel: number;
    };
  }[];
  kpiChampions: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  kpis?: KPI[]; // KPIs associated with this unit
}

interface ExitComponent {
  id: string;
  name: string;
  description?: string;
  weight: number;
  organizationalLevel: string;
}

interface CreateKPIRequest {
  name: string;
  description?: string;
  perspective: string;
  fiscalYearId: string;
  exitComponentId?: string;
  isRecurring: boolean;
  frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  dueDate?: string;
  targets: {
    type: 'NUMERIC' | 'STATUS' | 'PERCENTAGE';
    direction: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
    numericValue?: number;
    unit?: string;
    statusValue?: string;
    percentageValue?: number;
  }[];
  objectives: {
    title: string;
    description: string;
  }[];
}

const statusColors = {
  ACTIVE: 'bg-blue-100 text-blue-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

const statusLabels = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export default function AssignedKPIsPage() {
  const { user } = useAuth();
  const { terminology, isLoading: terminologyLoading } = useTerminology();
  const router = useRouter();
  
  // State management
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [fiscalYears, setFiscalYears] = useState<any[]>([]);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKpiChampion, setIsKpiChampion] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerspective, setSelectedPerspective] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [selectedOrgUnit, setSelectedOrgUnit] = useState('');
  
  // View states
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards'); // New state for view mode
  const [selectedOrgUnitForView, setSelectedOrgUnitForView] = useState<OrgUnit | null>(null); // Store the org unit being viewed
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExitComponentModalOpen, setIsExitComponentModalOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [selectedOrgUnitForKPI, setSelectedOrgUnitForKPI] = useState<OrgUnit | null>(null);
  
  // Form state for creating/editing KPIs
  const [createForm, setCreateForm] = useState<CreateKPIRequest>({
    name: '',
    description: '',
    perspective: '',
    fiscalYearId: '',
    exitComponentId: '',
    isRecurring: false,
    frequency: undefined,
    dueDate: '',
    targets: [],
    objectives: []
  });

  // Generate dynamic perspective options from actual KPI data
  const perspectiveOptions = useMemo(() => {
    const perspectives = new Set<string>();
    kpis.forEach(kpi => {
      if (kpi.perspective) {
        if (typeof kpi.perspective === 'object' && kpi.perspective !== null) {
          const perspectiveName = (kpi.perspective as any).name || (kpi.perspective as any).description;
          if (perspectiveName) perspectives.add(perspectiveName);
        } else {
          perspectives.add(kpi.perspective);
        }
      }
    });
    return Array.from(perspectives).sort();
  }, [kpis]);

  useEffect(() => {
    fetchAssignedOrgUnits();
    fetchFiscalYears();
  }, [user?.tenantId, user?.id]);

  useEffect(() => {
    if (orgUnits.length > 0) {
      fetchKPIsForOrgUnits();
    }
  }, [selectedFiscalYear, selectedPerspective, selectedStatus, searchTerm, selectedOrgUnit, orgUnits]);

  // Fetch organizational units where the user is a KPI champion
  const fetchAssignedOrgUnits = async () => {
    if (!user?.tenantId || !user?.id) return;
    
    try {
      setLoading(true);
      console.log('DEBUG: Fetching org units for user:', user.id, 'tenant:', user.tenantId);
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/org-units`);
      console.log('DEBUG: Org units API response:', response);
      
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.orgUnits) {
          // Filter to only show org units where current user is a KPI champion
          const championsOrgUnits = data.orgUnits.filter((orgUnit: any) => 
            orgUnit.kpiChampions?.some((champion: any) => champion.user?.id === user.id)
          );
          console.log('DEBUG: Filtered org units where user is champion:', championsOrgUnits);
          setOrgUnits(championsOrgUnits);
          setIsKpiChampion(championsOrgUnits.length > 0);
        }
      }
    } catch (error) {
      console.error('Error fetching assigned organizational units:', error);
      setError('Failed to load assigned organizational units');
      setIsKpiChampion(false);
    }
  };

  const fetchKPIsForOrgUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedFiscalYear) params.append('fiscalYearId', selectedFiscalYear);
      if (selectedPerspective) params.append('perspective', selectedPerspective);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);
      if (selectedOrgUnit) params.append('orgUnitId', selectedOrgUnit);
      
      console.log('DEBUG: Fetching KPIs with params:', params.toString());
      const response = await apiClient.get(`/kpis?${params.toString()}`);
      console.log('DEBUG: KPI API response:', response);
      console.log('DEBUG: KPI API response.data:', response.data);
      console.log('DEBUG: KPI API response.data type:', typeof response.data);
      console.log('DEBUG: KPI API response.data keys:', Object.keys(response.data || {}));
      
      if (response.success && response.data) {
        const kpiData = Array.isArray(response.data) ? response.data : [];
        console.log('DEBUG: KPI data received:', kpiData);
        console.log('DEBUG: Number of KPIs received:', kpiData.length);
        setKpis(kpiData);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setError('Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiscalYears = async () => {
    try {
      if (!user?.tenantId) return;
      
      const response = await apiClient.get(`/tenants/${user.tenantId}/fiscal-years`);
      if (response.success && response.data) {
        const years = Array.isArray(response.data) ? response.data : [];
        setFiscalYears(years);
        
        // Set current fiscal year if not already selected
        if (!selectedFiscalYear && years.length > 0) {
          const current = years.find((year: any) => year.isCurrent) || years[0];
          setCurrentFiscalYear(current);
          setSelectedFiscalYear(current.id);
        }
      }
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
    }
  };

  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validate fiscal year
      if (!createForm.fiscalYearId) {
        setError('Please select a fiscal year');
        return;
      }
      
      const response = await apiClient.post('/kpis', createForm);
      if (response.success && response.data) {
        const newKpi = response.data as KPI;
        setKpis([newKpi, ...kpis]);
        setIsCreateModalOpen(false);
        resetCreateForm();
      }
    } catch (error) {
      console.error('Error creating KPI:', error);
      setError('Failed to create KPI');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKPI = async (kpiId: string) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return;
    
    try {
      const response = await apiClient.delete(`/kpis/${kpiId}`);
      if (response.success) {
        setKpis(kpis.filter(kpi => kpi.id !== kpiId));
        setIsViewModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting KPI:', error);
      setError('Failed to delete KPI');
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      perspective: '',
      fiscalYearId: currentFiscalYear?.id || '',
      exitComponentId: '',
      isRecurring: false,
      frequency: undefined,
      dueDate: '',
      targets: [],
      objectives: []
    });
  };

  const openCreateModal = (orgUnit?: OrgUnit) => {
    resetCreateForm();
    setSelectedOrgUnitForKPI(orgUnit || null);
    setIsCreateModalOpen(true);
  };

  const openViewModal = (kpi: KPI) => {
    setSelectedKpi(kpi);
    setIsViewModalOpen(true);
  };

  const openShareModal = (kpi: KPI) => {
    setSelectedKpi(kpi);
    setIsShareModalOpen(true);
  };

  const openExitComponentModal = (kpi: KPI) => {
    setSelectedKpi(kpi);
    setIsExitComponentModalOpen(true);
  };

  const viewOrgUnitKPIs = (orgUnit: OrgUnit) => {
    setSelectedOrgUnitForView(orgUnit);
    setSelectedOrgUnit(orgUnit.id);
    setViewMode('list');
  };

  const backToCardsView = () => {
    setViewMode('cards');
    setSelectedOrgUnitForView(null);
    setSelectedOrgUnit('');
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsViewModalOpen(false);
    setIsShareModalOpen(false);
    setIsExitComponentModalOpen(false);
    setSelectedKpi(null);
    setError(null);
  };

  const addTarget = () => {
    setCreateForm({
      ...createForm,
      targets: [
        ...createForm.targets,
        {
          type: 'NUMERIC',
          direction: 'INCREASE',
          numericValue: 0,
          unit: ''
        }
      ]
    });
  };

  const addObjective = () => {
    setCreateForm({
      ...createForm,
      objectives: [
        ...createForm.objectives,
        {
          title: '',
          description: ''
        }
      ]
    });
  };

  const removeTarget = (index: number) => {
    setCreateForm({
      ...createForm,
      targets: createForm.targets.filter((_, i) => i !== index)
    });
  };

  const removeObjective = (index: number) => {
    setCreateForm({
      ...createForm,
      objectives: createForm.objectives.filter((_, i) => i !== index)
    });
  };

  const filteredKpis = kpis.filter(kpi => {
    const matchesSearch = !searchTerm || 
      kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPerspective = !selectedPerspective || 
      (typeof kpi.perspective === 'object' && kpi.perspective !== null
        ? (kpi.perspective as any).name === selectedPerspective || (kpi.perspective as any).description === selectedPerspective
        : kpi.perspective === selectedPerspective);
    // Update status filtering to use isActive
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'ACTIVE' && kpi.isActive) || 
      (selectedStatus === 'INACTIVE' && !kpi.isActive);
    
    return matchesSearch && matchesPerspective && matchesStatus;
  });

  if (loading && kpis.length === 0 || terminologyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={`Manage ${terminology?.kpisPlural || 'KPIs'}`} 
      subtitle={`Manage ${(terminology?.kpisPlural || 'KPIs').toLowerCase()} assigned to your organizational units`}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentFiscalYear ? `${currentFiscalYear.year} ${terminology?.kpisPlural || 'KPIs'}` : `My ${terminology?.kpisPlural || 'KPIs'}`}
            </h1>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {filteredKpis.length} {filteredKpis.length === 1 ? (terminology?.kpis || 'KPI') : (terminology?.kpisPlural || 'KPIs')}
            </span>
          </div>
          {isKpiChampion && (
            <button
              onClick={() => openCreateModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create {terminology?.kpis || 'KPI'}</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search KPIs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Organizational Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organizational Unit
              </label>
              <select
                value={selectedOrgUnit}
                onChange={(e) => setSelectedOrgUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Units</option>
                {orgUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.levelDefinition.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Fiscal Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiscal Year
              </label>
              <select
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {fiscalYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year} {year.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Perspective */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perspective
              </label>
              <select
                value={selectedPerspective}
                onChange={(e) => setSelectedPerspective(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Perspectives</option>
                {perspectiveOptions.map((perspective: string) => (
                  <option key={perspective} value={perspective}>
                    {perspective}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* KPI List View */}
        {viewMode === 'list' && selectedOrgUnitForView && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* List Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={backToCardsView}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                  </button>
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedOrgUnitForView.name} - {terminology?.kpisPlural || 'KPIs'}
                  </div>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {filteredKpis.length} {filteredKpis.length === 1 ? (terminology?.kpis || 'KPI') : (terminology?.kpisPlural || 'KPIs')}
                  </span>
                </div>
                <button
                  onClick={() => openCreateModal(selectedOrgUnitForView)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create {terminology?.kpis || 'KPI'}</span>
                </button>
              </div>
            </div>

            {/* KPI Table */}
            {filteredKpis.length === 0 ? (
              <div className="px-6 py-12 text-center">
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
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No {terminology?.kpisPlural || 'KPIs'}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new {terminology?.kpis || 'KPI'} for {selectedOrgUnitForView.name}.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => openCreateModal(selectedOrgUnitForView)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New {terminology?.kpis || 'KPI'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {terminology?.kpis || 'KPI'} Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perspective
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredKpis.map((kpi) => (
                      <tr key={kpi.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{kpi.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {kpi.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {typeof kpi.perspective === 'object' && kpi.perspective !== null 
                              ? (kpi.perspective as any).name || (kpi.perspective as any).description || 'N/A'
                              : kpi.perspective || 'N/A'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            kpi.isActive ? statusColors.ACTIVE : statusColors.INACTIVE
                          }`}>
                            {kpi.isActive ? statusLabels.ACTIVE : statusLabels.INACTIVE}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {kpi.isRecurring ? (kpi.frequency || 'Recurring') : 'One-time'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {kpi.dueDate ? new Date(kpi.dueDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openViewModal(kpi)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openShareModal(kpi)}
                              className="text-green-600 hover:text-green-900 text-sm"
                              title="Share"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openExitComponentModal(kpi)}
                              className="text-purple-600 hover:text-purple-900 text-sm"
                              title="Add Initiatives"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Organizational Units Grid */}
        {viewMode === 'cards' && (
          <>
            {orgUnits.length === 0 ? (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Assigned Organizational Units</h3>
            <p className="mt-1 text-sm text-gray-500">
              You are not currently assigned as a KPI champion for any organizational unit.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgUnits.map((orgUnit) => {
              // Count KPIs for this org unit - only show KPIs that actually belong to this org unit
              const orgUnitKPIs = kpis.filter(kpi => kpi.orgUnitId === orgUnit.id);
              const activeKPIs = orgUnitKPIs.filter(kpi => kpi.isActive).length;
              const inactiveKPIs = orgUnitKPIs.filter(kpi => !kpi.isActive).length;

              console.log('DEBUG: Org unit:', orgUnit.name, orgUnit.id);
              console.log('DEBUG: All KPIs:', kpis.length);
              console.log('DEBUG: KPIs for this org unit:', orgUnitKPIs.length);
              console.log('DEBUG: Active KPIs:', activeKPIs);
              console.log('DEBUG: KPIs data for this org unit:', orgUnitKPIs.map(k => ({ id: k.id, name: k.name, orgUnitId: k.orgUnitId, isActive: k.isActive })));

              return (
                <div
                  key={orgUnit.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {orgUnit.name}
                      </h3>
                      <p className="text-sm text-blue-600 font-medium">
                        {orgUnit.levelDefinition.name}
                      </p>
                      {orgUnit.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {orgUnit.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {orgUnit.levelDefinition.icon && (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: orgUnit.levelDefinition.color || '#3B82F6' }}
                        >
                          {orgUnit.levelDefinition.icon}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* KPI Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{activeKPIs}</div>
                      <div className="text-xs text-blue-700">Active {terminology?.kpisPlural || 'KPIs'}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">{inactiveKPIs}</div>
                      <div className="text-xs text-gray-700">Inactive</div>
                    </div>
                  </div>

                  {/* Hierarchy Information */}
                  {orgUnit.parent && (
                    <div className="text-xs text-gray-500 mb-3">
                      <span className="inline-flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18" />
                        </svg>
                        {orgUnit.parent.name}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openCreateModal(orgUnit)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add {terminology?.kpis || 'KPI'}</span>
                    </button>
                    
                    <button
                      onClick={() => viewOrgUnitKPIs(orgUnit)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View {terminology?.kpisPlural || 'KPIs'} ({orgUnitKPIs.length})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
            )
          }
          </>
        )}

        {/* Modals */}
        <KPICreateModal
          isOpen={isCreateModalOpen}
          onClose={closeModals}
          onSuccess={(newKpi) => {
            // Refetch KPIs to ensure proper filtering is applied
            fetchKPIsForOrgUnits();
            closeModals();
          }}
          fiscalYears={fiscalYears}
          currentFiscalYear={currentFiscalYear}
          currentOrgUnit={selectedOrgUnitForKPI}
        />

        <KPIViewModal
          isOpen={isViewModalOpen}
          onClose={closeModals}
          kpi={selectedKpi as any}
          onUpdate={(updatedKpi) => {
            setKpis(kpis.map(k => k.id === updatedKpi.id ? updatedKpi as any : k));
          }}
          onDelete={(kpiId) => {
            setKpis(kpis.filter(k => k.id !== kpiId));
            closeModals();
          }}
        />

        <KPIShareModal
          isOpen={isShareModalOpen}
          onClose={closeModals}
          kpi={selectedKpi as any}
          onUpdate={(updatedKpi) => {
            setKpis(kpis.map(k => k.id === updatedKpi.id ? updatedKpi as any : k));
          }}
        />

        <KPIExitComponentModal
          isOpen={isExitComponentModalOpen}
          onClose={closeModals}
          kpiId={selectedKpi?.id || ''}
          onSuccess={() => {
            // Optionally refresh KPI data or show success message
            fetchKPIsForOrgUnits();
            closeModals();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
