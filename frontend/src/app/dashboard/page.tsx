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
