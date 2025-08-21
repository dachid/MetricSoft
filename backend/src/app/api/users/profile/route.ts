import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Fetch complete user data from database
    const user = await prisma.user.findUnique({
      where: { id: authResult.user!.id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format the response to match the expected structure
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      lineManager: user.lineManager,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(userRole => ({
        id: userRole.id,
        name: userRole.role.name,
        code: userRole.role.code
      }))
    }

    return NextResponse.json({
      success: true,
      data: formattedUser
    })

  } catch (error) {
    console.error('Get profile API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json()
    const { name } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user!.id },
      data: {
        name: name.trim(),
        updatedAt: new Date()
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Format the response to match the expected structure
    const formattedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      tenantId: updatedUser.tenantId,
      lineManager: updatedUser.lineManager,
      profilePicture: updatedUser.profilePicture,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      roles: updatedUser.roles.map(userRole => ({
        id: userRole.id,
        name: userRole.role.name,
        code: userRole.role.code
      }))
    }

    return NextResponse.json({
      success: true,
      data: { user: formattedUser }
    })

  } catch (error) {
    console.error('Update profile API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
