import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../lib/middleware/auth';

/**
 * Individual Fiscal Year API
 * PUT /api/tenants/{id}/fiscal-years/{fyId} - Update fiscal year
 */

// PUT /api/tenants/{id}/fiscal-years/{fyId}
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId } = params;
    const body = await request.json();

    // Verify tenant access - Super Admins can access any tenant
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify fiscal year exists and belongs to tenant
    const existingFiscalYear = await prisma.fiscalYear.findUnique({
      where: { id: fiscalYearId },
      include: {
        confirmations: true,
        _count: {
          select: {
            levelDefinitions: true,
            perspectives: true
          }
        }
      }
    });

    if (!existingFiscalYear || existingFiscalYear.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Fiscal year not found' },
        { status: 404 }
      );
    }

    // Extract updatable fields
    const { name, startDate, endDate, isCurrent, status } = body;
    const updateData: any = {};

    // Only allow certain fields to be updated
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) {
      // Only allow certain status transitions
      const allowedStatuses = ['draft', 'active', 'locked', 'archived'];
      if (allowedStatuses.includes(status)) {
        updateData.status = status;
      }
    }

    // Handle isCurrent flag - only one fiscal year can be current per tenant
    if (isCurrent !== undefined) {
      if (isCurrent && !existingFiscalYear.isCurrent) {
        // Setting this fiscal year as current - unset others
        await prisma.fiscalYear.updateMany({
          where: { 
            tenantId,
            isCurrent: true,
            id: { not: fiscalYearId } // Don't update the one we're about to set
          },
          data: { isCurrent: false }
        });
      }
      updateData.isCurrent = isCurrent;
    }

    // Update the fiscal year
    const updatedFiscalYear = await prisma.fiscalYear.update({
      where: { id: fiscalYearId },
      data: updateData,
      include: {
        confirmations: true,
        _count: {
          select: {
            levelDefinitions: true,
            perspectives: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedFiscalYear,
      message: 'Fiscal year updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating fiscal year:', error);
    return NextResponse.json(
      { error: 'Failed to update fiscal year', details: error.message },
      { status: 500 }
    );
  }
}

// Export with dynamic flag for Next.js
export const dynamic = 'force-dynamic';
