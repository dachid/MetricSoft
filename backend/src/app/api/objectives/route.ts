import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/objectives - Get objectives for autocomplete
export const GET = createApiRoute(async (request: NextRequest) => {
  console.log('🔍 [Objectives API] GET /api/objectives called');
  
  const authResult = await authMiddleware(request);
  console.log('🔍 [Objectives API] Auth result:', { success: authResult.success, userId: authResult.user?.id, tenantId: authResult.user?.tenantId });
  
  if (!authResult.success) {
    console.log('❌ [Objectives API] Authentication failed:', authResult.error);
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const orgUnitId = searchParams.get('orgUnitId');
  const fiscalYearId = searchParams.get('fiscalYearId');
  const search = searchParams.get('search');
  
  console.log('🔍 [Objectives API] Search params:', { orgUnitId, fiscalYearId, search });

  if (!orgUnitId || !fiscalYearId) {
    console.log('❌ [Objectives API] Missing required params');
    throw new ValidationError('Organization unit ID and fiscal year ID are required');
  }

  try {
    const whereClause: any = {
      tenantId: authResult.user!.tenantId,
      fiscalYearId,
      orgUnitId,
      isActive: true
    };

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    console.log('🔍 [Objectives API] Where clause:', whereClause);

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
    
    console.log('🔍 [Objectives API] Found objectives:', objectives.length);
    console.log('🔍 [Objectives API] Objectives data:', objectives);

    return {
      success: true,
      data: objectives
    };

  } catch (error) {
    console.error('❌ [Objectives API] Get objectives error:', error);
    throw new DatabaseError('Failed to fetch objectives');
  }
});

// POST /api/objectives - Create new objective
export const POST = createApiRoute(async (request: NextRequest) => {
  console.log('🔍 [Objectives API] POST request received');
  
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    console.log('❌ [Objectives API] Authentication failed:', authResult.error);
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  try {
    const body = await request.json();
    const {
      fiscalYearId,
      orgUnitId,
      name,
      description,
      parentExitComponentId
    } = body;

    console.log('🔍 [Objectives API] Create objective request:', { fiscalYearId, orgUnitId, name, description, userId: authResult.user!.id });

    // Validation
    if (!fiscalYearId || !orgUnitId || !name) {
      throw new ValidationError('Fiscal year ID, organization unit ID, and name are required');
    }

    // Verify fiscal year exists and is current
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        tenantId: authResult.user!.tenantId!,
        isCurrent: true
      }
    });

    if (!fiscalYear) {
      throw new ValidationError('Invalid or non-current fiscal year');
    }

    // Verify org unit exists
    const orgUnit = await prisma.orgUnit.findFirst({
      where: {
        id: orgUnitId,
        tenantId: authResult.user!.tenantId!,
        fiscalYearId
      }
    });

    if (!orgUnit) {
      throw new ValidationError('Invalid organizational unit');
    }

    // Check if user is a KPI champion for this org unit
    const isKpiChampion = await prisma.orgUnitKpiChampion.findFirst({
      where: {
        orgUnitId,
        userId: authResult.user!.id
      }
    });

    console.log('🔍 [Objectives API] KPI Champion check:', { orgUnitId, userId: authResult.user!.id, isKpiChampion: !!isKpiChampion });

    if (!isKpiChampion) {
      console.log('❌ [Objectives API] User is not a KPI champion for org unit:', orgUnitId);
      throw new AuthorizationError('User is not a KPI champion for this organizational unit');
    }

    // Create the objective
    const objective = await (prisma as any).kPIObjective.create({
      data: {
        tenantId: authResult.user!.tenantId!,
        fiscalYearId,
        orgUnitId,
        name,
        description,
        parentExitComponentId,
        createdById: authResult.user!.id
      }
    });

    return NextResponse.json({
      success: true,
      data: objective
    }, { status: 201 });

  } catch (error) {
    console.error('❌ [Objectives API] Create objective error:', error);
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError('Failed to create objective');
  }
});
