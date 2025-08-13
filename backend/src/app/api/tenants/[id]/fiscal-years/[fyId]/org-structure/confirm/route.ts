/**
 * Fiscal Year Confirmation API - POST /api/tenants/[id]/fiscal-years/[fyId]/org-structure/confirm
 * Confirms and locks the organizational structure for a fiscal year
 */

const { PrismaClient } = require('@prisma/client');
const { authenticateRequest } = require('../../../../../../../../lib/auth');

const prisma = new PrismaClient();

async function POST(request: Request, { params }: { params: { id: string, fyId: string } }) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId } = params;

    // Verify fiscal year belongs to tenant
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { id: fiscalYearId, tenantId }
    });

    if (!fiscalYear) {
      return Response.json({ error: 'Fiscal year not found' }, { status: 404 });
    }

    // Check if already confirmed
    const existingConfirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'org_structure'
        }
      }
    });

    if (existingConfirmation) {
      return Response.json(
        { error: 'Organizational structure is already confirmed' },
        { status: 400 }
      );
    }

    // Ensure there are level definitions to confirm
    const levelDefinitionsCount = await prisma.fiscalYearLevelDefinition.count({
      where: { fiscalYearId, isEnabled: true }
    });

    if (levelDefinitionsCount === 0) {
      return Response.json(
        { error: 'Cannot confirm: No enabled organizational levels found' },
        { status: 400 }
      );
    }

    // Create confirmation record
    const confirmation = await prisma.fiscalYearConfirmation.create({
      data: {
        fiscalYearId,
        confirmationType: 'org_structure',
        confirmedBy: user.id,
        confirmedAt: new Date(),
        canModify: false
      }
    });

    // Update fiscal year status if still in draft
    if (fiscalYear.status === 'draft') {
      await prisma.fiscalYear.update({
        where: { id: fiscalYearId },
        data: { status: 'active' }
      });
    }

    return Response.json({
      message: 'Organizational structure confirmed successfully',
      confirmation,
      nextStep: 'Configure Performance Components'
    });

  } catch (error: any) {
    console.error('Error confirming organizational structure:', error);
    return Response.json(
      { error: 'Failed to confirm organizational structure', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Export with dynamic flag for Next.js
export const dynamic = 'force-dynamic';
export { POST };
