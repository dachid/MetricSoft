'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Lock, Calendar, Building2, Users, Activity } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui';

interface OrgUnit {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  levelDefinition: {
    id: string;
    name: string;
    level: number;
  };
  kpiChampions: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
}

interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'locked' | 'archived';
  isCurrent: boolean;
  confirmations: Array<{
    id: string;
    confirmationType: string;
    confirmedAt: string;
    confirmedBy: string; // User ID string
  }>;
  _count: {
    levelDefinitions: number;
  };
}

interface StructureConfirmationProps {
  fiscalYear: FiscalYear;
  orgUnits: OrgUnit[];
  tenantId: string;
  onConfirmationUpdate: (updatedFiscalYear: FiscalYear) => void;
  className?: string;
}

export const StructureConfirmation: React.FC<StructureConfirmationProps> = ({
  fiscalYear,
  orgUnits,
  tenantId,
  onConfirmationUpdate,
  className = ""
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if structure is already confirmed
  const structureConfirmation = fiscalYear.confirmations.find(
    c => c.confirmationType === 'org_structure'
  );
  const isConfirmed = !!structureConfirmation;

  // Structure validation
  const validateStructure = () => {
    const issues: string[] = [];

    // Check if there are organizational units
    if (orgUnits.length === 0) {
      issues.push('No organizational units have been created');
    }

    // Check if there are level definitions
    if (fiscalYear._count.levelDefinitions === 0) {
      issues.push('No organizational levels have been defined');
    }

    // Check for orphaned units (units without valid parent hierarchy)
    const unitMap = new Map(orgUnits.map(unit => [unit.id, unit]));
    orgUnits.forEach(unit => {
      if (unit.parentId && !unitMap.has(unit.parentId)) {
        issues.push(`Unit "${unit.name}" has an invalid parent reference`);
      }
    });

    // Check for circular references
    const hasCircularReference = (unitId: string, visited: Set<string> = new Set()): boolean => {
      if (visited.has(unitId)) return true;
      visited.add(unitId);
      
      const unit = unitMap.get(unitId);
      if (unit?.parentId) {
        return hasCircularReference(unit.parentId, visited);
      }
      return false;
    };

    orgUnits.forEach(unit => {
      if (hasCircularReference(unit.id)) {
        issues.push(`Circular reference detected in unit "${unit.name}"`);
      }
    });

    // Check if root level units exist
    const rootUnits = orgUnits.filter(unit => !unit.parentId);
    if (rootUnits.length === 0 && orgUnits.length > 0) {
      issues.push('No root-level organizational units found');
    }

    return issues;
  };

  const validationIssues = validateStructure();
  const canConfirm = validationIssues.length === 0 && !isConfirmed;

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const token = localStorage.getItem('metricsoft_auth_token');
      const response = await fetch(
        `http://localhost:5000/api/tenants/${tenantId}/fiscal-years/${fiscalYear.id}/confirm-structure`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm structure');
      }

      const result = await response.json();
      onConfirmationUpdate(result.data);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error confirming structure:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm structure');
    } finally {
      setIsConfirming(false);
    }
  };

  // Calculate structure stats
  const structureStats = {
    totalUnits: orgUnits.length,
    levels: new Set(orgUnits.map(unit => unit.levelDefinition.level)).size,
    totalChampions: orgUnits.reduce((total, unit) => total + unit.kpiChampions.length, 0),
    unitsWithChampions: orgUnits.filter(unit => unit.kpiChampions.length > 0).length,
    unitsWithoutChampions: orgUnits.filter(unit => unit.kpiChampions.length === 0).length
  };

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              {isConfirmed ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              )}
              Structure Confirmation
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {isConfirmed 
                ? 'Organizational structure has been confirmed and locked'
                : 'Review and confirm the organizational structure to proceed'
              }
            </p>
          </div>
          
          {isConfirmed && (
            <div className="flex items-center space-x-2 text-green-600">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Confirmed</span>
            </div>
          )}
        </div>
      </div>

      {/* Structure Stats */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Structure Overview</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{structureStats.totalUnits}</div>
            <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
              <Building2 className="w-3 h-3 mr-1" />
              Total Units
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{structureStats.levels}</div>
            <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
              <Activity className="w-3 h-3 mr-1" />
              Org Levels
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{structureStats.totalChampions}</div>
            <div className="text-xs text-gray-600 mt-1 flex items-center justify-center">
              <Users className="w-3 h-3 mr-1" />
              KPI Champions
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">
              {structureStats.unitsWithoutChampions > 0 ? structureStats.unitsWithoutChampions : '✓'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {structureStats.unitsWithoutChampions > 0 ? 'Without Champions' : 'All Assigned'}
            </div>
          </div>
        </div>
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-sm font-medium text-red-900 mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Issues to Resolve
          </h4>
          <ul className="space-y-2">
            {validationIssues.map((issue, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {structureStats.unitsWithoutChampions > 0 && validationIssues.length === 0 && (
        <div className="p-6 border-b border-gray-200 bg-amber-50">
          <h4 className="text-sm font-medium text-amber-900 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Recommendations
          </h4>
          <p className="text-sm text-amber-700">
            {structureStats.unitsWithoutChampions} organizational unit(s) do not have KPI Champions assigned. 
            While not required, it's recommended to assign champions for better performance management.
          </p>
        </div>
      )}

      {/* Confirmation Status */}
      <div className="p-6">
        {isConfirmed ? (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900">Structure Confirmed</h4>
                <p className="text-sm text-green-700 mt-1">
                  Confirmed on {new Date(structureConfirmation!.confirmedAt).toLocaleDateString()} by user {structureConfirmation!.confirmedBy}
                </p>
                <div className="mt-3 flex items-center space-x-2 text-xs text-green-600">
                  <Lock className="w-3 h-3" />
                  <span>Structure is now locked for {fiscalYear.name}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Ready to Confirm?</h4>
              <p className="text-sm text-gray-600">
                Once confirmed, the organizational structure for <strong>{fiscalYear.name}</strong> will be locked 
                and cannot be modified. This enables the setup of performance components and other dependent features.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <Calendar className="w-3 h-3 inline mr-1" />
                Fiscal Year: {fiscalYear.name}
              </div>
              
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canConfirm || isConfirming}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  canConfirm && !isConfirming
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isConfirming ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Confirming...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2 inline" />
                    Confirm Structure
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        title="Confirm Organizational Structure"
        message={`Are you sure you want to confirm and lock the organizational structure for ${fiscalYear.name}?\n\nThis action will:\n• Lock the current structure configuration\n• Prevent further modifications to organizational units\n• Enable performance component setup\n• Allow the performance management process to begin\n\nThis action cannot be undone.`}
        confirmText="Yes, Confirm Structure"
        cancelText="Cancel"
        isLoading={isConfirming}
      />
    </div>
  );
};

export default StructureConfirmation;
