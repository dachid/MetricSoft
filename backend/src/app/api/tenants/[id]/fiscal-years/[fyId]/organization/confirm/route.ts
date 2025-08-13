import { NextRequest } from 'next/server';
import { prisma } from '../../../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../../../lib/middleware/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    const authResult = await authMiddleware(req);
    if (!authResult.success || !authResult.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId, fyId } = params;

    // Verify user has access to this tenant
    if (authResult.user.tenantId !== tenantId) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if organizational structure confirmation already exists
    const existingConfirmation = await prisma.fiscalYearConfirmation.findFirst({
      where: {
        fiscalYearId: fyId,
        confirmationType: 'ORGANIZATION_STRUCTURE'
      }
    });

    if (existingConfirmation) {
      return Response.json({
        success: true,
        message: 'Organization structure is already confirmed',
        data: { confirmation: existingConfirmation }
      });
    }

    // Check if there are organizational levels defined
    const orgLevels = await prisma.fiscalYearLevelDefinition.findMany({
      where: { fiscalYearId: fyId }
    });

    if (orgLevels.length === 0) {
      return Response.json({
        error: 'No organizational levels found. Please define organizational structure first.'
      }, { status: 400 });
    }

    // Create the confirmation record
    const confirmation = await prisma.fiscalYearConfirmation.create({
      data: {
        fiscalYearId: fyId,
        confirmationType: 'ORGANIZATION_STRUCTURE',
        confirmedBy: authResult.user.id,
        confirmedAt: new Date(),
        metadata: {
          levelsCount: orgLevels.length,
          levelNames: orgLevels.map((l: any) => l.name)
        }
      }
    });

    return Response.json({
      success: true,
      message: 'Organization structure confirmed successfully',
      data: { confirmation }
    });

  } catch (error) {
    console.error('Organization confirmation error:', error);
    return Response.json({
      error: 'Failed to confirm organization structure'
    }, { status: 500 });
  }
}
