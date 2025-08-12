import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiErrorHandler, AuthenticationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Authorization header required')
    }

    const token = authHeader.substring(7)
    
    // Find session
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!session) {
      throw new AuthenticationError('Invalid or expired session')
    }

    // Get user with roles
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        roles: {
          include: {
            role: true,
            tenant: true
          }
        },
        tenant: true
      }
    })

    if (!user) {
      throw new AuthenticationError('User not found')
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          subdomain: user.tenant.subdomain
        } : null,
        roles: user.roles.map((userRole: any) => ({
          role: {
            id: userRole.role.id,
            code: userRole.role.code,
            name: userRole.role.name,
            permissions: userRole.role.permissions
          },
          tenant: {
            id: userRole.tenant.id,
            name: userRole.tenant.name
          }
        }))
      }
    })
  } catch (error) {
    return ApiErrorHandler.handle(error)
  }
}
