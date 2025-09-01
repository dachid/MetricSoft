import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/exit-components - Get exit components for autocomplete
export const GET = createApiRoute(async (request: NextRequest) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const orgUnitId = searchParams.get('orgUnitId');
  const fiscalYearId = searchParams.get('fiscalYearId');
  const search = searchParams.get('search');

  if (!orgUnitId || !fiscalYearId) {
    throw new ValidationError('Organization unit ID and fiscal year ID are required');
  }

  try {
    // Get the current org unit and its level
    const orgUnit = await prisma.orgUnit.findFirst({
      where: {
        id: orgUnitId,
        tenantId: authResult.user!.tenantId!,
        fiscalYearId
      },
      include: {
        levelDefinition: true,
        parent: {
          include: {
            levelDefinition: true
          }
        }
      }
    });

    if (!orgUnit) {
      throw new ValidationError('Invalid organizational unit');
    }

    // If this is the organizational level (top level), return empty array
    if (!orgUnit.parent) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get the parent level (previous level in hierarchy)
    const parentLevel = orgUnit.parent.levelDefinition;

    // Find the cascade relationship to get exit components from parent level
    const cascadeRelationship = await prisma.performanceCascadeRelationship.findFirst({
      where: {
        fiscalYearId,
        fromLevelId: parentLevel.id,
        toLevelId: orgUnit.levelDefinition.id
      },
      include: {
        exitComponent: true
      }
    });

    if (!cascadeRelationship) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get all objectives from the parent org unit that match the exit component type
    const parentObjectives = await (prisma as any).kPIObjective.findMany({
      where: {
        tenantId: authResult.user!.tenantId!,
        fiscalYearId,
        orgUnitId: orgUnit.parentId,
        isActive: true,
        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        })
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 20
    });

    return NextResponse.json({
      success: true,
      data: parentObjectives,
      meta: {
        exitComponentType: cascadeRelationship.exitComponent.componentName,
        parentLevelName: parentLevel.name
      }
    });

  } catch (error) {
    console.error('Get exit components error:', error);
    throw new DatabaseError('Failed to fetch exit components');
  }
});
