import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const onboardUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  tenantId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = onboardUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }

    const { email, name, tenantId } = validation.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user (passwordless - admin onboarded)
    const userData: any = {
      email: email.toLowerCase(),
      name,
    }
    
    if (tenantId) {
      userData.tenantId = tenantId
    }

    const user = await prisma.user.create({
      data: userData
    })

    // Get user with roles for response
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      roles: userWithRoles?.roles.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        permissions: ur.role.permissions || []
      })) || []
    }

    return NextResponse.json({
      success: true,
      message: `User ${name} has been onboarded successfully. They can now login using passwordless authentication with ${email}.`,
      data: {
        user: authUser
      }
    }, { status: 201 })

  } catch (error) {
    console.error('User onboarding error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
