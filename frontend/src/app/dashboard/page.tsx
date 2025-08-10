'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
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

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                MetricSoft Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.name || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🎉 Frontend-Backend Connection Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                Your MetricSoft application is now running with complete separation between frontend and backend.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Architecture Status
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>✅ Backend API running on port 5000</li>
                        <li>✅ Frontend app running on port 3000</li>
                        <li>✅ Database migrations completed</li>
                        <li>✅ Authentication working</li>
                        <li>✅ REST API communication established</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-left bg-gray-50 rounded-md p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">User Information:</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
