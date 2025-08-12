import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

// GET /api/tenants/[id]/org-units - Get all organizational units for a tenant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const { searchParams } = new URL(request.url);
    const levelCode = searchParams.get('level');
    const parentId = searchParams.get('parent');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Build where clause based on filters
    const whereClause: any = {
      tenantId,
      ...(levelCode && { 
        levelDefinition: { 
          code: levelCode 
        } 
      }),
      ...(parentId && { parentId }),
      ...(!includeInactive && { isActive: true })
    };

    // Get org units with related data
    const orgUnits = await (prisma as any).orgUnit.findMany({
      where: whereClause,
      include: {
        levelDefinition: {
          select: {
            id: true,
            code: true,
            name: true,
            pluralName: true,
            hierarchyLevel: true,
            icon: true,
            color: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
            levelDefinition: {
              select: { name: true, hierarchyLevel: true }
            }
          }
        },
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            levelDefinition: {
              select: { name: true, hierarchyLevel: true }
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
        }
      },
      orderBy: [
        { levelDefinition: { hierarchyLevel: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        orgUnits,
        meta: {
          total: orgUnits.length,
          filters: {
            levelCode,
            parentId,
            includeInactive
          }
        }
      }
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// POST /api/tenants/[id]/org-units - Create new organizational unit
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const body = await request.json();
    const { 
      name, 
      levelDefinitionId, 
      parentId, 
      description, 
      code: providedCode,
      metadata,
      effectiveFrom 
    } = body;

    // Validation
    if (!name || !levelDefinitionId) {
      throw new ValidationError('Name and level definition are required');
    }

    // Verify level definition exists and belongs to this tenant
    const levelDef = await (prisma as any).levelDefinition.findFirst({
      where: {
        id: levelDefinitionId,
        tenantId,
        isEnabled: true
      }
    });

    if (!levelDef) {
      throw new ValidationError('Invalid or disabled level definition');
    }

    // Auto-generate code if not provided (reducing typing)
    const code = providedCode || 
      name.toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .substring(0, 20);

    // Check for duplicate codes within the same level and tenant
    const existingUnit = await (prisma as any).orgUnit.findFirst({
      where: {
        tenantId,
        levelDefinitionId,
        code
      }
    });

    if (existingUnit) {
      throw new ValidationError(`Organization unit with code "${code}" already exists at this level`);
    }

    // Validate parent hierarchy if parentId provided
    if (parentId) {
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
      if (parent.levelDefinition.hierarchyLevel >= levelDef.hierarchyLevel) {
        throw new ValidationError('Parent must be at a higher organizational level');
      }
    }

    // Get next sort order for this level
    const maxSortOrder = await (prisma as any).orgUnit.aggregate({
      where: {
        tenantId,
        levelDefinitionId,
        ...(parentId && { parentId })
      },
      _max: {
        sortOrder: true
      }
    });

    const newSortOrder = (maxSortOrder._max.sortOrder || 0) + 10;

    // Create the organizational unit
    const newOrgUnit = await (prisma as any).orgUnit.create({
      data: {
        tenantId,
        levelDefinitionId,
        code,
        name,
        description,
        parentId,
        metadata: metadata || {},
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        sortOrder: newSortOrder,
        isActive: true
      },
      include: {
        levelDefinition: {
          select: {
            id: true,
            code: true,
            name: true,
            pluralName: true,
            hierarchyLevel: true,
            icon: true,
            color: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${levelDef.name} "${name}" created successfully`,
      data: newOrgUnit
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
