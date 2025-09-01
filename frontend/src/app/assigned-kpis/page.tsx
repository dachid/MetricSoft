'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';
import KPICreateModal from '@/components/KPI/KPICreateModal';
import KPIViewModal from '@/components/KPI/KPIViewModal';
import KPIShareModal from '@/components/KPI/KPIShareModal';

// New comprehensive KPI types based on our schema
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

const perspectiveOptions = [
  'Financial',
  'Customer',
  'Internal Process',
  'Learning & Growth',
  'Stakeholder',
  'Social & Environmental'
];

export default function AssignedKPIsPage() {
  const { user } = useAuth();
  const { terminology, isLoading: terminologyLoading } = useTerminology();
  const router = useRouter();
  
  // State management
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [exitComponents, setExitComponents] = useState<ExitComponent[]>([]);
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
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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

  useEffect(() => {
    fetchAssignedOrgUnits();
    fetchFiscalYears();
    fetchExitComponents();
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
      const response = await apiClient.get(`/tenants/${user.tenantId}/org-units`);
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.orgUnits) {
          // Filter to only show org units where current user is a KPI champion
          const championsOrgUnits = data.orgUnits.filter((orgUnit: any) => 
            orgUnit.kpiChampions?.some((champion: any) => champion.user?.id === user.id)
          );
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
      
      const response = await apiClient.get(`/kpis/assigned-kpis?${params.toString()}`);
      if (response.success && response.data) {
        setKpis(Array.isArray(response.data) ? response.data : []);
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

  const fetchExitComponents = async () => {
    try {
      if (!user?.tenantId) return;
      
      const response = await apiClient.get('/exit-components');
      if (response.success && response.data) {
        setExitComponents(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching exit components:', error);
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

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsViewModalOpen(false);
    setIsShareModalOpen(false);
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
    
    const matchesPerspective = !selectedPerspective || kpi.perspective === selectedPerspective;
    const matchesStatus = !selectedStatus || kpi.status === selectedStatus;
    
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
                {perspectiveOptions.map((perspective) => (
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

        {/* Organizational Units Grid */}
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
              // Count KPIs for this org unit
              const orgUnitKPIs = kpis.filter(kpi => kpi.orgUnitId === orgUnit.id || !selectedOrgUnit);
              const activeKPIs = orgUnitKPIs.filter(kpi => kpi.status === 'ACTIVE').length;
              const completedKPIs = orgUnitKPIs.filter(kpi => kpi.status === 'COMPLETED').length;

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
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{completedKPIs}</div>
                      <div className="text-xs text-green-700">Completed</div>
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
                      onClick={() => setSelectedOrgUnit(orgUnit.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View {terminology?.kpisPlural || 'KPIs'} ({orgUnitKPIs.length})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        <KPICreateModal
          isOpen={isCreateModalOpen}
          onClose={closeModals}
          onSuccess={(newKpi) => {
            setKpis([newKpi, ...kpis]);
            closeModals();
          }}
          fiscalYears={fiscalYears}
          currentFiscalYear={currentFiscalYear}
        />

        <KPIViewModal
          isOpen={isViewModalOpen}
          onClose={closeModals}
          kpi={selectedKpi}
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
      </div>
    </DashboardLayout>
  );
}
