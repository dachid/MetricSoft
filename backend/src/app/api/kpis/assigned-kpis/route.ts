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

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId');

    // Get organizational KPIs where the user is a KPI champion
    const kpis = await prisma.organizationalKPI.findMany({
      where: {
        organizationalUnit: {
          kpiChampions: {
            some: {
              userId: user.id,
            },
          },
        },
        ...(unitId && { organizationalUnitId: unitId }),
      },
      include: {
        component: true,
        organizationalUnit: {
          include: {
            levelDefinition: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response to match the expected structure
    const formattedKpis = kpis.map(kpi => ({
      id: kpi.id,
      name: kpi.name,
      description: kpi.description,
      targetValue: kpi.targetValue,
      currentValue: kpi.currentValue,
      unit: kpi.unit,
      status: kpi.status,
      createdAt: kpi.createdAt,
      updatedAt: kpi.updatedAt,
      component: {
        id: kpi.component.id,
        name: kpi.component.name,
        description: kpi.component.description,
      },
      organizationalUnit: {
        id: kpi.organizationalUnit.id,
        name: kpi.organizationalUnit.name,
        type: kpi.organizationalUnit.levelDefinition.name,
        level: kpi.organizationalUnit.levelDefinition.code,
      },
      assignedBy: {
        id: kpi.assignedBy.id,
        firstName: kpi.assignedBy.name?.split(' ')[0] || '',
        lastName: kpi.assignedBy.name?.split(' ').slice(1).join(' ') || '',
        email: kpi.assignedBy.email,
      },
    }));

    return NextResponse.json(formattedKpis);
  } catch (error) {
    console.error('Error fetching assigned KPIs:', error);
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
    const { name, description, targetValue, unit, componentId, organizationalUnitId } = body;

    if (!name || !targetValue || !unit || !componentId || !organizationalUnitId) {
      return NextResponse.json(
        { error: 'Name, target value, unit, component, and organizational unit are required' },
        { status: 400 }
      );
    }

    // Verify the user is a KPI champion for this organizational unit
    const championAssignment = await prisma.orgUnitKpiChampion.findFirst({
      where: {
        userId: user.id,
        orgUnitId: organizationalUnitId,
      },
    });

    if (!championAssignment) {
      return NextResponse.json(
        { error: 'You are not a KPI champion for this organizational unit' },
        { status: 403 }
      );
    }

    // Verify the component exists and is for organizational level
    const component = await prisma.performanceComponent.findFirst({
      where: {
        id: componentId,
        tenantId: user.tenantId || '',
        organizationalLevel: 'ORGANIZATIONAL',
        isActive: true,
      },
    });

    if (!component) {
      return NextResponse.json(
        { error: 'Invalid component or component not found' },
        { status: 400 }
      );
    }

    const kpi = await prisma.organizationalKPI.create({
      data: {
        organizationalUnitId,
        componentId,
        name,
        description,
        targetValue: parseFloat(targetValue.toString()),
        unit,
        assignedById: user.id,
      },
      include: {
        component: true,
        organizationalUnit: {
          include: {
            levelDefinition: true,
          },
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Format the response
    const formattedKpi = {
      ...kpi,
      organizationalUnit: {
        id: kpi.organizationalUnit.id,
        name: kpi.organizationalUnit.name,
        type: kpi.organizationalUnit.levelDefinition.name,
        level: kpi.organizationalUnit.levelDefinition.code,
      },
      assignedBy: {
        id: kpi.assignedBy.id,
        firstName: kpi.assignedBy.name?.split(' ')[0] || '',
        lastName: kpi.assignedBy.name?.split(' ').slice(1).join(' ') || '',
      },
    };

    return NextResponse.json(formattedKpi, { status: 201 });
  } catch (error) {
    console.error('Error creating organizational KPI:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
