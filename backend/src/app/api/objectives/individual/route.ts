import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, ValidationError, DatabaseError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/objectives/individual - Get individual objectives for current user
export const GET = createApiRoute(async (request: NextRequest) => {
  console.log('🔍 [Individual Objectives API] GET /api/objectives/individual called');
  
  const authResult = await authMiddleware(request);
  console.log('🔍 [Individual Objectives API] Auth result:', { success: authResult.success, userId: authResult.user?.id, tenantId: authResult.user?.tenantId });
  
  if (!authResult.success) {
    console.log('❌ [Individual Objectives API] Authentication failed:', authResult.error);
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const fiscalYearId = searchParams.get('fiscalYearId');
  const search = searchParams.get('search');
  
  console.log('🔍 [Individual Objectives API] Search params:', { fiscalYearId, search, userId: authResult.user?.id });

  if (!fiscalYearId) {
    console.log('❌ [Individual Objectives API] Missing fiscal year ID');
    throw new ValidationError('Fiscal year ID is required');
  }

  try {
    const whereClause: any = {
      tenantId: authResult.user!.tenantId,
      fiscalYearId,
      orgUnitId: null, // Individual objectives have null orgUnitId
      createdById: authResult.user!.id, // Only objectives created by this user
      isActive: true
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    console.log('🔍 [Individual Objectives API] Where clause:', whereClause);

    const objectives = await (prisma as any).kPIObjective.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 20
    });
    
    console.log('🔍 [Individual Objectives API] Found individual objectives:', objectives.length);
    console.log('🔍 [Individual Objectives API] Objectives data:', objectives);

    return {
      success: true,
      data: objectives
    };

  } catch (error) {
    console.error('❌ [Individual Objectives API] Get individual objectives error:', error);
    throw new DatabaseError('Failed to fetch individual objectives');
  }
});