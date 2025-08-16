import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

// GET /api/tenants/[id]/fiscal-years/[fyId]/confirmations/[type]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string; type: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId, type: confirmationType } = params;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user has appropriate permissions
    const isAuthorized = authResult.user.roles.some((role: any) => 
      ['ORGANIZATION_ADMIN', 'SUPER_ADMIN', 'STRATEGY_TEAM'].includes(role.code) &&
      (role.code === 'SUPER_ADMIN' || role.tenantId === tenantId)
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Validate confirmation type
    const validTypes = ['org_structure', 'performance_components'];
    if (!validTypes.includes(confirmationType)) {
      return NextResponse.json({ error: 'Invalid confirmation type' }, { status: 400 });
    }

    // Check if confirmation exists
    const confirmation = await prisma.fiscalYearConfirmation.findFirst({
      where: {
        fiscalYearId: fiscalYearId,
        confirmationType: confirmationType
      }
    });

    if (!confirmation) {
      return NextResponse.json({ 
        success: false,
        data: null,
        message: `${confirmationType} not confirmed` 
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: confirmation.id,
        confirmationType: confirmation.confirmationType,
        confirmedAt: confirmation.confirmedAt,
        confirmedBy: confirmation.confirmedBy,
        canModify: confirmation.canModify,
        metadata: confirmation.metadata
      }
    });

  } catch (error) {
    console.error('Error checking confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
