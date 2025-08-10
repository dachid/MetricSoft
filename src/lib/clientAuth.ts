// Client-side auth service for frontend
// This simulates the authentication API calls

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
}

export class ClientAuthService {
  private static TOKEN_KEY = 'metricsoft_auth_token'
  private static USER_KEY = 'metricsoft_user'

  static getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  static getStoredUser(): AuthUser | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }

  static setAuth(user: AuthUser, token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
  }

  static clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  // Simulated API calls - in production these would call your backend API
  static async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | { error: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Demo user for development
    if (credentials.email === 'admin@metricsoft.com' && credentials.password === 'admin123') {
      const user: AuthUser = {
        id: '1',
        email: 'admin@metricsoft.com',
        name: 'Admin User',
        tenantId: 'tenant-1',
        roles: [
          {
            id: 'role-1',
            name: 'Super Administrator',
            code: 'SUPER_ADMIN',
            permissions: ['*']
          }
        ]
      }
      const token = 'demo-jwt-token-' + Date.now()
      
      this.setAuth(user, token)
      return { user, token }
    }

    // Demo regular user
    if (credentials.email === 'user@metricsoft.com' && credentials.password === 'user123') {
      const user: AuthUser = {
        id: '2',
        email: 'user@metricsoft.com',
        name: 'Regular User',
        tenantId: 'tenant-1',
        roles: [
          {
            id: 'role-2',
            name: 'Employee',
            code: 'EMPLOYEE',
            permissions: ['read:own_kpis', 'write:own_kpis']
          }
        ]
      }
      const token = 'demo-jwt-token-' + Date.now()
      
      this.setAuth(user, token)
      return { user, token }
    }

    return { error: 'Invalid credentials' }
  }

  static async register(credentials: RegisterCredentials): Promise<{ user: AuthUser; token: string } | { error: string }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // For demo purposes, just create a user
    const user: AuthUser = {
      id: 'new-' + Date.now(),
      email: credentials.email,
      name: credentials.name || null,
      tenantId: 'tenant-1',
      roles: [
        {
          id: 'role-2',
          name: 'Employee',
          code: 'EMPLOYEE',
          permissions: ['read:own_kpis', 'write:own_kpis']
        }
      ]
    }
    const token = 'demo-jwt-token-' + Date.now()
    
    this.setAuth(user, token)
    return { user, token }
  }

  static async logout(): Promise<{ success: boolean }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    this.clearAuth()
    return { success: true }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getStoredToken()
    if (!token) return null

    // In production, this would validate the token with the backend
    return this.getStoredUser()
  }
}
