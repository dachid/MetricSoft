'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/Layout/DashboardLayout'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-2xl font-bold text-blue-600 mb-4">
            MetricSoft
          </div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Performance Management Overview">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tenant Configuration</h3>
            <p className="text-sm text-gray-600 mb-4">Configure your organization settings and terminology</p>
            <button 
              onClick={() => router.push('/settings')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Configure Settings
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Data</h3>
            <p className="text-sm text-gray-600 mb-4">View and manage performance metrics</p>
            <button 
              disabled
              className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports</h3>
            <p className="text-sm text-gray-600 mb-4">Generate performance reports and analytics</p>
            <button 
              disabled
              className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Welcome to MetricSoft</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Welcome back, {user.name || user.email}! Your performance management platform is ready to be configured.
            </p>
            <p className="text-sm text-gray-500">
              Start by configuring your tenant settings to customize the terminology, fiscal periods, and branding for your organization.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
