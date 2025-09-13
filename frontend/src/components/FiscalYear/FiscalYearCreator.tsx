/**
 * Fiscal Year Creator Component
 * Modal/form for creating new fiscal years
 */

'use client';

import React, { useState } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
}

interface FiscalYearCreatorProps {
  tenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onFiscalYearCreated: (fiscalYear: FiscalYear) => void;
}

const FiscalYearCreator: React.FC<FiscalYearCreatorProps> = ({
  tenantId,
  isOpen,
  onClose,
  onFiscalYearCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate fiscal year suggestions based on current year
  const generateYearSuggestions = () => {
    const currentYear = new Date().getFullYear();
    return [
      { name: `FY ${currentYear}`, startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31` },
      { name: `FY ${currentYear + 1}`, startDate: `${currentYear + 1}-01-01`, endDate: `${currentYear + 1}-12-31` },
      { name: `${currentYear}`, startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31` },
      { name: `${currentYear + 1}`, startDate: `${currentYear + 1}-01-01`, endDate: `${currentYear + 1}-12-31` }
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post(`/tenants/${tenantId}/fiscal-years`, formData);

      if (response.success) {
        onFiscalYearCreated(response.data as FiscalYear);
        onClose();
        // Reset form
        setFormData({
          name: '',
          startDate: '',
          endDate: '',
          isCurrent: false
        });
      } else {
        setError(response.error?.message || 'Failed to create fiscal year');
      }
    } catch (error) {
      console.error('Error creating fiscal year:', error);
      setError('Failed to create fiscal year. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setFormData({
      ...formData,
      name: suggestion.name,
      startDate: suggestion.startDate,
      endDate: suggestion.endDate
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Create New Fiscal Year</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Quick Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Suggestions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {generateYearSuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300"
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          </div>

          {/* Fiscal Year Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fiscal Year Name*
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., FY 2025, 2025, Fiscal Year 2025"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date*
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date*
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Set as Current */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isCurrent"
              checked={formData.isCurrent}
              onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isCurrent" className="ml-2 text-sm text-gray-700">
              Set as current fiscal year
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Create Fiscal Year'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FiscalYearCreator;
