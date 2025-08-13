import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { authMiddleware } from '../../../../../lib/middleware/auth';

/**
 * Fiscal Years API
 * Phase 1 - Fiscal Year Management
 */

// GET /api/tenants/{id}/fiscal-years
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId } = params;

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const fiscalYears = await prisma.fiscalYear.findMany({
      where: {
        tenantId: tenantId
      },
      include: {
        confirmations: true,
        _count: {
          select: {
            levelDefinitions: true,
            perspectives: true
          }
        }
      },
      orderBy: [
        { isCurrent: 'desc' },
        { startDate: 'desc' }
      ]
    });

    return NextResponse.json(fiscalYears);

  } catch (error: any) {
    console.error('Error fetching fiscal years:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fiscal years', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId } = params;
    const body = await request.json();

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate required fields
    const { name, startDate, endDate, isCurrent = false } = body;
    
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // If setting as current, unset other current fiscal years
    if (isCurrent) {
      await prisma.fiscalYear.updateMany({
        where: { tenantId, isCurrent: true },
        data: { isCurrent: false }
      });
    }

    // Create the new fiscal year
    const fiscalYear = await prisma.fiscalYear.create({
      data: {
        tenantId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'draft',
        isCurrent
      },
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

    return NextResponse.json(fiscalYear, { status: 201 });

  } catch (error: any) {
    console.error('Error creating fiscal year:', error);
    return NextResponse.json(
      { error: 'Failed to create fiscal year', details: error.message },
      { status: 500 }
    );
  }
}

// Export with dynamic flag for Next.js
export const dynamic = 'force-dynamic';
