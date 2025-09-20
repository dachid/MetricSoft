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
    const level = searchParams.get('level');

    let whereClause: any = {
      tenantId: user.tenantId || '',
      isActive: true,
    };

    if (level) {
      whereClause.organizationalLevel = level;
    }

    const components = await prisma.performanceComponent.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(components);
  } catch (error) {
    console.error('Error fetching performance components:', error);
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

    // Check if user has permission to create performance components
    const hasPermission = user.roles?.some((role: any) => 
      ['SUPER_ADMIN', 'ORGANIZATION_ADMIN'].includes(role.code)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, organizationalLevel, weight, orgUnitId } = body;

    if (!name || !organizationalLevel) {
      return NextResponse.json(
        { error: 'Name and organizational level are required' },
        { status: 400 }
      );
    }

    const component = await prisma.performanceComponent.create({
      data: {
        tenantId: user.tenantId || '',
        orgUnitId: orgUnitId || null,
        name,
        description,
        organizationalLevel,
        weight: weight || 1.0,
      },
    });

    return NextResponse.json(component, { status: 201 });
  } catch (error) {
    console.error('Error creating performance component:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
