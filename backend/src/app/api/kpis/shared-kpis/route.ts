import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/kpis/shared-kpis - Get KPIs shared with the current user
export const GET = createApiRoute(async (request: NextRequest) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const fiscalYearId = searchParams.get('fiscalYearId');
  const perspective = searchParams.get('perspective');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    // Build where clause for filtering
    const whereClause: any = {
      tenantId: authResult.user!.tenantId,
      shares: {
        some: {
          sharedWithUserId: authResult.user!.id
        }
      },
      ...(fiscalYearId && { fiscalYearId }),
      ...(perspective && { perspective }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Get shared KPIs with related data
    const [kpis, totalCount] = await Promise.all([
      (prisma as any).kPI.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true
            }
          },
          evaluator: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true
            }
          },
          fiscalYear: {
            select: {
              id: true,
              year: true,
              startDate: true,
              endDate: true,
              isCurrent: true
            }
          },
          exitComponent: {
            select: {
              id: true,
              name: true,
              description: true,
              weight: true
            }
          },
          targets: {
            include: {
              progressUpdates: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          },
          objectives: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' }
          },
          shares: {
            where: {
              sharedWithUserId: authResult.user!.id
            },
            include: {
              sharedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePicture: true
                }
              }
            }
          },
          _count: {
            select: {
              targets: true,
              objectives: true,
              shares: true
            }
          }
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      (prisma as any).kPI.count({ where: whereClause })
    ]);

    // Transform the data to include user-specific share permissions
    const transformedKpis = kpis.map((kpi: any) => {
      const userShare = kpi.shares.find((share: any) => share.sharedWithUserId === authResult.user!.id);
      
      return {
        id: kpi.id,
        name: kpi.name,
        description: kpi.description,
        perspective: kpi.perspective,
        status: kpi.status,
        isRecurring: kpi.isRecurring,
        frequency: kpi.frequency,
        dueDate: kpi.dueDate,
        createdAt: kpi.createdAt,
        updatedAt: kpi.updatedAt,
        
        // Owner information
        owner: kpi.createdBy,
        evaluator: kpi.evaluator,
        
        // Share information
        shareInfo: {
          sharedBy: userShare?.sharedBy,
          canEdit: userShare?.canEdit || false,
          canView: userShare?.canView || true,
          sharedAt: userShare?.createdAt
        },
        
        // Related data
        fiscalYear: kpi.fiscalYear,
        exitComponent: kpi.exitComponent,
        targets: kpi.targets,
        objectives: kpi.objectives,
        
        // Counts
        counts: kpi._count
      };
    });

    return {
      success: true,
      data: transformedKpis,
      meta: {
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        filters: {
          fiscalYearId,
          perspective,
          status,
          search
        }
      }
    };
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new DatabaseError('Database constraint violation', error.message);
    } else if (error.code?.startsWith('P')) {
      throw new DatabaseError('Database operation failed', error.message);
    }
    
    throw new DatabaseError(
      'Failed to fetch shared KPIs',
      error.message,
      { 
        metadata: { 
          userId: authResult.user!.id,
          tenantId: authResult.user!.tenantId
        } 
      }
    );
  }
});
