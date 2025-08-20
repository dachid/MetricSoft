/**
 * Fiscal Year Selector Component
 * Allows users to switch between fiscal years and shows current status
 */

'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Calendar, ChevronDown, Plus, CheckCircle, Clock, Lock } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'locked' | 'archived';
  isCurrent: boolean;
  confirmations: Array<{
    confirmationType: string;
    confirmedAt: string;
  }>;
  _count: {
    levelDefinitions: number;
    perspectives: number;
  };
}

interface FiscalYearSelectorProps {
  tenantId: string;
  selectedFiscalYear?: FiscalYear | null;
  onFiscalYearChange: (fiscalYear: FiscalYear) => void;
  onCreateNew?: () => void;
  onCurrentChanged?: () => void; // Callback when current fiscal year is changed
  className?: string;
}

// Define the ref interface for external method calls
export interface FiscalYearSelectorRef {
  refreshFiscalYears: () => Promise<void>;
}

const FiscalYearSelector = forwardRef<FiscalYearSelectorRef, FiscalYearSelectorProps>(({
  tenantId,
  selectedFiscalYear,
  onFiscalYearChange,
  onCreateNew,
  onCurrentChanged,
  className = ''
}, ref) => {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Function to fetch fiscal years (extracted for reuse)
  const fetchFiscalYears = async () => {
    if (!tenantId) {
      setFiscalYears([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.get<FiscalYear[]>(`/tenants/${tenantId}/fiscal-years`);
      const data = response.data || [];
      setFiscalYears(data);
      return data; // Return the data for immediate use
    } catch (error) {
      console.error('Error fetching fiscal years:', error);
      setFiscalYears([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshFiscalYears: async () => {
      const data = await fetchFiscalYears();
      // Auto-select current fiscal year after refresh
      if (data && data.length > 0) {
        const currentFy = data.find((fy: FiscalYear) => fy.isCurrent) || data[0];
        if (currentFy) {
          onFiscalYearChange(currentFy);
        }
      }
    }
  }));

  // Load fiscal years from API
  useEffect(() => {
    fetchFiscalYears();
  }, [tenantId]);

  // Auto-select current fiscal year when fiscal years change or when switching tenants
  useEffect(() => {
    if (fiscalYears.length > 0) {
      // Always auto-select the current fiscal year for the organization
      const currentFy = fiscalYears.find((fy: FiscalYear) => fy.isCurrent) || fiscalYears[0];
      
      // Only call onFiscalYearChange if we need to change the selection
      if (!selectedFiscalYear || selectedFiscalYear.id !== currentFy.id) {
        onFiscalYearChange(currentFy);
      }
    }
  }, [fiscalYears, tenantId]); // Include tenantId to ensure we reset selection when switching orgs

  // Handle setting fiscal year as current
  const handleSetAsCurrent = async (fiscalYear: FiscalYear, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropdown item selection
    
    try {
      await apiClient.put(
        `/tenants/${tenantId}/fiscal-years/${fiscalYear.id}`,
        { isCurrent: true }
      );

      // Refresh fiscal years list
      const response = await apiClient.get<FiscalYear[]>(`/tenants/${tenantId}/fiscal-years`);
      const data = response.data || [];
      setFiscalYears(data);
          
      // Update selected fiscal year if it was the one we just set as current
      if (selectedFiscalYear?.id === fiscalYear.id) {
        const updatedFy = data.find((fy: FiscalYear) => fy.id === fiscalYear.id);
        if (updatedFy) {
          onFiscalYearChange(updatedFy);
        }
      }
      
      // Call callback if provided
      if (onCurrentChanged) {
        onCurrentChanged();
      }
    } catch (error) {
      console.error('Error setting fiscal year as current:', error);
    }
  };

  const getStatusIcon = (fiscalYear: FiscalYear) => {
    const orgConfirmed = fiscalYear.confirmations.some(c => c.confirmationType === 'org_structure');
    const perfConfirmed = fiscalYear.confirmations.some(c => c.confirmationType === 'performance_components');

    if (fiscalYear.status === 'locked' || fiscalYear.status === 'archived') {
      return <Lock className="w-4 h-4 text-gray-500" />;
    }
    if (orgConfirmed && perfConfirmed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (orgConfirmed) {
      return <Clock className="w-4 h-4 text-blue-500" />;
    }
    return <Calendar className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = (fiscalYear: FiscalYear) => {
    const orgConfirmed = fiscalYear.confirmations.some(c => c.confirmationType === 'org_structure');
    const perfConfirmed = fiscalYear.confirmations.some(c => c.confirmationType === 'performance_components');

    // First check for terminal/locked states
    if (fiscalYear.status === 'archived') return 'Archived';
    if (fiscalYear.status === 'locked') return 'Locked';
    
    // Then check for completion states based on confirmations
    if (orgConfirmed && perfConfirmed) return 'Complete';
    if (orgConfirmed) return 'Org Structure Confirmed';
    
    // Finally, return the actual status with proper capitalization
    const statusMap = {
      'draft': 'Draft',
      'active': 'Active',
      'locked': 'Locked',
      'archived': 'Archived'
    };
    
    return statusMap[fiscalYear.status as keyof typeof statusMap] || fiscalYear.status.charAt(0).toUpperCase() + fiscalYear.status.slice(1);
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Calendar className="w-5 h-5 text-gray-400" />
        <span className="text-gray-500">Loading fiscal years...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {selectedFiscalYear?.name || 'Select Fiscal Year'}
            </div>
            {selectedFiscalYear && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {getStatusIcon(selectedFiscalYear)}
                <span>{getStatusText(selectedFiscalYear)}</span>
                {selectedFiscalYear.isCurrent && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Current
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Fiscal Year Options */}
          <div className="py-1">
            {fiscalYears.map((fiscalYear) => (
              <div
                key={fiscalYear.id}
                className={`relative group ${
                  selectedFiscalYear?.id === fiscalYear.id ? 'bg-blue-50' : ''
                }`}
              >
                <button
                  onClick={() => {
                    onFiscalYearChange(fiscalYear);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                    selectedFiscalYear?.id === fiscalYear.id ? 'text-blue-900' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(fiscalYear)}
                    <div>
                      <div className="font-medium">{fiscalYear.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(fiscalYear.startDate).getFullYear()} - {new Date(fiscalYear.endDate).getFullYear()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {fiscalYear.isCurrent ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Current
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleSetAsCurrent(fiscalYear, e)}
                        className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-all"
                        title="Set as Current Fiscal Year"
                      >
                        Set Current
                      </button>
                    )}
                    <span className="text-xs text-gray-400">{getStatusText(fiscalYear)}</span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Create New Option */}
          {onCreateNew && (
            <>
              <div className="border-t border-gray-200"></div>
              <button
                onClick={() => {
                  onCreateNew();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-blue-600"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Create New Fiscal Year</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

FiscalYearSelector.displayName = 'FiscalYearSelector';

export default FiscalYearSelector;
