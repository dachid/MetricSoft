import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

// GET /api/tenants/[id]/org-units/[unitId]/users - Get users assigned to org unit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const { id: tenantId, unitId } = params;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const { searchParams } = new URL(request.url);
    const includeHistorical = searchParams.get('includeHistorical') === 'true';

    // Build where clause for assignments
    const whereClause: any = {
      orgUnitId: unitId,
      ...(includeHistorical ? {} : { effectiveTo: null })
    };

    // Get user assignments
    const assignments = await (prisma as any).userOrgAssignment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tenantId: true
          }
        },
        orgUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            levelDefinition: {
              select: {
                name: true,
                hierarchyLevel: true
              }
            }
          }
        }
      },
      orderBy: [
        { effectiveFrom: 'desc' },
        { user: { name: 'asc' } }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        meta: {
          total: assignments.length,
          active: assignments.filter((a: any) => !a.effectiveTo).length,
          historical: assignments.filter((a: any) => a.effectiveTo).length
        }
      }
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// POST /api/tenants/[id]/org-units/[unitId]/users - Assign user to org unit
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const { id: tenantId, unitId } = params;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const body = await request.json();
    const { userId, role, effectiveFrom } = body;

    // Validation
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Verify user exists and belongs to this tenant
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId
      }
    });

    if (!user) {
      throw new ValidationError('User not found or does not belong to this tenant');
    }

    // Verify org unit exists and belongs to this tenant
    const orgUnit = await (prisma as any).orgUnit.findFirst({
      where: {
        id: unitId,
        tenantId,
        isActive: true
      },
      include: {
        levelDefinition: true
      }
    });

    if (!orgUnit) {
      throw new ValidationError('Organization unit not found or inactive');
    }

    // Check for existing active assignment
    const existingAssignment = await (prisma as any).userOrgAssignment.findFirst({
      where: {
        userId,
        orgUnitId: unitId,
        effectiveTo: null
      }
    });

    if (existingAssignment) {
      throw new ValidationError(`User is already assigned to this ${orgUnit.levelDefinition.name.toLowerCase()}`);
    }

    // Create the assignment
    const newAssignment = await (prisma as any).userOrgAssignment.create({
      data: {
        userId,
        orgUnitId: unitId,
        role: role || 'MEMBER',
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            levelDefinition: {
              select: {
                name: true,
                hierarchyLevel: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.name || user.email} assigned to ${orgUnit.levelDefinition.name.toLowerCase()} "${orgUnit.name}" successfully`,
      data: newAssignment
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// PUT /api/tenants/[tenantId]/org-units/[unitId]/users/[userId] - Update user assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; unitId: string; userId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const { tenantId, unitId, userId } = params;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const body = await request.json();
    const { role, effectiveTo } = body;

    // Find existing active assignment
    const existingAssignment = await (prisma as any).userOrgAssignment.findFirst({
      where: {
        userId,
        orgUnitId: unitId,
        effectiveTo: null
      }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Active user assignment not found' } },
        { status: 404 }
      );
    }

    // Update the assignment
    const updatedAssignment = await (prisma as any).userOrgAssignment.update({
      where: { id: existingAssignment.id },
      data: {
        ...(role && { role }),
        ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            levelDefinition: {
              select: {
                name: true,
                hierarchyLevel: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User assignment updated successfully',
      data: updatedAssignment
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// DELETE /api/tenants/[tenantId]/org-units/[unitId]/users/[userId] - End user assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; unitId: string; userId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const { tenantId, unitId, userId } = params;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    // Find existing active assignment
    const existingAssignment = await (prisma as any).userOrgAssignment.findFirst({
      where: {
        userId,
        orgUnitId: unitId,
        effectiveTo: null
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        orgUnit: {
          select: {
            name: true,
            levelDefinition: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Active user assignment not found' } },
        { status: 404 }
      );
    }

    // End the assignment by setting effectiveTo to now
    await (prisma as any).userOrgAssignment.update({
      where: { id: existingAssignment.id },
      data: {
        effectiveTo: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `User ${existingAssignment.user.name || existingAssignment.user.email} removed from ${existingAssignment.orgUnit.levelDefinition.name.toLowerCase()} "${existingAssignment.orgUnit.name}"`
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
