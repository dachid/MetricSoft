'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Calendar, Building2, Target, Eye, Palette, ArrowRight } from 'lucide-react';

function SettingsRedirectContent() {
  const { user } = useAuth();

  // Auto-redirect after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/fiscal-year';
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900">Settings Have Been Reorganized</h3>
            <p className="text-blue-700 mt-1">
              The organization settings have been split into dedicated pages for better navigation and workflow.
            </p>
          </div>
        </div>
        <div className="bg-blue-100 rounded-md p-4">
          <p className="text-sm text-blue-800">
            You will be automatically redirected to the Fiscal Year page in 5 seconds...
          </p>
        </div>
      </div>

      {/* New Pages Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">New Configuration Pages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Fiscal Year */}
          <a
            href="/fiscal-year"
            className="block p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Calendar className="w-8 h-8 text-blue-600 group-hover:text-blue-700" />
              <h3 className="text-lg font-semibold text-blue-900">Fiscal Year</h3>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              Manage fiscal years and organizational timeline. Create and configure fiscal periods.
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Organizational Structure */}
          <a
            href="/organizational-structure"
            className="block p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:border-green-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Building2 className="w-8 h-8 text-green-600 group-hover:text-green-700" />
              <h3 className="text-lg font-semibold text-green-900">Organizational Structure</h3>
            </div>
            <p className="text-green-700 text-sm mb-4">
              Configure organizational levels and hierarchy. Define the structure of your organization.
            </p>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <span>Configure Structure</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Performance Components */}
          <a
            href="/performance-components"
            className="block p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:border-purple-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Target className="w-8 h-8 text-purple-600 group-hover:text-purple-700" />
              <h3 className="text-lg font-semibold text-purple-900">Performance Components</h3>
            </div>
            <p className="text-purple-700 text-sm mb-4">
              Configure performance management components for each organizational level.
            </p>
            <div className="flex items-center text-purple-600 text-sm font-medium">
              <span>Setup Components</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Branding */}
          <a
            href="/branding"
            className="block p-6 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border border-pink-200 hover:border-pink-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <Palette className="w-8 h-8 text-pink-600 group-hover:text-pink-700" />
              <h3 className="text-lg font-semibold text-pink-900">Branding</h3>
            </div>
            <p className="text-pink-700 text-sm mb-4">
              Customize your organization's appearance and brand identity.
            </p>
            <div className="flex items-center text-pink-600 text-sm font-medium">
              <span>Customize Branding</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Dashboard */}
          <a
            href="/dashboard"
            className="block p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all group"
          >
            <div className="flex items-center space-x-3 mb-3">
              <svg className="w-8 h-8 text-gray-600 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Dashboard</h3>
            </div>
            <p className="text-gray-700 text-sm mb-4">
              View your main dashboard with performance metrics and insights.
            </p>
            <div className="flex items-center text-gray-600 text-sm font-medium">
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>
      </div>

      {/* Configuration Flow */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Configuration Flow</h3>
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">1</div>
            <span className="font-medium text-gray-900">Fiscal Year</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold">2</div>
            <span className="font-medium text-gray-900">Org Structure</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">3</div>
            <span className="font-medium text-gray-900">Performance Components</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-semibold">4</div>
            <span className="font-medium text-gray-900">Branding</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Follow this flow for the best setup experience. Each step builds upon the previous one.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => window.location.href = '/fiscal-year'}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Start with Fiscal Year
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ORGANIZATION_ADMIN']}>
      <DashboardLayout title="Settings Reorganization" subtitle="Configuration has been moved to dedicated pages">
        <SettingsRedirectContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
