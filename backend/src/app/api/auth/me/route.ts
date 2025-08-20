import { NextRequest, NextResponse } from 'next/server'
import { validateSecureSession, extendSession } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateSecureSession(request)
    
    if (!authResult.success || !authResult.user || !authResult.session) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Not authenticated' },
        { status: 401 }
      )
    }

    // Extend session on activity (optional)
    await extendSession(authResult.session.token)

    // Get full user data with tenant info for compatibility
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
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
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
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
      },
      csrfToken: authResult.session.csrfToken // Include CSRF token for frontend
    })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Session validation failed' },
      { status: 500 }
    )
  }
}
