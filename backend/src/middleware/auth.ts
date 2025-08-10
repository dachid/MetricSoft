import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthService } from '../lib/auth.js'

interface AuthRequest extends Request {
  user?: any
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      })
    }

    // Verify token and get user
    const user = await AuthService.getUserFromToken(token)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({
      success: false,
      error: 'Token verification failed'
    })
  }
}

export const requireRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const userRoles = req.user.roles.map((role: any) => role.code)
    const hasRequiredRole = roles.some(role => 
      userRoles.includes(role) || userRoles.includes('SUPER_ADMIN')
    )

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      })
    }

    next()
  }
}
