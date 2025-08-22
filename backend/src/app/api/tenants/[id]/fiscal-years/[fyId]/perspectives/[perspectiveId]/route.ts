import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../../../lib/middleware/auth';

/**
 * Individual Perspective Management API
 * Phase 2 - Update/Delete specific perspectives
 */

// PUT /api/tenants/{id}/fiscal-years/{fyId}/perspectives/{perspectiveId}
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string; perspectiveId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId, perspectiveId } = params;
    const body = await request.json();

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if performance components are confirmed - they must be confirmed to allow perspective modifications
    const confirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'performance_components'
        }
      }
    });

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Performance components must be confirmed before managing perspectives' },
        { status: 403 }
      );
    }

    const { name, description, color, icon } = body;

    // Update perspective
    const perspective = await prisma.fiscalYearPerspective.update({
      where: {
        id: perspectiveId,
        fiscalYearId, // Ensure it belongs to the correct fiscal year
        fiscalYear: { tenantId } // Ensure it belongs to the correct tenant
      },
      data: {
        name,
        description,
        color,
        icon,
        // Update code if name changed
        ...(name && { code: name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') })
      }
    });

    return NextResponse.json({
      success: true,
      perspective
    });

  } catch (error) {
    console.error('Error updating perspective:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Perspective with this name already exists' },
        { status: 400 }
      );
    }
    
    // Handle not found
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Perspective not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenants/{id}/fiscal-years/{fyId}/perspectives/{perspectiveId}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string; perspectiveId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId, perspectiveId } = params;

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if performance components are confirmed - they must be confirmed to allow perspective modifications
    const confirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'performance_components'
        }
      }
    });

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Performance components must be confirmed before managing perspectives' },
        { status: 403 }
      );
    }

    // Delete perspective
    await prisma.fiscalYearPerspective.delete({
      where: {
        id: perspectiveId,
        fiscalYearId, // Ensure it belongs to the correct fiscal year
        fiscalYear: { tenantId } // Ensure it belongs to the correct tenant
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Perspective deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting perspective:', error);
    
    // Handle not found
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Perspective not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
