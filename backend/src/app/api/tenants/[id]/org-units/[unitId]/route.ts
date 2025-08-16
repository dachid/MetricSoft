import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

// GET /api/tenants/[id]/org-units/[unitId] - Get specific organizational unit
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

    // Get the org unit with full details
    const orgUnit = await (prisma as any).orgUnit.findFirst({
      where: {
        id: unitId,
        tenantId
      },
      include: {
        levelDefinition: true,
        parent: {
          include: {
            levelDefinition: {
              select: { name: true, hierarchyLevel: true }
            }
          }
        },
        children: {
          where: { isActive: true },
          include: {
            levelDefinition: {
              select: { name: true, hierarchyLevel: true, icon: true, color: true }
            },
            userAssignments: {
              where: { effectiveTo: null },
              select: { id: true }
            }
          },
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' }
          ]
        },
        userAssignments: {
          where: {
            effectiveTo: null // Only current assignments
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        kpiChampions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        }
      }
    });

    if (!orgUnit) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Organization unit not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: orgUnit
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// PUT /api/tenants/[id]/org-units/[unitId] - Update organizational unit
export async function PUT(
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
    const { 
      name, 
      description, 
      code, 
      parentId, 
      metadata,
      sortOrder,
      effectiveTo,
      kpiChampionIds = []
    } = body;

    // Get current org unit
    const currentUnit = await (prisma as any).orgUnit.findFirst({
      where: {
        id: unitId,
        tenantId
      },
      include: {
        levelDefinition: true
      }
    });

    if (!currentUnit) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Organization unit not found' } },
        { status: 404 }
      );
    }

    // Validate code uniqueness if code is being changed
    if (code && code !== currentUnit.code) {
      const existingUnit = await (prisma as any).orgUnit.findFirst({
        where: {
          tenantId,
          levelDefinitionId: currentUnit.levelDefinitionId,
          code,
          id: { not: unitId }
        }
      });

      if (existingUnit) {
        throw new ValidationError(`Organization unit with code "${code}" already exists at this level`);
      }
    }

    // Validate parent hierarchy if parentId is being changed
    if (parentId && parentId !== currentUnit.parentId) {
      if (parentId === unitId) {
        throw new ValidationError('Organization unit cannot be its own parent');
      }

      const parent = await (prisma as any).orgUnit.findFirst({
        where: {
          id: parentId,
          tenantId,
          isActive: true
        },
        include: {
          levelDefinition: true
        }
      });

      if (!parent) {
        throw new ValidationError('Invalid parent organization unit');
      }

      // Ensure proper hierarchy (parent must be at a higher level)
      if (parent.levelDefinition.hierarchyLevel >= currentUnit.levelDefinition.hierarchyLevel) {
        throw new ValidationError('Parent must be at a higher organizational level');
      }

      // Check for circular references
      const isDescendant = await checkIsDescendant(parentId, unitId, tenantId);
      if (isDescendant) {
        throw new ValidationError('Cannot move unit under its own descendant (would create circular reference)');
      }
    }

    // Verify KPI champions exist and belong to tenant if provided
    if (kpiChampionIds.length > 0) {
      const champions = await (prisma as any).user.findMany({
        where: {
          id: { in: kpiChampionIds },
          tenantId
        }
      });

      if (champions.length !== kpiChampionIds.length) {
        throw new ValidationError('Some KPI champions not found in this organization');
      }
    }

    // Update the organizational unit with transaction to handle KPI champions
    const updatedUnit = await prisma.$transaction(async (tx) => {
      // Update the unit itself
      const unit = await tx.orgUnit.update({
        where: { id: unitId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(code && { code }),
          ...(parentId !== undefined && { parentId }),
          ...(metadata && { metadata }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
          updatedAt: new Date()
        }
      });

      // Update KPI champions if provided
      if (kpiChampionIds !== undefined) {
        // Remove existing KPI champion assignments
        await (tx as any).orgUnitKpiChampion.deleteMany({
          where: { orgUnitId: unitId }
        });

        // Add new KPI champion assignments
        if (kpiChampionIds.length > 0) {
          await (tx as any).orgUnitKpiChampion.createMany({
            data: kpiChampionIds.map((userId: string) => ({
              orgUnitId: unitId,
              userId,
              assignedBy: authResult.user?.id || 'system'
            }))
          });
        }
      }

      // Return the updated unit with all relations
      return await (tx as any).orgUnit.findUnique({
        where: { id: unitId },
        include: {
          levelDefinition: true,
          parent: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          children: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          kpiChampions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: `${currentUnit.levelDefinition.name} updated successfully`,
      data: updatedUnit
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// DELETE /api/tenants/[id]/org-units/[unitId] - Deactivate organizational unit
export async function DELETE(
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

    // Get current org unit to check if it exists and has children/assignments
    const currentUnit = await (prisma as any).orgUnit.findFirst({
      where: {
        id: unitId,
        tenantId
      },
      include: {
        levelDefinition: true,
        children: {
          where: { isActive: true }
        },
        userAssignments: {
          where: { effectiveTo: null }
        }
      }
    });

    if (!currentUnit) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Organization unit not found' } },
        { status: 404 }
      );
    }

    // Check for organization level (cannot be deleted)
    if (currentUnit.levelDefinition.code === 'ORGANIZATION') {
      throw new ValidationError('Organization level units cannot be deleted');
    }

    // Check for active children
    if (currentUnit.children.length > 0) {
      throw new ValidationError('Cannot delete organization unit with active child units. Please move or deactivate child units first.');
    }

    // Check for active user assignments
    if (currentUnit.userAssignments.length > 0) {
      throw new ValidationError('Cannot delete organization unit with active user assignments. Please reassign users first.');
    }

    // Soft delete by setting isActive to false and effectiveTo to now
    await (prisma as any).orgUnit.update({
      where: { id: unitId },
      data: {
        isActive: false,
        effectiveTo: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `${currentUnit.levelDefinition.name} "${currentUnit.name}" has been deactivated`
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// Helper function to check for circular references
async function checkIsDescendant(parentId: string, childId: string, tenantId: string): Promise<boolean> {
  const descendants = await (prisma as any).orgUnit.findMany({
    where: {
      parentId: childId,
      tenantId,
      isActive: true
    },
    select: { id: true }
  });

  for (const descendant of descendants) {
    if (descendant.id === parentId) {
      return true;
    }
    if (await checkIsDescendant(parentId, descendant.id, tenantId)) {
      return true;
    }
  }

  return false;
}
