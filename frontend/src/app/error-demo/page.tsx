'use client';

import { useState, useEffect } from 'react';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { DatabaseStatus } from '@/components/ui/DatabaseStatus';
import { useApi } from '@/lib/apiClient';

export default function ErrorHandlingDemo() {
  const [authError, setAuthError] = useState<any>(null);
  const [dbError, setDbError] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const api = useApi();

  const testDatabaseConnection = async () => {
    setLoading(true);
    setDbError(null);
    
    const response = await api.get('/health');
    
    if (!response.success) {
      setDbError(response.error);
    }
    
    setLoading(false);
  };

  const testAuthenticatedRequest = async () => {
    setLoading(true);
    setAuthError(null);
    
    // This will likely fail since we don't have a valid token
    const response = await api.get('/auth/me');
    
    if (!response.success) {
      setAuthError(response.error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    // Test both endpoints on load
    testDatabaseConnection();
    testAuthenticatedRequest();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Error Handling Demo
        </h1>
        <p className="text-gray-600 mb-8">
          This page demonstrates how the application handles different types of errors gracefully.
        </p>
      </div>

      {/* Database Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Database Connection Status</h2>
          <DatabaseStatus />
        </div>
        
        <div className="space-y-4">
          <button
            onClick={testDatabaseConnection}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Database Connection'}
          </button>
          
          {dbError && (
            <ErrorDisplay 
              error={dbError} 
              onRetry={testDatabaseConnection}
              showDetails={true}
            />
          )}
        </div>
      </div>

      {/* Authentication Error */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Error Demo</h2>
        
        <div className="space-y-4">
          <button
            onClick={testAuthenticatedRequest}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Authentication Required'}
          </button>
          
          {authError && (
            <ErrorDisplay 
              error={authError} 
              showDetails={true}
            />
          )}
        </div>
      </div>

      {/* Error Types Examples */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Different Error Types</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Database Unavailable</h3>
            <ErrorDisplay 
              error={{
                code: 'DATABASE_UNAVAILABLE',
                message: 'Service temporarily unavailable. Please try again later.'
              }}
              onRetry={() => console.log('Retry clicked')}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <ErrorDisplay 
              error={{
                code: 'AUTHENTICATION_REQUIRED',
                message: 'You must be logged in to access this resource.'
              }}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Validation Error</h3>
            <ErrorDisplay 
              error={{
                code: 'VALIDATION_ERROR',
                message: 'Please check your input and try again.',
                details: 'Email field is required'
              }}
              showDetails={true}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Network Error</h3>
            <ErrorDisplay 
              error={{
                code: 'NETWORK_ERROR',
                message: 'Unable to connect to the server. Please check your connection.'
              }}
              onRetry={() => console.log('Retry clicked')}
            />
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">Error Handling Best Practices</h2>
        
        <ul className="space-y-3 text-blue-800">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500">•</span>
            <span className="ml-2">Database connection errors show user-friendly messages instead of technical details</span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500">•</span>
            <span className="ml-2">Users can retry failed operations when appropriate</span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500">•</span>
            <span className="ml-2">Different error types have appropriate visual indicators and messages</span>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-5 h-5 mt-0.5 text-blue-500">•</span>
            <span className="ml-2">System status is monitored and displayed in real-time</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
