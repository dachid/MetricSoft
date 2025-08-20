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

    const kpis = await prisma.individualKPI.findMany({
      where: {
        userId: user.id,
      },
      include: {
        component: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching individual KPIs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;

    const body = await request.json();
    const { name, description, targetValue, unit, componentId } = body;

    if (!name || !targetValue || !unit || !componentId) {
      return NextResponse.json(
        { error: 'Name, target value, unit, and component are required' },
        { status: 400 }
      );
    }

    // Verify the component exists and is for individual level
    const component = await prisma.performanceComponent.findFirst({
      where: {
        id: componentId,
        tenantId: user.tenantId || '',
        organizationalLevel: 'INDIVIDUAL',
        isActive: true,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Invalid component or component not found' },
        { status: 400 }
      );
    }

    const kpi = await prisma.individualKPI.create({
      data: {
        userId: user.id,
        componentId,
        name,
        description,
        targetValue: parseFloat(targetValue.toString()),
        unit,
      },
      include: {
        component: true,
      },
    });

    return NextResponse.json(kpi, { status: 201 });
  } catch (error) {
    console.error('Error creating individual KPI:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
