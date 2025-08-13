import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../../lib/middleware/auth';

/**
 * Perspectives API for Performance Components
 * Phase 2 - Perspectives Management
 */

// GET /api/tenants/{id}/fiscal-years/{fyId}/perspectives
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

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all perspectives for this fiscal year
    const perspectives = await prisma.fiscalYearPerspective.findMany({
      where: {
        fiscalYearId,
        fiscalYear: { tenantId }
      },
      orderBy: { sequenceOrder: 'asc' }
    });

    return NextResponse.json({
      perspectives,
      total: perspectives.length
    });

  } catch (error) {
    console.error('Error fetching perspectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants/{id}/fiscal-years/{fyId}/perspectives
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

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if performance components are already confirmed
    const confirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'performance_components'
        }
      }
    });

    if (confirmation && !confirmation.canModify) {
      return NextResponse.json(
        { error: 'Performance components are confirmed and cannot be modified' },
        { status: 403 }
      );
    }

    const { name, description, color, icon } = body;

    // Generate code from name
    const code = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

    // Get next sequence order
    const lastPerspective = await prisma.fiscalYearPerspective.findFirst({
      where: { fiscalYearId },
      orderBy: { sequenceOrder: 'desc' }
    });

    const sequenceOrder = (lastPerspective?.sequenceOrder || 0) + 1;

    // Create perspective
    const perspective = await prisma.fiscalYearPerspective.create({
      data: {
        fiscalYearId,
        code,
        name,
        description,
        color: color || '#3B82F6',
        icon,
        sequenceOrder,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      perspective
    });

  } catch (error) {
    console.error('Error creating perspective:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Perspective with this name already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
