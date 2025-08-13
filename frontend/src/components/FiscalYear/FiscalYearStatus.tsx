/**
 * Fiscal Year Status Component
 * Shows the current fiscal year status and confirmation information
 */

'use client';

import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Calendar, Users, Target } from 'lucide-react';

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
    confirmedBy?: string;
  }>;
  _count: {
    levelDefinitions: number;
    perspectives: number;
  };
}

interface FiscalYearStatusProps {
  fiscalYear: FiscalYear;
  className?: string;
}

const FiscalYearStatus: React.FC<FiscalYearStatusProps> = ({ fiscalYear, className = '' }) => {
  const orgConfirmed = fiscalYear.confirmations.some(c => c.confirmationType === 'org_structure');
  const perfConfirmed = fiscalYear.confirmations.some(c => c.confirmationType === 'performance_components');

  const getProgressSteps = () => {
    return [
      {
        id: 'org_structure',
        title: 'Organizational Structure',
        description: 'Define organizational levels and hierarchy',
        icon: Users,
        completed: orgConfirmed,
        count: fiscalYear._count.levelDefinitions
      },
      {
        id: 'performance_components',
        title: 'Performance Components',
        description: 'Configure performance management system',
        icon: Target,
        completed: perfConfirmed,
        count: fiscalYear._count.perspectives
      }
    ];
  };

  const getOverallStatus = () => {
    if (fiscalYear.status === 'archived') return { status: 'archived', label: 'Archived', color: 'gray' };
    if (fiscalYear.status === 'locked') return { status: 'locked', label: 'Locked', color: 'gray' };
    if (orgConfirmed && perfConfirmed) return { status: 'complete', label: 'Complete', color: 'green' };
    if (orgConfirmed) return { status: 'partial', label: 'Partially Complete', color: 'blue' };
    return { status: 'draft', label: 'Draft', color: 'yellow' };
  };

  const overallStatus = getOverallStatus();
  const progressSteps = getProgressSteps();
  const completedSteps = progressSteps.filter(step => step.completed).length;

  return (
    <div className={`bg-white border rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start space-x-3">
          <Calendar className="w-6 h-6 text-blue-500 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{fiscalYear.name}</h3>
            <p className="text-sm text-gray-600">
              {new Date(fiscalYear.startDate).toLocaleDateString()} - {new Date(fiscalYear.endDate).toLocaleDateString()}
            </p>
            {fiscalYear.isCurrent && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                Current Fiscal Year
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            overallStatus.color === 'green' ? 'bg-green-100 text-green-800' :
            overallStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
            overallStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {overallStatus.color === 'green' && <CheckCircle className="w-4 h-4 mr-1.5" />}
            {overallStatus.color === 'blue' && <Clock className="w-4 h-4 mr-1.5" />}
            {overallStatus.color === 'yellow' && <AlertTriangle className="w-4 h-4 mr-1.5" />}
            {overallStatus.label}
          </span>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Setup Progress</span>
          <span>{completedSteps} of {progressSteps.length} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedSteps / progressSteps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-4">
        {progressSteps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              step.completed 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              {step.completed ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <step.icon className="w-4 h-4" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${
                  step.completed ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <span className="text-xs text-gray-500">
                  {step.count} {step.count === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Details */}
      {fiscalYear.confirmations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Confirmed Components</h4>
          <div className="space-y-2">
            {fiscalYear.confirmations.map((confirmation, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {confirmation.confirmationType === 'org_structure' ? 'Organizational Structure' : 'Performance Components'}
                </span>
                <span className="text-gray-500">
                  Confirmed {new Date(confirmation.confirmedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalYearStatus;
