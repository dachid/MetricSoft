/**
 * Fiscal Year Selector Component
 * Allows users to switch between fiscal years and shows current status
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Plus, CheckCircle, Clock, Lock } from 'lucide-react';

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
  className?: string;
}

const FiscalYearSelector: React.FC<FiscalYearSelectorProps> = ({
  tenantId,
  selectedFiscalYear,
  onFiscalYearChange,
  onCreateNew,
  className = ''
}) => {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load fiscal years from API
  useEffect(() => {
    const fetchFiscalYears = async () => {
      try {
        const token = localStorage.getItem('metricsoft_auth_token');
        const response = await fetch(`/api/tenants/${tenantId}/fiscal-years`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setFiscalYears(data);

          // Auto-select current fiscal year if none selected
          if (!selectedFiscalYear && data.length > 0) {
            const currentFy = data.find((fy: FiscalYear) => fy.isCurrent) || data[0];
            onFiscalYearChange(currentFy);
          }
        }
      } catch (error) {
        console.error('Error fetching fiscal years:', error);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchFiscalYears();
    }
  }, [tenantId, selectedFiscalYear, onFiscalYearChange]);

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

    if (fiscalYear.status === 'archived') return 'Archived';
    if (fiscalYear.status === 'locked') return 'Locked';
    if (orgConfirmed && perfConfirmed) return 'Complete';
    if (orgConfirmed) return 'Org Structure Confirmed';
    return 'Draft';
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
              <button
                key={fiscalYear.id}
                onClick={() => {
                  onFiscalYearChange(fiscalYear);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                  selectedFiscalYear?.id === fiscalYear.id ? 'bg-blue-50 text-blue-900' : ''
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
                  {fiscalYear.isCurrent && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Current
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{getStatusText(fiscalYear)}</span>
                </div>
              </button>
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
};

export default FiscalYearSelector;
