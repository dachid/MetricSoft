'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useAuth } from '@/lib/auth-context';
import { useTerminology } from '@/hooks/useTerminology';
import { apiClient } from '@/lib/apiClient';

// KPI types - same as in other KPI pages
interface KPI {
  id: string;
  name: string;
  description?: string;
  perspective: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  userId: string;
  tenantId: string;
  fiscalYearId: string;
  exitComponentId?: string;
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

export default function SharedKPIsPage() {
  const { user } = useAuth();
  const { terminology } = useTerminology();
  
  // State management
  const [sharedKpis, setSharedKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerspective, setSelectedPerspective] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchSharedKPIs();
  }, [searchTerm, selectedPerspective, selectedStatus]);

  const fetchSharedKPIs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedPerspective) params.append('perspective', selectedPerspective);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);
      
      // For now, use the regular KPIs endpoint - in a real implementation,
      // you would have a dedicated shared KPIs endpoint
      const response = await apiClient.get(`/kpis/shared-kpis?${params.toString()}`);
      if (response.success && response.data) {
        setSharedKpis(Array.isArray(response.data) ? response.data : []);
      } else {
        // If endpoint doesn't exist, show empty state
        setSharedKpis([]);
      }
    } catch (error) {
      console.error('Error fetching shared KPIs:', error);
      setSharedKpis([]); // Show empty state instead of error for non-existent endpoint
      setError(null); // Don't show error since this is expected for now
    } finally {
      setLoading(false);
    }
  };

  const filteredKpis = sharedKpis.filter(kpi => {
    const matchesSearch = !searchTerm || 
      kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kpi.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPerspective = !selectedPerspective || kpi.perspective === selectedPerspective;
    const matchesStatus = !selectedStatus || kpi.status === selectedStatus;
    
    return matchesSearch && matchesPerspective && matchesStatus;
  });

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
    <DashboardLayout 
      title={`Shared ${terminology.kpisPlural}`} 
      subtitle={`View ${terminology.kpisPlural.toLowerCase()} that have been shared with you`}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Shared {terminology.kpisPlural}
            </h1>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {filteredKpis.length} {filteredKpis.length === 1 ? 'KPI' : 'KPIs'}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search shared KPIs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
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

        {/* KPIs Grid or Empty State */}
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">You have no shared {terminology.kpisPlural}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedPerspective || selectedStatus
                ? 'No shared KPIs match your current filters.'
                : `No ${terminology.kpisPlural.toLowerCase()} have been shared with you yet.`}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              When other users share their KPIs with you, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKpis.map((kpi) => {
              const hasTargets = kpi.targets && kpi.targets.length > 0;
              const completedTargets = hasTargets ? kpi.targets.filter(t => t.isAchieved).length : 0;
              const progressPercentage = hasTargets ? (completedTargets / kpi.targets.length) * 100 : 0;

              return (
                <div
                  key={kpi.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
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
                    {kpi.description || 'No description provided'}
                  </p>
                  
                  <div className="text-sm text-blue-600 mb-3 font-medium">
                    {kpi.perspective}
                  </div>
                  
                  <div className="space-y-3">
                    {hasTargets && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Target Progress</span>
                          <span className="font-medium">
                            {completedTargets} / {kpi.targets.length} targets
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </>
                    )}
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Owner: {kpi.user.firstName} {kpi.user.lastName}</div>
                      {kpi.exitComponent && (
                        <div>Exit Component: {kpi.exitComponent.name}</div>
                      )}
                      <div>Created: {new Date(kpi.createdAt).toLocaleDateString()}</div>
                      {kpi.dueDate && (
                        <div>Due: {new Date(kpi.dueDate).toLocaleDateString()}</div>
                      )}
                    </div>
                    
                    <div className="flex justify-end items-center pt-2">
                      <div className="flex items-center space-x-2">
                        {kpi.isRecurring && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                            {kpi.frequency}
                          </span>
                        )}
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          Shared
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
