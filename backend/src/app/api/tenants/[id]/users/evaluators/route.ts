import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

// GET /api/tenants/[id]/users/evaluators - Get users who can be assigned as evaluators
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user belongs to the same tenant (any authenticated user can view evaluators in their tenant)
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Get all users in the tenant except super admins (for evaluator selection)
    const users = await prisma.user.findMany({
      where: {
        tenantId: tenantId,
        // Exclude super admins from evaluator selection
        roles: {
          none: {
            role: {
              code: 'SUPER_ADMIN'
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        lineManager: true
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        users: users
      }
    });

  } catch (error) {
    console.error('Error fetching evaluators:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
