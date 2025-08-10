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

export class AuthService {
  static generateToken(userId: string): string {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is required')
    }
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
  }

  static verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      return null
    }
  }

  static async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      // Verify token
      const decoded = this.verifyToken(token)
      if (!decoded) return null

      // Check if session exists and is valid
      const session = await prisma.session.findUnique({
        where: { token }
      })

      if (!session || session.expiresAt < new Date()) {
        // Clean up expired session
        if (session) {
          await prisma.session.delete({ where: { id: session.id } })
        }
        return null
      }

      // Get user with roles
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
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

  static async createSession(userId: string): Promise<string> {
    try {
      const token = this.generateToken(userId)
      
      // Store session
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      await prisma.session.create({
        data: {
          userId,
          token,
          expiresAt
        }
      })

      return token
    } catch (error) {
      console.error('Create session error:', error)
      throw error
    }
  }
}
