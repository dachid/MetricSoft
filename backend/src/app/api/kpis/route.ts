import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/kpis - Get KPIs for current user's org unit
export const GET = createApiRoute(async (request: NextRequest) => {
  console.log('🔍 [KPI API] GET /api/kpis called');
  
  const authResult = await authMiddleware(request);
  console.log('🔍 [KPI API] Auth result:', { success: authResult.success, userId: authResult.user?.id, tenantId: authResult.user?.tenantId });
  
  if (!authResult.success) {
    console.log('❌ [KPI API] Authentication failed:', authResult.error);
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const orgUnitId = searchParams.get('orgUnitId');
  const fiscalYearId = searchParams.get('fiscalYearId');
  const includeShared = searchParams.get('includeShared') === 'true';
  
  console.log('🔍 [KPI API] Search params:', { orgUnitId, fiscalYearId, includeShared });

  if (!authResult.user?.tenantId) {
    console.log('❌ [KPI API] User has no tenant');
    throw new AuthorizationError('User must belong to a tenant');
  }

  try {
    // Base query for KPIs
    const baseWhere: any = {
      tenantId: authResult.user.tenantId,
      isActive: true,
    };

    if (orgUnitId) {
      baseWhere.orgUnitId = orgUnitId;
    }

    if (fiscalYearId) {
      baseWhere.fiscalYearId = fiscalYearId;
    }
    
    console.log('🔍 [KPI API] Base where clause:', baseWhere);

    // Get KPIs created by or assigned to the user
    const kpis = await (prisma as any).kPI.findMany({
      where: {
        ...baseWhere,
        OR: [
          { createdById: authResult.user!.id },
          { evaluatorId: authResult.user!.id },
          ...(includeShared ? [{ shares: { some: { sharedWithUserId: authResult.user!.id } } }] : [])
        ]
      },
      include: {
        target: true,
        perspective: true,
        parentObjective: true,
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgUnit: {
          include: {
            levelDefinition: true
          }
        },
        shares: {
          include: {
            sharedWithUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('🔍 [KPI API] Query completed. Found KPIs:', kpis.length);
    console.log('🔍 [KPI API] KPI names:', kpis.map((kpi: any) => kpi.name));

    return {
      success: true,
      data: kpis
    };

  } catch (error) {
    console.error('❌ [KPI API] Error fetching KPIs:', error);
    throw new DatabaseError('Failed to fetch KPIs');
  }
});

// POST /api/kpis - Create new KPI
export const POST = createApiRoute(async (request: NextRequest) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  if (!authResult.user?.tenantId) {
    throw new AuthorizationError('User must belong to a tenant');
  }

  try {
    const body = await request.json();
    const {
      fiscalYearId,
      orgUnitId,
      perspectiveId,
      parentObjectiveId,
      objectiveTitle,
      objectiveDescription,
      name,
      description,
      code,
      evaluatorId,
      isRecurring,
      frequency,
      dueDate,
      target
    } = body;

    // Validation
    if (!fiscalYearId || !orgUnitId || !name || !code || !evaluatorId) {
      throw new ValidationError('Missing required fields');
    }

    // Verify fiscal year exists and is current
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        tenantId: authResult.user.tenantId,
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
        tenantId: authResult.user.tenantId,
        fiscalYearId
      },
      include: {
        levelDefinition: true
      }
    });

    if (!orgUnit) {
      throw new ValidationError('Invalid organizational unit');
    }

    // Check if user is a KPI champion for this org unit
    const isKpiChampion = await prisma.orgUnitKpiChampion.findFirst({
      where: {
        orgUnitId,
        userId: authResult.user.id
      }
    });

    if (!isKpiChampion) {
      throw new AuthorizationError('User is not a KPI champion for this organizational unit');
    }

    // Verify perspective exists if provided
    if (perspectiveId) {
      const perspective = await prisma.fiscalYearPerspective.findFirst({
        where: {
          id: perspectiveId,
          fiscalYearId,
          isActive: true
        }
      });

      if (!perspective) {
        throw new ValidationError('Invalid perspective');
      }
    }

    // Verify evaluator exists
    const evaluator = await prisma.user.findFirst({
      where: {
        id: evaluatorId,
        tenantId: authResult.user.tenantId
      }
    });

    if (!evaluator) {
      throw new ValidationError('Invalid evaluator');
    }

    // Check for unique code within tenant and fiscal year
    const existingKpi = await (prisma as any).kPI.findFirst({
      where: {
        tenantId: authResult.user!.tenantId,
        fiscalYearId,
        code,
        isActive: true
      }
    });

    if (existingKpi) {
      throw new ValidationError('KPI code already exists for this fiscal year');
    }

    // Create KPI with target in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      let actualParentObjectiveId = parentObjectiveId;

      // Create objective if objectiveTitle is provided
      if (objectiveTitle && objectiveTitle.trim()) {
        const objective = await tx.kPIObjective.create({
          data: {
            tenantId: authResult.user!.tenantId,
            fiscalYearId,
            orgUnitId,
            name: objectiveTitle.trim(),
            description: objectiveDescription?.trim() || '',
            createdById: authResult.user!.id
          }
        });
        actualParentObjectiveId = objective.id;
      }

      // Create the KPI
      const kpi = await tx.kPI.create({
        data: {
          tenantId: authResult.user!.tenantId,
          fiscalYearId,
          orgUnitId,
          perspectiveId,
          parentObjectiveId: actualParentObjectiveId,
          name,
          description,
          code,
          evaluatorId,
          createdById: authResult.user!.id,
          isRecurring,
          frequency: isRecurring ? frequency : null,
          dueDate: !isRecurring && dueDate ? new Date(dueDate) : null
        }
      });

      // Create the target
      if (target) {
        await tx.kPITarget.create({
          data: {
            kpiId: kpi.id,
            currentValue: target.currentValue || '0',
            targetValue: target.targetValue,
            targetType: target.targetType || 'NUMERIC',
            targetLabel: target.targetLabel,
            targetDirection: target.targetDirection || 'INCREASING'
          }
        });
      }

      // Create audit log
      await tx.kPIAuditLog.create({
        data: {
          kpiId: kpi.id,
          userId: authResult.user!.id,
          action: 'CREATE',
          newValues: {
            name,
            description,
            code,
            evaluatorId,
            target
          }
        }
      });

      return kpi;
    });

    // Fetch the complete KPI with relations
    const createdKpi = await (prisma as any).kPI.findUnique({
      where: { id: result.id },
      include: {
        target: true,
        perspective: true,
        parentObjective: true,
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgUnit: {
          include: {
            levelDefinition: true
          }
        }
      }
    });

    return {
      success: true,
      data: createdKpi
    };

  } catch (error) {
    console.error('Create KPI error:', error);
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new DatabaseError('Failed to create KPI');
  }
});
