// Client-side passwordless authentication service
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

export interface PasswordlessLoginRequest {
  email: string
}

export interface PasswordlessVerifyRequest {
  email: string
  code: string
}

export interface PasswordlessResponse {
  success?: boolean
  error?: string
  code?: string
}

export class PasswordlessAuthService {
  private static CODE_LENGTH = 6
  private static EXPIRY_MINUTES = 10
  private static CODES_KEY = 'metricsoft_passwordless_codes'
  private static TOKEN_KEY = 'metricsoft_auth_token'
  private static USER_KEY = 'metricsoft_user'

  static generateAuthCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private static getStoredCodes(): Record<string, { code: string; expiresAt: number; attempts: number }> {
    const stored = localStorage.getItem(this.CODES_KEY)
    return stored ? JSON.parse(stored) : {}
  }

  private static saveCode(email: string, code: string): void {
    const codes = this.getStoredCodes()
    const expiresAt = Date.now() + (this.EXPIRY_MINUTES * 60 * 1000)
    codes[email.toLowerCase()] = { code, expiresAt, attempts: 0 }
    localStorage.setItem(this.CODES_KEY, JSON.stringify(codes))
  }

  private static setAuth(user: AuthUser, token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
    localStorage.setItem(this.USER_KEY, JSON.stringify(user))
  }

  static async sendPasswordlessCode(request: PasswordlessLoginRequest): Promise<PasswordlessResponse> {
    try {
      const { email } = request
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // For demo, only allow registered emails
      const registeredEmails = [
        'admin@metricsoft.com',
        'user@metricsoft.com',
        'manager@metricsoft.com',
        'analyst@metricsoft.com'
      ]

      if (!registeredEmails.includes(email.toLowerCase())) {
        return { 
          error: 'No account found with this email address', 
          code: 'USER_NOT_FOUND' 
        }
      }

      // Generate and store code
      const code = this.generateAuthCode()
      this.saveCode(email, code)

      // In development, show the code to user
      console.log(`� Passwordless code for ${email}: ${code} (expires in ${this.EXPIRY_MINUTES} minutes)`)
      
      // Show a user-friendly message in development
      setTimeout(() => {
        alert(`🔑 Development Mode: Your verification code is ${code}\n\nIn production, this would be sent to your email.`)
      }, 100)
      
      return { success: true }
    } catch (error) {
      console.error('Send passwordless code error:', error)
      return { error: 'Failed to send verification code' }
    }
  }

  static async verifyPasswordlessCode(request: PasswordlessVerifyRequest): Promise<any> {
    try {
      const { email, code } = request
      const emailLower = email.toLowerCase()
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      const codes = this.getStoredCodes()
      const storedCode = codes[emailLower]

      if (!storedCode) {
        return { 
          error: 'No verification code found. Please request a new code.', 
          code: 'CODE_NOT_FOUND' 
        }
      }

      if (storedCode.expiresAt < Date.now()) {
        delete codes[emailLower]
        localStorage.setItem(this.CODES_KEY, JSON.stringify(codes))
        return { 
          error: 'Verification code has expired. Please request a new code.', 
          code: 'CODE_EXPIRED' 
        }
      }

      if (storedCode.attempts >= 3) {
        delete codes[emailLower]
        localStorage.setItem(this.CODES_KEY, JSON.stringify(codes))
        return { 
          error: 'Too many attempts. Please request a new code.', 
          code: 'TOO_MANY_ATTEMPTS' 
        }
      }

      if (storedCode.code !== code) {
        storedCode.attempts += 1
        localStorage.setItem(this.CODES_KEY, JSON.stringify(codes))
        return { 
          error: 'Invalid verification code', 
          code: 'INVALID_CODE' 
        }
      }

      // Clean up used code
      delete codes[emailLower]
      localStorage.setItem(this.CODES_KEY, JSON.stringify(codes))

      // Create demo user based on email
      let user: AuthUser
      if (emailLower === 'admin@metricsoft.com') {
        user = {
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
      } else if (emailLower === 'manager@metricsoft.com') {
        user = {
          id: '3',
          email: 'manager@metricsoft.com',
          name: 'Manager User',
          tenantId: 'tenant-1',
          roles: [
            {
              id: 'role-3',
              name: 'Manager',
              code: 'MANAGER',
              permissions: ['read:all_kpis', 'write:team_kpis', 'manage:team']
            }
          ]
        }
      } else {
        user = {
          id: '2',
          email: emailLower,
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
      }

      const token = 'passwordless-jwt-token-' + Date.now()

      // Store auth data
      this.setAuth(user, token)

      return { user, token }
    } catch (error) {
      console.error('Verify passwordless code error:', error)
      return { error: 'Verification failed' }
    }
  }

  static cleanupExpiredCodes(): void {
    try {
      const codes = this.getStoredCodes()
      const now = Date.now()
      const validCodes: Record<string, { code: string; expiresAt: number; attempts: number }> = {}

      for (const [email, codeData] of Object.entries(codes)) {
        if (codeData.expiresAt > now) {
          validCodes[email] = codeData
        }
      }

      localStorage.setItem(this.CODES_KEY, JSON.stringify(validCodes))
    } catch (error) {
      console.error('Cleanup expired codes error:', error)
    }
  }
}
