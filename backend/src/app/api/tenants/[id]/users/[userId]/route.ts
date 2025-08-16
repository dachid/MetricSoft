import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

// PUT /api/tenants/[id]/users/[userId] - Update a user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, userId } = params;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user is Organization Admin or Super Admin
    const isAuthorized = authResult.user.roles.some((role: any) => {
      const hasCorrectRole = ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(role.code);
      const hasCorrectTenant = (role.code === 'SUPER_ADMIN' || authResult.user?.tenantId === tenantId);
      return hasCorrectRole && hasCorrectTenant;
    });

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, email, lineManager } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if the user exists and belongs to the tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenantId
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if another user with the same email exists (excluding current user)
    const emailConflict = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        NOT: {
          id: userId
        }
      }
    });

    if (emailConflict) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Validate line manager if provided
    if (lineManager?.trim()) {
      const lineManagerUser = await prisma.user.findFirst({
        where: {
          email: lineManager.trim().toLowerCase(),
          tenantId: tenantId
        }
      });

      if (!lineManagerUser) {
        return NextResponse.json({ error: 'Line manager email not found in this organization' }, { status: 400 });
      }

      // Prevent user from being their own line manager
      if (lineManagerUser.id === userId) {
        return NextResponse.json({ error: 'User cannot be their own line manager' }, { status: 400 });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        lineManager: lineManager?.trim() || null,
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
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          lineManager: updatedUser.lineManager,
          roles: updatedUser.roles.map(userRole => ({
            role: userRole.role
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenants/[id]/users/[userId] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, userId } = params;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user is Organization Admin or Super Admin
    const isAuthorized = authResult.user.roles.some((role: any) => {
      const hasCorrectRole = ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(role.code);
      const hasCorrectTenant = (role.code === 'SUPER_ADMIN' || authResult.user?.tenantId === tenantId);
      return hasCorrectRole && hasCorrectTenant;
    });

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if the user exists and belongs to the tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenantId
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent users from deleting themselves
    if (userId === authResult.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Delete user (this will cascade delete roles and other related data)
    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
