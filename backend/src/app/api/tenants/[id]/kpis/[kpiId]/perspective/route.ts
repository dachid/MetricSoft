import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';

/**
 * GET /api/tenants/{id}/kpis/{kpiId}/perspective
 * Resolve the correct perspective for a KPI by following the performance component chain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; kpiId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, kpiId } = params;

    // Verify tenant access
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log(`🔍 [Perspective Resolver] Starting resolution for KPI: ${kpiId}`);

    // Get the starting KPI
    let currentKpi = await prisma.kPI.findFirst({
      where: {
        id: kpiId,
        tenantId
      },
      include: {
        performanceComponent: true,
        perspective: true
      }
    });

    if (!currentKpi) {
      return NextResponse.json({ error: 'KPI not found' }, { status: 404 });
    }

    console.log(`🔍 [Perspective Resolver] Found KPI: ${currentKpi.name} (${currentKpi.code})`);
    console.log(`🔍 [Perspective Resolver] Performance Component ID: ${currentKpi.performanceComponentId}`);
    console.log(`🔍 [Perspective Resolver] Current Perspective ID: ${currentKpi.perspectiveId}`);

    // Follow the performance component chain backwards
    let chainDepth = 0;
    const maxDepth = 20; // Prevent infinite loops
    let resolutionPath = [`${currentKpi.name} (${currentKpi.code})`];

    while (currentKpi?.performanceComponentId && chainDepth < maxDepth) {
      chainDepth++;
      console.log(`🔍 [Perspective Resolver] Chain depth ${chainDepth}: Following performance component ${currentKpi.performanceComponentId}`);

      // Get the performance component
      const performanceComponent = await prisma.performanceComponent.findFirst({
        where: {
          id: currentKpi.performanceComponentId,
          isActive: true
        }
      });

      if (!performanceComponent) {
        console.log(`🔍 [Perspective Resolver] Performance component not found: ${currentKpi.performanceComponentId}`);
        break;
      }

      if (!performanceComponent.kpiId) {
        console.log(`🔍 [Perspective Resolver] Performance component has no source KPI: ${performanceComponent.id}`);
        break;
      }

      // Get the source KPI that this performance component came from
      const sourceKpi = await prisma.kPI.findFirst({
        where: {
          id: performanceComponent.kpiId,
          tenantId
        },
        include: {
          performanceComponent: true,
          perspective: true
        }
      });

      if (!sourceKpi) {
        console.log(`🔍 [Perspective Resolver] Source KPI not found: ${performanceComponent.kpiId}`);
        break;
      }

      console.log(`🔍 [Perspective Resolver] Found source KPI: ${sourceKpi.name} (${sourceKpi.code})`);
      console.log(`🔍 [Perspective Resolver] Source KPI Performance Component ID: ${sourceKpi.performanceComponentId}`);
      console.log(`🔍 [Perspective Resolver] Source KPI Perspective ID: ${sourceKpi.perspectiveId}`);

      resolutionPath.push(`${sourceKpi.name} (${sourceKpi.code})`);
      currentKpi = sourceKpi;

      // If this KPI has no performance component, it's the root organizational KPI
      if (!currentKpi.performanceComponentId) {
        console.log(`🔍 [Perspective Resolver] Found root organizational KPI: ${currentKpi.name}`);
        break;
      }
    }

    if (chainDepth >= maxDepth) {
      console.error(`🔍 [Perspective Resolver] Maximum chain depth reached (${maxDepth}), possible circular reference`);
      return NextResponse.json({ error: 'Maximum resolution depth reached' }, { status: 500 });
    }

    if (!currentKpi) {
      console.error(`🔍 [Perspective Resolver] Lost current KPI during resolution`);
      return NextResponse.json({ error: 'Resolution failed' }, { status: 500 });
    }

    // The current KPI should now be the root organizational KPI with the correct perspective
    if (!currentKpi.perspectiveId) {
      console.error(`🔍 [Perspective Resolver] Root KPI has no perspective: ${currentKpi.name}`);
      return NextResponse.json({ error: 'Root KPI has no perspective assigned' }, { status: 404 });
    }

    // Get the perspective details
    const perspective = await prisma.fiscalYearPerspective.findFirst({
      where: {
        id: currentKpi.perspectiveId,
        isActive: true
      }
    });

    if (!perspective) {
      return NextResponse.json({ error: 'Perspective not found or inactive' }, { status: 404 });
    }

    console.log(`✅ [Perspective Resolver] Resolved perspective: ${perspective.name} (${perspective.id})`);
    console.log(`✅ [Perspective Resolver] Resolution path: ${resolutionPath.reverse().join(' → ')}`);

    return NextResponse.json({
      perspectiveId: perspective.id,
      perspectiveName: perspective.name,
      perspectiveCode: perspective.code,
      rootKpiId: currentKpi.id,
      rootKpiName: currentKpi.name,
      rootKpiCode: currentKpi.code,
      chainDepth: chainDepth,
      resolutionPath: resolutionPath
    }, { status: 200 });

  } catch (error) {
    console.error('Error resolving perspective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}