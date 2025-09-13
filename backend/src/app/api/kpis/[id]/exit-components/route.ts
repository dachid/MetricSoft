import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createApiRoute, AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '@/lib/middleware';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET /api/kpis/[id]/exit-components - Get exit components for a KPI's org level
export const GET = createApiRoute(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await authMiddleware(req);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  if (!authResult.user?.tenantId) {
    throw new AuthenticationError('User must belong to a tenant');
  }

  try {
    const kpiId = params.id;
    
    // Get the KPI with its org unit and level definition
    const kpi = await prisma.kPI.findUnique({
      where: { id: kpiId },
      include: {
        orgUnit: {
          include: {
            levelDefinition: true
          }
        },
        fiscalYear: true
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found');
    }

    // Verify user has access to this KPI's tenant
    if (kpi.tenantId !== authResult.user.tenantId) {
      throw new AuthorizationError('Access denied');
    }

    // Get exit component templates for this level
    const exitComponents = await prisma.performanceComponentTemplate.findMany({
      where: {
        fiscalYearId: kpi.fiscalYearId,
        orgLevelId: kpi.orgUnit.levelDefinitionId,
        componentType: 'exit'
      },
      include: {
        orgLevel: true,
        exitRelationships: {
          include: {
            entryComponent: {
              include: { orgLevel: true }
            }
          }
        }
      },
      orderBy: { sequenceOrder: 'asc' }
    });

    // Get existing exit components for this KPI from performance_components table
    const existingObjectives = await prisma.$queryRaw`
      SELECT pc.*, u.name as "createdByName", u.email as "createdByEmail"
      FROM performance_components pc
      LEFT JOIN users u ON pc."createdById" = u.id
      WHERE pc."kpiId" = ${kpiId} AND pc."componentType" = 'EXIT'
      ORDER BY pc."createdAt" DESC
    `;

    return {
      exitComponents,
      existingObjectives,
      kpi: {
        id: kpi.id,
        name: kpi.name,
        orgUnit: kpi.orgUnit,
        level: kpi.orgUnit.levelDefinition
      }
    };
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/kpis/[id]/exit-components - Create exit component (objective) for a KPI
export const POST = createApiRoute(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authResult = await authMiddleware(req);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  if (!authResult.user?.tenantId) {
    throw new AuthenticationError('User must belong to a tenant');
  }

  try {
    const kpiId = params.id;
    const body = await req.json();
    const { name, description, parentExitComponentId } = body;

    if (!name) {
      throw new ValidationError('Name is required');
    }

    // Get the KPI details
    const kpi = await prisma.kPI.findUnique({
      where: { id: kpiId },
      include: { 
        orgUnit: {
          include: {
            levelDefinition: true
          }
        }
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found');
    }

    // Verify user has access to this KPI's tenant
    if (kpi.tenantId !== authResult.user.tenantId) {
      throw new AuthorizationError('Access denied');
    }

    // Create the exit component in performance_components table
    const exitComponent = await prisma.$queryRaw`
      INSERT INTO performance_components (
        id, "tenantId", name, description, "organizationalLevel", 
        "componentType", "kpiId", "templateId", "createdById", 
        weight, "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, ${kpi.tenantId}, ${name}, ${description}, ${kpi.orgUnit.levelDefinition.name},
        'EXIT', ${kpiId}, ${parentExitComponentId}, ${authResult.user.id},
        1.0, true, NOW(), NOW()
      ) RETURNING *
    `;

    return { exitComponent };
  } finally {
    await prisma.$disconnect();
  }
});
