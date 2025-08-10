import axios from 'axios'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'

// Create axios instance
export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('metricsoft_auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on 401
      localStorage.removeItem('metricsoft_auth_token')
      localStorage.removeItem('metricsoft_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface AuthUser {
  id: string
  email: string
  name: string | null
  tenantId: string | null
  roles: Array<{
    id: string
    name: string
    code: string
    permissions: string[]
  }>
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name?: string
  tenantId?: string
}

export interface PasswordlessRequest {
  email: string
}

export interface PasswordlessVerification {
  email: string
  code: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  details?: any
}

// Authentication API
export const authApi = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    const response = await apiClient.post('/api/auth/login', credentials)
    return response.data
  },

  async register(credentials: RegisterCredentials): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    const response = await apiClient.post('/api/auth/register', credentials)
    return response.data
  },

  async sendPasswordlessCode(request: PasswordlessRequest): Promise<ApiResponse> {
    const response = await apiClient.post('/api/auth/passwordless', {
      action: 'send',
      ...request
    })
    return response.data
  },

  async verifyPasswordlessCode(request: PasswordlessVerification): Promise<ApiResponse<{ user: AuthUser; token: string }>> {
    const response = await apiClient.post('/api/auth/passwordless', {
      action: 'verify',
      ...request
    })
    return response.data
  }
}

// Users API
export const usersApi = {
  async getProfile(): Promise<ApiResponse<AuthUser>> {
    const response = await apiClient.get('/api/users/profile')
    return response.data
  }
}
