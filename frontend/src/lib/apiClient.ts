interface ApiError {
  code?: string;
  message: string;
  details?: string;
  statusCode?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();
      
      // If the response is not ok, return as error
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'HTTP_ERROR',
            message: data.error?.message || data.error || 'Request failed',
            details: data.error?.details,
            statusCode: response.status,
          },
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
      // Network error, server unreachable, etc.
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
          statusCode: 0,
        },
      };
    }
  }

  // Public methods
  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }

  // Health check
  async checkHealth(): Promise<ApiResponse<{
    status: string;
    services: {
      database: { status: 'up' | 'down'; error?: string };
      api: { status: 'up' | 'down' };
    };
  }>> {
    return this.get('/health');
  }

  // Specific error handling methods
  isNetworkError(error: ApiError): boolean {
    return error.code === 'NETWORK_ERROR';
  }

  isDatabaseError(error: ApiError): boolean {
    const dbErrorCodes = [
      'DATABASE_UNAVAILABLE',
      'DATABASE_CONNECTION_FAILED',
      'DATABASE_CONNECTION_LOST',
      'DATABASE_TIMEOUT',
    ];
    return dbErrorCodes.includes(error.code || '');
  }

  isAuthError(error: ApiError): boolean {
    const authErrorCodes = ['AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS'];
    return authErrorCodes.includes(error.code || '') || error.statusCode === 401;
  }

  isRetryableError(error: ApiError): boolean {
    return this.isDatabaseError(error) || this.isNetworkError(error) || error.code === 'INTERNAL_ERROR';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// React hooks for common API operations
export const useApi = () => {
  const handleApiResponse = <T>(response: ApiResponse<T>) => {
    if (!response.success && response.error) {
      // Log the error for debugging
      console.error('API Error:', response.error);
      
      // You could integrate with a toast notification system here
      if (apiClient.isDatabaseError(response.error)) {
        console.warn('Database connectivity issue detected');
      }
    }
    
    return response;
  };

  return {
    get: async <T>(endpoint: string, options?: RequestInit) => {
      const response = await apiClient.get<T>(endpoint, options);
      return handleApiResponse(response);
    },
    post: async <T>(endpoint: string, data?: any, options?: RequestInit) => {
      const response = await apiClient.post<T>(endpoint, data, options);
      return handleApiResponse(response);
    },
    put: async <T>(endpoint: string, data?: any, options?: RequestInit) => {
      const response = await apiClient.put<T>(endpoint, data, options);
      return handleApiResponse(response);
    },
    delete: async <T>(endpoint: string, options?: RequestInit) => {
      const response = await apiClient.delete<T>(endpoint, options);
      return handleApiResponse(response);
    },
  };
};

export default apiClient;
