import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/kpis/users - Get users available for KPI sharing
export const GET = createApiRoute(async (request: NextRequest) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  if (!authResult.user?.tenantId) {
    throw new AuthenticationError('User must belong to a tenant');
  }

  try {
    // Get all users in the same tenant (excluding current user)
    const users = await prisma.user.findMany({
      where: {
        tenantId: authResult.user.tenantId,
        id: {
          not: authResult.user.id
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    });

    return {
      success: true,
      data: users
    };

  } catch (error) {
    console.error('Error fetching users for KPI sharing:', error);
    throw new Error('Failed to fetch users');
  }
});
