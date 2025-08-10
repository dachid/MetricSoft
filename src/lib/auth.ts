import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

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

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  static generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      return null
    }
  }

  static async login(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | { error: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        return { error: 'Invalid credentials' }
      }

      const isValidPassword = await this.comparePassword(credentials.password, user.password)
      if (!isValidPassword) {
        return { error: 'Invalid credentials' }
      }

      const token = this.generateToken(user.id)

      // Store session
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      })

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          permissions: ur.role.permissions as string[]
        }))
      }

      return { user: authUser, token }
    } catch (error) {
      console.error('Login error:', error)
      return { error: 'Login failed' }
    }
  }

  static async register(credentials: RegisterCredentials): Promise<{ user: AuthUser; token: string } | { error: string }> {
    try {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: credentials.email }
      })

      if (existingUser) {
        return { error: 'User already exists' }
      }

      // Hash password
      const hashedPassword = await this.hashPassword(credentials.password)

      // Create user
      const user = await prisma.user.create({
        data: {
          email: credentials.email,
          password: hashedPassword,
          name: credentials.name,
          tenantId: credentials.tenantId
        }
      })

      const token = this.generateToken(user.id)

      // Store session
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      })

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: []
      }

      return { user: authUser, token }
    } catch (error) {
      console.error('Register error:', error)
      return { error: 'Registration failed' }
    }
  }

  static async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      // Verify token
      const decoded = this.verifyToken(token)
      if (!decoded) return null

      // Check if session exists and is valid
      const session = await prisma.session.findUnique({
        where: { token },
        include: {
          user: {
            include: {
              roles: {
                include: {
                  role: true
                }
              }
            }
          }
        }
      })

      if (!session || session.expiresAt < new Date()) {
        // Clean up expired session
        if (session) {
          await prisma.session.delete({ where: { id: session.id } })
        }
        return null
      }

      const user = session.user
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          permissions: ur.role.permissions as string[]
        }))
      }
    } catch (error) {
      console.error('Get user from token error:', error)
      return null
    }
  }

  static async logout(token: string): Promise<boolean> {
    try {
      await prisma.session.deleteMany({
        where: { token }
      })
      return true
    } catch (error) {
      console.error('Logout error:', error)
      return false
    }
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        roles: user.roles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name,
          code: ur.role.code,
          permissions: ur.role.permissions as string[]
        }))
      }
    } catch (error) {
      console.error('Get user by ID error:', error)
      return null
    }
  }
}
