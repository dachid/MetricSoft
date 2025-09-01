import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/kpis/[id]/shares - Get KPI shares
export const GET = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const kpiId = params.id;

  try {
    // Verify KPI exists and user has access
    const kpi = await (prisma as any).kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: authResult.user!.tenantId,
        OR: [
          { createdById: authResult.user!.id },
          { evaluatorId: authResult.user!.id }
        ]
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found or access denied');
    }

    // Get shares
    const shares = await (prisma as any).kPIShare.findMany({
      where: {
        kpiId
      },
      include: {
        sharedWithUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true
          }
        },
        sharedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: shares
    });

  } catch (error) {
    console.error('Get KPI shares error:', error);
    throw new DatabaseError('Failed to fetch KPI shares');
  }
});

// POST /api/kpis/[id]/shares - Share KPI with users
export const POST = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const kpiId = params.id;

  try {
    const body = await request.json();
    const { userIds, canEdit = false } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new ValidationError('User IDs are required');
    }

    // Verify KPI exists and user has access
    const kpi = await (prisma as any).kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: authResult.user!.tenantId,
        OR: [
          { createdById: authResult.user!.id },
          { evaluatorId: authResult.user!.id }
        ]
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found or access denied');
    }

    // Verify all users exist and belong to the same tenant
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        tenantId: authResult.user!.tenantId
      }
    });

    if (users.length !== userIds.length) {
      throw new ValidationError('Some users not found or invalid');
    }

    // Create shares (using upsert to handle duplicates)
    const shares = await Promise.all(
      userIds.map(async (userId: string) => {
        return await (prisma as any).kPIShare.upsert({
          where: {
            kpiId_sharedWithUserId: {
              kpiId,
              sharedWithUserId: userId
            }
          },
          update: {
            canEdit,
            updatedAt: new Date()
          },
          create: {
            kpiId,
            sharedWithUserId: userId,
            sharedById: authResult.user!.id,
            canEdit
          },
          include: {
            sharedWithUser: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true
              }
            }
          }
        });
      })
    );

    // Create audit log
    await (prisma as any).kPIAuditLog.create({
      data: {
        kpiId,
        userId: authResult.user!.id,
        action: 'SHARE',
        newValues: {
          sharedWith: userIds,
          canEdit
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: shares
    }, { status: 201 });

  } catch (error) {
    console.error('Share KPI error:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError('Failed to share KPI');
  }
});

// DELETE /api/kpis/[id]/shares - Remove KPI share
export const DELETE = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const kpiId = params.id;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  try {
    // Verify KPI exists and user has access
    const kpi = await (prisma as any).kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: authResult.user!.tenantId,
        OR: [
          { createdById: authResult.user!.id },
          { evaluatorId: authResult.user!.id }
        ]
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found or access denied');
    }

    // Remove share
    const deletedShare = await (prisma as any).kPIShare.deleteMany({
      where: {
        kpiId,
        sharedWithUserId: userId
      }
    });

    if (deletedShare.count === 0) {
      throw new NotFoundError('Share not found');
    }

    // Create audit log
    await (prisma as any).kPIAuditLog.create({
      data: {
        kpiId,
        userId: authResult.user!.id,
        action: 'UNSHARE',
        oldValues: {
          removedUserId: userId
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Share removed successfully'
    });

  } catch (error) {
    console.error('Remove KPI share error:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError('Failed to remove KPI share');
  }
});
