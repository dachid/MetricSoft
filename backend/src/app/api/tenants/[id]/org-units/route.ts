import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

// GET /api/tenants/[id]/org-units - Get all organizational units for a tenant
export const GET = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const tenantId = params.id;
  
  // Verify user has access to this tenant
  // Super Admins can access any tenant, Organization Admins only their own tenant
  const isSuperAdmin = authResult.user?.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
  if (!isSuperAdmin && authResult.user?.tenantId !== tenantId) {
    throw new AuthorizationError('Access denied to this tenant');
  }

  const { searchParams } = new URL(request.url);
  const levelCode = searchParams.get('level');
  const parentId = searchParams.get('parent');
  const includeInactive = searchParams.get('includeInactive') === 'true';
  const fiscalYearId = searchParams.get('fiscalYearId');

  // Build where clause based on filters
  const whereClause: any = {
    tenantId,
    ...(levelCode && { 
      levelDefinition: { 
        code: levelCode 
      } 
    }),
    ...(parentId && { parentId }),
    ...(fiscalYearId && { fiscalYearId }),
    ...(!includeInactive && { isActive: true })
  };

  try {
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
      },
      orderBy: [
        { levelDefinition: { hierarchyLevel: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return {
      success: true,
      data: {
        orgUnits,
        meta: {
          total: orgUnits.length,
          filters: {
            levelCode,
            parentId,
            includeInactive,
            fiscalYearId
          }
        }
      }
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new DatabaseError('Database constraint violation', error.message);
    } else if (error.code?.startsWith('P')) {
      throw new DatabaseError('Database operation failed', error.message);
    }
    
    throw new DatabaseError(
      'Failed to fetch organizational units',
      error.message,
      { 
        metadata: { 
          tenantId, 
          levelCode, 
          parentId, 
          fiscalYearId,
          includeInactive 
        }
      }
    );
  }
})

// POST /api/tenants/[id]/org-units - Create new organizational unit
export const POST = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    // Super Admins can access any tenant, Organization Admins only their own tenant
    const isSuperAdmin = authResult.user?.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user?.tenantId !== tenantId) {
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
      effectiveFrom,
      fiscalYearId,
      kpiChampionIds = []
    } = body;

    // Validation
    if (!name || !levelDefinitionId) {
      throw new ValidationError('Name and level definition are required');
    }

    // Validate fiscal year if provided
    if (fiscalYearId) {
      const fiscalYear = await (prisma as any).fiscalYear.findFirst({
        where: {
          id: fiscalYearId,
          tenantId
        }
      });

      if (!fiscalYear) {
        throw new ValidationError('Invalid fiscal year');
      }
    }

    // Verify level definition exists and belongs to this tenant
    const levelDef = await (prisma as any).fiscalYearLevelDefinition.findFirst({
      where: {
        id: levelDefinitionId,
        ...(fiscalYearId && { fiscalYearId }),
        isEnabled: true
      },
      include: {
        fiscalYear: {
          select: {
            tenantId: true
          }
        }
      }
    });

    if (!levelDef || levelDef.fiscalYear.tenantId !== tenantId) {
      throw new ValidationError('Invalid or disabled level definition');
    }

    // Auto-generate code if not provided (reducing typing)
    const code = providedCode || 
      name.toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .substring(0, 20);

    // Validate code format if provided (2-4 characters for manual entry)
    if (providedCode && !/^[A-Z0-9]{2,4}$/.test(providedCode)) {
      throw new ValidationError('Code must be 2-4 uppercase letters or numbers');
    }

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

    // Verify KPI champions exist and belong to tenant
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
        fiscalYearId: fiscalYearId || levelDef.fiscalYearId,
        levelDefinitionId,
        code,
        name,
        description,
        parentId,
        metadata: metadata || {},
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        sortOrder: newSortOrder,
        isActive: true,
        kpiChampions: {
          create: kpiChampionIds.map((userId: string) => ({
            userId,
            assignedBy: authResult.user?.id || ''
          }))
        }
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

    return NextResponse.json({
      success: true,
      message: `${levelDef.name} "${name}" created successfully`,
      data: newOrgUnit
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ValidationError('Duplicate organizational unit', `An organizational unit with code "${error.meta?.target}" already exists`);
    } else if (error.code === 'P2003') {
      throw new ValidationError('Invalid reference', 'Referenced level definition or parent unit does not exist');
    } else if (error.code?.startsWith('P')) {
      throw new DatabaseError('Database operation failed', error.message);
    }
    
    // Re-throw if it's already one of our custom errors
    throw error;
  }
})
