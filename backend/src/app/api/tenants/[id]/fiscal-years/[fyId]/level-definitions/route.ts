/**
 * Fiscal Year Level Definitions API - GET/PUT /api/tenants/[id]/fiscal-years/[fyId]/level-definitions
 * Manages organizational structure for a specific fiscal year
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../../lib/middleware/auth';

// GET /api/tenants/{id}/fiscal-years/{fyId}/level-definitions
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

    // Verify fiscal year belongs to tenant
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, tenantId }
    });

    if (!fiscalYear) {
      return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 });
    }

    // Get level definitions for this fiscal year
    const levelDefinitions = await prisma.fiscalYearLevelDefinition.findMany({
      where: { fiscalYearId },
      orderBy: { hierarchyLevel: 'asc' }
    });

    return NextResponse.json({ levelDefinitions });

  } catch (error) {
    console.error('Error fetching fiscal year level definitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/{id}/fiscal-years/{fyId}/level-definitions
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

    // Verify tenant access
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if org structure is already confirmed
    const confirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'org_structure'
        }
      }
    });

    if (confirmation && !confirmation.canModify) {
      return NextResponse.json(
        { error: 'Organizational structure is confirmed and cannot be modified' },
        { status: 403 }
      );
    }

    const { levelDefinitions } = body;

    // Validate levelDefinitions
    if (!Array.isArray(levelDefinitions)) {
      return NextResponse.json(
        { error: 'levelDefinitions must be an array' },
        { status: 400 }
      );
    }

    // Use transaction to update all level definitions
    const updatedLevelDefinitions = await prisma.$transaction(async (tx) => {
      // Delete existing level definitions for this fiscal year
      await tx.fiscalYearLevelDefinition.deleteMany({
        where: { fiscalYearId }
      });

      // Create new level definitions
      const created = [];
      for (const levelDef of levelDefinitions) {
        const newLevelDef = await tx.fiscalYearLevelDefinition.create({
          data: {
            fiscalYearId,
            code: levelDef.code,
            name: levelDef.name,
            pluralName: levelDef.pluralName,
            hierarchyLevel: levelDef.hierarchyLevel,
            isStandard: levelDef.isStandard || false,
            isEnabled: levelDef.isEnabled !== false,
            icon: levelDef.icon,
            color: levelDef.color || '#6B7280',
            metadata: levelDef.metadata || {}
          }
        });
        created.push(newLevelDef);
      }
      return created;
    });

    return NextResponse.json({
      success: true,
      levelDefinitions: updatedLevelDefinitions
    });

  } catch (error) {
    console.error('Error updating fiscal year level definitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
