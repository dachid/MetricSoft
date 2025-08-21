import React from 'react';
import { ErrorHandler, FrontendError, FrontendErrorCode } from './errorHandler';

interface ApiError {
  code?: string;
  message: string;
  details?: string;
  statusCode?: number;
  correlationId?: string;
  field?: string;
  retryable?: boolean;
  retryAfter?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  private defaultTimeout = 30000; // 30 seconds
  private abortControllers = new Map<string, AbortController>();
  private csrfToken: string | null = null;

  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    
    // Only set up global error listeners on client side
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
      window.addEventListener('error', this.handleGlobalError);
    }
  }

  // Get CSRF token from cookie
  private getCSRFToken(): string | null {
    if (typeof document === 'undefined') return null;
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1] || null;
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (event.reason && typeof event.reason === 'object' && 'code' in event.reason) {
      // This might be one of our API errors
      const error = ErrorHandler.handleApiError(event.reason);
      console.warn('Unhandled promise rejection:', error);
    }
  };

  private handleGlobalError = (event: ErrorEvent) => {
    const error = ErrorHandler.handleComponentError(
      new Error(event.message),
      'GlobalError',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
    console.warn('Global error:', error);
  };

  private createRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async requestWithTimeout<T>(
    url: string,
    options: RequestConfig = {}
  ): Promise<Response> {
    const { timeout = this.defaultTimeout, ...fetchOptions } = options;
    const requestId = this.createRequestId();
    
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        credentials: 'include', // Always include HTTP-only cookies
        headers: {
          ...this.defaultHeaders,
          ...fetchOptions.headers,
          'X-Request-ID': requestId,
          // Add CSRF token if available
          ...(this.getCSRFToken() && { 'x-csrf-token': this.getCSRFToken()! }),
        },
      });

      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw ErrorHandler.handleNetworkError(
            new Error('Request timeout'),
            { requestId, url, timeout }
          );
        }
        throw ErrorHandler.handleNetworkError(error, { requestId, url });
      }
      
      throw error;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const { retries = 0, retryDelay = 1000, ...requestOptions } = options;
    
    const executeRequest = async (): Promise<ApiResponse<T>> => {
      try {
        const response = await this.requestWithTimeout(url, requestOptions);
        
        // Handle different content types
        let data: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('text/')) {
          const text = await response.text();
          data = { message: text };
        } else {
          data = { message: 'Unexpected response format' };
        }
        
        // If the response is not ok, handle as error
        if (!response.ok) {
          const apiError: ApiError = {
            code: data.error?.code || 'HTTP_ERROR',
            message: data.error?.message || data.error || data.message || 'Request failed',
            details: data.error?.details,
            statusCode: response.status,
            correlationId: data.error?.correlationId || response.headers.get('X-Request-ID'),
            field: data.error?.field,
            retryable: data.error?.retryable,
            retryAfter: data.error?.retryAfter
          };

          const frontendError = ErrorHandler.handleHttpError(
            response.status,
            response.statusText,
            { url, method: requestOptions.method, apiError }
          );

          return {
            success: false,
            error: apiError,
          };
        }

        // Handle both old format ({ data }) and new format ({ success, data })
        if (data.success !== undefined) {
          return data;
        } else {
          return {
            success: true,
            data: data.data || data,
          };
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          // This is already a handled FrontendError
          return {
            success: false,
            error: {
              code: (error as any).code,
              message: error.message,
              statusCode: 0,
            },
          };
        }

        // Network error, server unreachable, etc.
        const networkError = ErrorHandler.handleNetworkError(
          error instanceof Error ? error : new Error('Unknown network error'),
          { url, method: requestOptions.method }
        );

        return {
          success: false,
          error: {
            code: networkError.code,
            message: networkError.message,
            details: networkError.details,
            statusCode: 0,
          },
        };
      }
    };

    // Implement retry logic using ErrorHandler.withRetry
    if (retries > 0) {
      try {
        return await ErrorHandler.withRetry(
          executeRequest,
          retries + 1, // +1 because withRetry counts total attempts, not retries
          retryDelay,
          `${requestOptions.method || 'GET'}-${endpoint}`
        );
      } catch (error) {
        // If retries exhausted, return the last error
        return await executeRequest();
      }
    }

    return executeRequest();
  }

  // Public methods with enhanced error handling
  async get<T>(endpoint: string, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async postFile<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      // For file uploads, we use a simpler approach without the complex header merging
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important for HTTP-only cookies
        headers: {
          'X-Request-ID': requestId,
          // Add CSRF token if available
          ...(this.getCSRFToken() && { 'x-csrf-token': this.getCSRFToken()! }),
          // Explicitly don't set Content-Type - let browser set it with boundary
        },
        ...options,
      });

      // Handle different content types
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        const text = await response.text();
        data = { message: text };
      } else {
        data = {};
      }

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'HTTP_ERROR',
            message: data.error || data.message || `HTTP ${response.status}`,
            statusCode: response.status,
            correlationId: response.headers.get('x-correlation-id') || undefined,
          }
        };
      }

      return {
        success: true,
        data: data.data || data
      };

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred'
        }
      };
    }
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // Enhanced authentication methods - now for CSRF token management
  setCSRFToken(token: string) {
    this.csrfToken = token;
  }

  clearCSRFToken() {
    this.csrfToken = null;
  }

  // Legacy methods for backward compatibility (now no-ops)
  setAuthToken(token: string) {
    // No longer needed with HTTP-only cookies
    console.warn('setAuthToken is deprecated - authentication now uses HTTP-only cookies');
  }

  clearAuthToken() {
    // No longer needed with HTTP-only cookies
    console.warn('clearAuthToken is deprecated - authentication now uses HTTP-only cookies');
  }

  // Cancel all pending requests
  cancelAllRequests() {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  // Health check with retry logic
  async checkHealth(): Promise<ApiResponse<{
    status: string;
    services: {
      database: { status: 'up' | 'down'; error?: string };
      api: { status: 'up' | 'down' };
    };
  }>> {
    return this.get('/health', { 
      timeout: 10000, // Shorter timeout for health checks
      retries: 2,
      retryDelay: 500
    });
  }

  // Connection test
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.checkHealth();
      return response.success;
    } catch {
      return false;
    }
  }

  // Enhanced error checking methods
  isNetworkError(error: ApiError): boolean {
    return error.code === 'NETWORK_ERROR' || error.code === 'CONNECTION_LOST' || error.code === 'TIMEOUT_ERROR';
  }

  isDatabaseError(error: ApiError): boolean {
    const dbErrorCodes = [
      'DATABASE_UNAVAILABLE',
      'DATABASE_CONNECTION_FAILED',
      'DATABASE_CONNECTION_LOST',
      'DATABASE_TIMEOUT',
      'DATABASE_ERROR'
    ];
    return dbErrorCodes.includes(error.code || '');
  }

  isAuthError(error: ApiError): boolean {
    const authErrorCodes = ['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS', 'UNAUTHORIZED'];
    return authErrorCodes.includes(error.code || '') || error.statusCode === 401 || error.statusCode === 403;
  }

  isValidationError(error: ApiError): boolean {
    return error.code === 'VALIDATION_ERROR' || error.code === 'REQUIRED_FIELD' || error.code === 'INVALID_FORMAT';
  }

  isRetryableError(error: ApiError): boolean {
    return (
      this.isDatabaseError(error) || 
      this.isNetworkError(error) || 
      error.code === 'INTERNAL_ERROR' ||
      error.code === 'RATE_LIMITED' ||
      error.retryable === true ||
      (error.statusCode !== undefined && error.statusCode >= 500)
    );
  }

  // Get retry delay from error or use default
  getRetryDelay(error: ApiError): number {
    if (error.retryAfter) {
      return error.retryAfter * 1000; // Convert seconds to milliseconds
    }
    if (error.code === 'RATE_LIMITED') {
      return 5000; // 5 seconds for rate limiting
    }
    return 1000; // Default 1 second
  }

  // Clean up on instance destruction
  destroy() {
    this.cancelAllRequests();
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
      window.removeEventListener('error', this.handleGlobalError);
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// React hooks for common API operations with enhanced error handling
export const useApi = () => {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'connecting' | 'disconnected'>('connected');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('connected');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleApiResponse = <T>(response: ApiResponse<T>, endpoint: string) => {
    if (!response.success && response.error) {
      // Enhanced error logging and handling
      console.error('API Error:', {
        endpoint,
        error: response.error,
        timestamp: new Date().toISOString()
      });
      
      // Handle different error types
      if (apiClient.isDatabaseError(response.error)) {
        console.warn('Database connectivity issue detected');
        setConnectionStatus('connecting');
      } else if (apiClient.isNetworkError(response.error)) {
        console.warn('Network connectivity issue detected');
        setConnectionStatus('disconnected');
      } else if (apiClient.isAuthError(response.error)) {
        console.warn('Authentication error detected');
        // Could trigger logout or token refresh here
      }
    } else if (response.success) {
      // Reset connection status on successful requests
      if (connectionStatus !== 'connected') {
        setConnectionStatus('connected');
      }
    }
    
    return response;
  };

  const makeRequest = async <T>(
    requestFn: () => Promise<ApiResponse<T>>,
    endpoint: string,
    options?: {
      retryOnNetworkError?: boolean;
      showOfflineMessage?: boolean;
    }
  ): Promise<ApiResponse<T>> => {
    const { retryOnNetworkError = true, showOfflineMessage = true } = options || {};

    // Check if offline
    if (!isOnline && showOfflineMessage) {
      const offlineError: ApiResponse<T> = {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'You are currently offline. Please check your internet connection.'
        }
      };
      return handleApiResponse(offlineError, endpoint);
    }

    try {
      const response = await requestFn();
      return handleApiResponse(response, endpoint);
    } catch (error) {
      // Handle unexpected errors
      const errorResponse: ApiResponse<T> = {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      };
      return handleApiResponse(errorResponse, endpoint);
    }
  };

  return {
    // Enhanced request methods
    get: async <T>(endpoint: string, options?: RequestConfig & {
      retryOnNetworkError?: boolean;
      showOfflineMessage?: boolean;
    }) => {
      const { retryOnNetworkError, showOfflineMessage, ...requestOptions } = options || {};
      return makeRequest(
        () => apiClient.get<T>(endpoint, requestOptions),
        endpoint,
        { retryOnNetworkError, showOfflineMessage }
      );
    },

    post: async <T>(endpoint: string, data?: any, options?: RequestConfig & {
      retryOnNetworkError?: boolean;
      showOfflineMessage?: boolean;
    }) => {
      const { retryOnNetworkError, showOfflineMessage, ...requestOptions } = options || {};
      return makeRequest(
        () => apiClient.post<T>(endpoint, data, requestOptions),
        endpoint,
        { retryOnNetworkError, showOfflineMessage }
      );
    },

    postFile: async <T>(endpoint: string, formData: FormData, options?: RequestConfig & {
      retryOnNetworkError?: boolean;
      showOfflineMessage?: boolean;
    }) => {
      const { retryOnNetworkError, showOfflineMessage, ...requestOptions } = options || {};
      return makeRequest(
        () => apiClient.postFile<T>(endpoint, formData, requestOptions),
        endpoint,
        { retryOnNetworkError, showOfflineMessage }
      );
    },

    put: async <T>(endpoint: string, data?: any, options?: RequestConfig & {
      retryOnNetworkError?: boolean;
      showOfflineMessage?: boolean;
    }) => {
      const { retryOnNetworkError, showOfflineMessage, ...requestOptions } = options || {};
      return makeRequest(
        () => apiClient.put<T>(endpoint, data, requestOptions),
        endpoint,
        { retryOnNetworkError, showOfflineMessage }
      );
    },

    delete: async <T>(endpoint: string, options?: RequestConfig & {
      retryOnNetworkError?: boolean;
      showOfflineMessage?: boolean;
    }) => {
      const { retryOnNetworkError, showOfflineMessage, ...requestOptions } = options || {};
      return makeRequest(
        () => apiClient.delete<T>(endpoint, requestOptions),
        endpoint,
        { retryOnNetworkError, showOfflineMessage }
      );
    },

    // Status information
    isOnline,
    connectionStatus,
    
    // Utility methods
    testConnection: apiClient.testConnection.bind(apiClient),
    cancelAllRequests: apiClient.cancelAllRequests.bind(apiClient),
  };
};

export default apiClient;
