import React from 'react';
import { AlertTriangle, Wifi, RefreshCw, Server, Clock, AlertCircle, Lock } from 'lucide-react';

interface ErrorDisplayProps {
  error: {
    code?: string;
    message: string;
    statusCode?: number;
    details?: string;
  };
  onRetry?: () => void;
  showDetails?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  showDetails = false 
}) => {
  const getErrorIcon = (code?: string) => {
    switch (code) {
      case 'DATABASE_UNAVAILABLE':
      case 'DATABASE_CONNECTION_FAILED':
      case 'DATABASE_CONNECTION_LOST':
        return <Server className="h-6 w-6 text-amber-500" />;
      case 'DATABASE_TIMEOUT':
        return <Clock className="h-6 w-6 text-amber-500" />;
      case 'AUTHENTICATION_REQUIRED':
        return <Lock className="h-6 w-6 text-red-500" />;
      case 'INSUFFICIENT_PERMISSIONS':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'VALIDATION_ERROR':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'NOT_FOUND':
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getErrorColor = (code?: string) => {
    switch (code) {
      case 'DATABASE_UNAVAILABLE':
      case 'DATABASE_CONNECTION_FAILED':
      case 'DATABASE_CONNECTION_LOST':
      case 'DATABASE_TIMEOUT':
        return 'border-amber-200 bg-amber-50';
      case 'AUTHENTICATION_REQUIRED':
      case 'INSUFFICIENT_PERMISSIONS':
        return 'border-red-200 bg-red-50';
      case 'VALIDATION_ERROR':
        return 'border-yellow-200 bg-yellow-50';
      case 'NOT_FOUND':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  const isRetryable = (code?: string) => {
    const retryableCodes = [
      'DATABASE_UNAVAILABLE',
      'DATABASE_CONNECTION_FAILED',
      'DATABASE_CONNECTION_LOST',
      'DATABASE_TIMEOUT',
      'INTERNAL_ERROR',
      'UNKNOWN_ERROR'
    ];
    return retryableCodes.includes(code || '');
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${getErrorColor(error.code)}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon(error.code)}
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-gray-900">
            {error.code === 'DATABASE_UNAVAILABLE' && 'Service Temporarily Unavailable'}
            {error.code === 'DATABASE_CONNECTION_FAILED' && 'Connection Failed'}
            {error.code === 'DATABASE_CONNECTION_LOST' && 'Connection Lost'}
            {error.code === 'DATABASE_TIMEOUT' && 'Request Timeout'}
            {error.code === 'AUTHENTICATION_REQUIRED' && 'Authentication Required'}
            {error.code === 'INSUFFICIENT_PERMISSIONS' && 'Access Denied'}
            {error.code === 'VALIDATION_ERROR' && 'Invalid Input'}
            {error.code === 'NOT_FOUND' && 'Not Found'}
            {!error.code && 'Error'}
          </h3>
          <div className="mt-2 text-sm text-gray-700">
            <p>{error.message}</p>
          </div>
          
          {showDetails && error.details && (
            <div className="mt-4">
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer font-medium">Technical Details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {error.details}
                </pre>
              </details>
            </div>
          )}
          
          {(onRetry && isRetryable(error.code)) && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          )}
          
          {error.code?.includes('DATABASE') && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Wifi className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    We're experiencing connectivity issues. Please try again in a few moments.
                    If the problem persists, please contact support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook for handling API errors consistently
export const useErrorHandler = () => {
  const handleError = (error: any) => {
    // Parse different error formats
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.error) {
      return error.error;
    }
    
    if (error.message) {
      return {
        code: 'CLIENT_ERROR',
        message: error.message
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred'
    };
  };
  
  return { handleError };
};

// Toast notification for errors
export const showErrorToast = (error: any) => {
  const { handleError } = useErrorHandler();
  const parsedError = handleError(error);
  
  // This would integrate with your toast system (react-hot-toast, etc.)
  console.error('Error:', parsedError);
  
  return parsedError;
};

export default ErrorDisplay;
