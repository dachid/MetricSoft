/**
 * Fiscal Year Confirmations API - GET/POST /api/tenants/[id]/fiscal-years/[fyId]/confirmations
 * Manages confirmations for fiscal year configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../../lib/middleware/auth';

// GET /api/tenants/{id}/fiscal-years/{fyId}/confirmations
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId } = params;

    // Verify tenant access - Super Admins can access any tenant
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify fiscal year belongs to tenant
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, tenantId }
    });

    if (!fiscalYear) {
      return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 });
    }

    // Get confirmations for this fiscal year
    const confirmations = await prisma.fiscalYearConfirmation.findMany({
      where: { fiscalYearId },
      orderBy: { confirmedAt: 'desc' }
    });

    return NextResponse.json({ confirmations });

  } catch (error) {
    console.error('Error fetching fiscal year confirmations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants/{id}/fiscal-years/{fyId}/confirmations
export async function POST(
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

    const { confirmationType, metadata } = body;

    // Validate required fields
    if (!confirmationType) {
      return NextResponse.json(
        { error: 'confirmationType is required' },
        { status: 400 }
      );
    }

    // Verify fiscal year belongs to tenant
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, tenantId }
    });

    if (!fiscalYear) {
      return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 });
    }

    // Check if confirmation already exists
    const existingConfirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType
        }
      }
    });

    if (existingConfirmation) {
      return NextResponse.json(
        { error: `${confirmationType} is already confirmed for this fiscal year` },
        { status: 400 }
      );
    }

    // Create confirmation
    const confirmation = await prisma.fiscalYearConfirmation.create({
      data: {
        fiscalYearId,
        confirmationType,
        confirmedBy: authResult.user.id,
        confirmedAt: new Date(),
        canModify: false, // Lock the configuration
        ...(metadata && { metadata })
      }
    });

    return NextResponse.json({
      success: true,
      confirmation
    });

  } catch (error) {
    console.error('Error creating fiscal year confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
