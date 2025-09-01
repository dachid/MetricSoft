import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { createApiRoute, AuthenticationError, AuthorizationError, ValidationError, DatabaseError, NotFoundError } from '@/lib/middleware';

export const dynamic = 'force-dynamic';

// GET /api/kpis/[id] - Get single KPI
export const GET = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const kpiId = params.id;

  try {
    const kpi = await (prisma as any).kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: authResult.user!.tenantId,
        OR: [
          { createdById: authResult.user!.id },
          { evaluatorId: authResult.user!.id },
          { shares: { some: { sharedWithUserId: authResult.user!.id } } }
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
        },
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found or access denied');
    }

    return NextResponse.json({
      success: true,
      data: kpi
    });

  } catch (error) {
    console.error('Get KPI error:', error);
    throw new DatabaseError('Failed to fetch KPI');
  }
});

// PUT /api/kpis/[id] - Update KPI
export const PUT = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const kpiId = params.id;

  try {
    const body = await request.json();
    const {
      perspectiveId,
      parentObjectiveId,
      name,
      description,
      code,
      evaluatorId,
      isRecurring,
      frequency,
      dueDate,
      target
    } = body;

    // Verify KPI exists and user has edit access
    const existingKpi = await (prisma as any).kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: authResult.user!.tenantId,
        OR: [
          { createdById: authResult.user!.id },
          { evaluatorId: authResult.user!.id },
          { shares: { some: { sharedWithUserId: authResult.user!.id, canEdit: true } } }
        ]
      },
      include: {
        target: true
      }
    });

    if (!existingKpi) {
      throw new NotFoundError('KPI not found or access denied');
    }

    // Validation
    if (name && !name.trim()) {
      throw new ValidationError('KPI name cannot be empty');
    }

    if (code && code !== existingKpi.code) {
      // Check for unique code
      const codeExists = await (prisma as any).kPI.findFirst({
        where: {
          tenantId: authResult.user!.tenantId,
          fiscalYearId: existingKpi.fiscalYearId,
          code,
          isActive: true,
          id: { not: kpiId }
        }
      });

      if (codeExists) {
        throw new ValidationError('KPI code already exists for this fiscal year');
      }
    }

    // Verify perspective exists if provided
    if (perspectiveId && perspectiveId !== existingKpi.perspectiveId) {
      const perspective = await prisma.fiscalYearPerspective.findFirst({
        where: {
          id: perspectiveId,
          fiscalYearId: existingKpi.fiscalYearId,
          isActive: true
        }
      });

      if (!perspective) {
        throw new ValidationError('Invalid perspective');
      }
    }

    // Verify evaluator exists if provided
    if (evaluatorId && evaluatorId !== existingKpi.evaluatorId) {
      const evaluator = await prisma.user.findFirst({
        where: {
          id: evaluatorId,
          tenantId: authResult.user!.tenantId
        }
      });

      if (!evaluator) {
        throw new ValidationError('Invalid evaluator');
      }
    }

    // Update KPI with target in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update the KPI
      const updateData: any = {};
      
      if (perspectiveId !== undefined) updateData.perspectiveId = perspectiveId;
      if (parentObjectiveId !== undefined) updateData.parentObjectiveId = parentObjectiveId;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (code !== undefined) updateData.code = code;
      if (evaluatorId !== undefined) updateData.evaluatorId = evaluatorId;
      if (isRecurring !== undefined) {
        updateData.isRecurring = isRecurring;
        updateData.frequency = isRecurring ? frequency : null;
        updateData.dueDate = !isRecurring ? dueDate : null;
      }

      const updatedKpi = await tx.kPI.update({
        where: { id: kpiId },
        data: updateData
      });

      // Update the target if provided
      if (target) {
        await tx.kPITarget.upsert({
          where: { kpiId },
          update: {
            currentValue: target.currentValue || existingKpi.target?.currentValue || '0',
            targetValue: target.targetValue || existingKpi.target?.targetValue,
            targetType: target.targetType || existingKpi.target?.targetType || 'NUMERIC',
            targetLabel: target.targetLabel !== undefined ? target.targetLabel : existingKpi.target?.targetLabel,
            targetDirection: target.targetDirection || existingKpi.target?.targetDirection || 'INCREASING'
          },
          create: {
            kpiId,
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
          kpiId,
          userId: authResult.user!.id,
          action: 'UPDATE',
          oldValues: {
            perspectiveId: existingKpi.perspectiveId,
            name: existingKpi.name,
            description: existingKpi.description,
            code: existingKpi.code,
            evaluatorId: existingKpi.evaluatorId,
            isRecurring: existingKpi.isRecurring,
            frequency: existingKpi.frequency,
            dueDate: existingKpi.dueDate,
            target: existingKpi.target
          },
          newValues: {
            perspectiveId,
            name,
            description,
            code,
            evaluatorId,
            isRecurring,
            frequency,
            dueDate,
            target
          }
        }
      });

      return updatedKpi;
    });

    // Fetch the complete updated KPI
    const updatedKpi = await (prisma as any).kPI.findUnique({
      where: { id: kpiId },
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

    return NextResponse.json({
      success: true,
      data: updatedKpi
    });

  } catch (error) {
    console.error('Update KPI error:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError('Failed to update KPI');
  }
});

// DELETE /api/kpis/[id] - Delete KPI (soft delete)
export const DELETE = createApiRoute(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const authResult = await authMiddleware(request);
  if (!authResult.success) {
    throw new AuthenticationError(authResult.error || 'Authentication required');
  }

  const kpiId = params.id;

  try {
    // Verify KPI exists and user has delete access (only creator can delete)
    const kpi = await (prisma as any).kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: authResult.user!.tenantId,
        createdById: authResult.user!.id
      }
    });

    if (!kpi) {
      throw new NotFoundError('KPI not found or access denied');
    }

    // Soft delete the KPI
    await prisma.$transaction(async (tx: any) => {
      await tx.kPI.update({
        where: { id: kpiId },
        data: { isActive: false }
      });

      // Create audit log
      await tx.kPIAuditLog.create({
        data: {
          kpiId,
          userId: authResult.user!.id,
          action: 'DELETE',
          oldValues: {
            isActive: true
          },
          newValues: {
            isActive: false
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'KPI deleted successfully'
    });

  } catch (error) {
    console.error('Delete KPI error:', error);
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError('Failed to delete KPI');
  }
});
