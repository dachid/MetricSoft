import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;

    const { id } = params;
    const body = await request.json();
    const { currentValue } = body;

    if (currentValue === undefined || currentValue === null) {
      return NextResponse.json(
        { error: 'Current value is required' },
        { status: 400 }
      );
    }

    // Verify the KPI belongs to the current user
    const existingKpi = await prisma.individualKPI.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingKpi) {
      return NextResponse.json(
        { error: 'KPI not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate new status based on progress
    let newStatus = existingKpi.status;
    const progress = existingKpi.targetValue > 0 ? (currentValue / existingKpi.targetValue) * 100 : 0;

    if (progress >= 100) {
      newStatus = 'COMPLETED';
    } else if (progress > 0) {
      newStatus = 'IN_PROGRESS';
    } else {
      newStatus = 'NOT_STARTED';
    }

    // Update the KPI
    const updatedKpi = await prisma.individualKPI.update({
      where: { id },
      data: {
        currentValue: parseFloat(currentValue.toString()),
        status: newStatus,
      },
      include: {
        component: true,
      },
    });

    return NextResponse.json(updatedKpi);
  } catch (error) {
    console.error('Error updating KPI progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
