import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';

/**
 * GET /api/tenants/{id}/org-units/{orgUnitId}/root-perspective
 * Get the perspective inherited from the root organizational unit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; orgUnitId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, orgUnitId } = params;

    // Verify tenant access
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the org unit and traverse up to root
    let currentUnit = await prisma.orgUnit.findFirst({
      where: {
        id: orgUnitId,
        tenantId
      },
      include: {
        fiscalYear: true
      }
    });

    if (!currentUnit) {
      return NextResponse.json({ error: 'Organizational unit not found' }, { status: 404 });
    }

    // Traverse up the hierarchy to find the root unit
    while (currentUnit?.parentId) {
      currentUnit = await prisma.orgUnit.findFirst({
        where: {
          id: currentUnit.parentId,
          tenantId
        },
        include: {
          fiscalYear: true
        }
      });
    }

    if (!currentUnit) {
      return NextResponse.json({ error: 'Root organizational unit not found' }, { status: 404 });
    }

    // Get the perspectives for this root unit's fiscal year
    // Since perspectives are defined at fiscal year level, we get the first active perspective
    // In the future, you might want to associate specific perspectives with root units
    const perspectives = await prisma.fiscalYearPerspective.findMany({
      where: {
        fiscalYearId: currentUnit.fiscalYearId,
        isActive: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 1 // For now, get the first perspective
    });

    if (perspectives.length === 0) {
      return NextResponse.json({ error: 'No perspectives found for root unit' }, { status: 404 });
    }

    return NextResponse.json({
      perspectiveId: perspectives[0].id,
      perspectiveName: perspectives[0].name,
      rootOrgUnitId: currentUnit.id,
      rootOrgUnitName: currentUnit.name
    }, { status: 200 });

  } catch (error) {
    console.error('Error getting root perspective:', error);
    return NextResponse.json({ error: 'Failed to get root perspective' }, { status: 500 });
  }
}
