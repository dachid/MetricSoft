import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;

    // Get all KPIs created by the user, then filter for individual KPIs (orgUnitId is null)
    const allKpis = await prisma.kPI.findMany({
      where: {
        createdById: user.id,
      },
      include: {
        target: true,
        perspective: true,
        orgUnit: true,
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter to only individual KPIs (where orgUnitId is null)
    const individualKpis = allKpis.filter(kpi => kpi.orgUnitId === null);

    return NextResponse.json(individualKpis);
  } catch (error) {
    console.error('Error fetching individual KPIs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // This endpoint is no longer used - all KPIs are created via /api/kpis
  // Individual KPIs are distinguished by having orgUnitId = null
  return NextResponse.json(
    { error: 'Use /api/kpis endpoint for creating KPIs' },
    { status: 400 }
  );
}
