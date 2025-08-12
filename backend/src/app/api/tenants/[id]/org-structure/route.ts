import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

// GET /api/tenants/[id]/org-structure - Get organizational structure configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    // Get level definitions for this tenant
    const levelDefinitions = await (prisma as any).levelDefinition.findMany({
      where: { tenantId },
      orderBy: { hierarchyLevel: 'asc' }
    });

    // Get tenant settings for org structure config
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    // Parse the orgStructureConfig from JSON (it's stored in the existing schema)
    const orgStructureConfig = (tenantSettings?.orgStructureConfig as any) || {
      enabledLevels: ['ORGANIZATION', 'DEPARTMENT', 'INDIVIDUAL'],
      customLevels: []
    };

    // Get existing org units to show structure
    const orgUnits = await (prisma as any).orgUnit.findMany({
      where: { 
        tenantId,
        isActive: true
      },
      include: {
        levelDefinition: true,
        parent: {
          select: { id: true, name: true, code: true }
        },
        children: {
          where: { isActive: true },
          include: {
            levelDefinition: {
              select: { id: true, name: true, code: true, hierarchyLevel: true }
            }
          }
        },
        userAssignments: {
          where: {
            effectiveTo: null // Only current assignments
          },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: [
        { levelDefinition: { hierarchyLevel: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ 
      success: true,
      data: {
        tenantId,
        levelDefinitions,
        orgStructureConfig,
        orgUnits,
        summary: {
          totalLevels: levelDefinitions.length,
          enabledLevels: levelDefinitions.filter((l: any) => l.isEnabled).length,
          totalOrgUnits: orgUnits.length,
          activeUsers: orgUnits.reduce((sum: number, unit: any) => sum + unit.userAssignments.length, 0)
        }
      }
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// PUT /api/tenants/[id]/org-structure - Update organizational structure configuration  
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const body = await request.json();
    const { levelUpdates, orgStructureConfig } = body;

    // Validation: Organization level must always be enabled
    if (levelUpdates) {
      const orgLevel = levelUpdates.find((level: any) => level.code === 'ORGANIZATION');
      if (orgLevel && !orgLevel.isEnabled) {
        throw new ValidationError('Organization level is required and cannot be disabled');
      }
    }

    // Start transaction to update multiple records
    await prisma.$transaction(async (tx) => {
      // Update level definitions if provided
      if (levelUpdates && Array.isArray(levelUpdates)) {
        for (const levelUpdate of levelUpdates) {
          await (tx as any).levelDefinition.updateMany({
            where: {
              tenantId,
              code: levelUpdate.code
            },
            data: {
              name: levelUpdate.name,
              pluralName: levelUpdate.pluralName,
              isEnabled: levelUpdate.isEnabled,
              icon: levelUpdate.icon,
              color: levelUpdate.color,
              updatedAt: new Date()
            }
          });
        }
      }

      // Update tenant settings with org structure config (stored as JSON)
      if (orgStructureConfig) {
        await tx.tenantSettings.upsert({
          where: { tenantId },
          create: {
            tenantId,
            orgStructureConfig: orgStructureConfig
          } as any,
          update: {
            orgStructureConfig: orgStructureConfig,
            updatedAt: new Date()
          } as any
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Organizational structure configuration updated successfully'
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// POST /api/tenants/[id]/org-structure/levels - Create custom organizational level
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      throw new AuthenticationError(authResult.error || 'Authentication required');
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (authResult.user?.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const body = await request.json();
    const { name, pluralName, hierarchyLevel, icon, color } = body;

    // Validation
    if (!name || !pluralName || hierarchyLevel === undefined) {
      throw new ValidationError('Name, plural name, and hierarchy level are required');
    }

    // Auto-generate code from name (reducing typing)
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);

    // Check if hierarchy level already exists
    const existingLevel = await (prisma as any).levelDefinition.findFirst({
      where: {
        tenantId,
        OR: [
          { code },
          { hierarchyLevel }
        ]
      }
    });

    if (existingLevel) {
      if (existingLevel.code === code) {
        throw new ValidationError(`A level with code "${code}" already exists`);
      }
      if (existingLevel.hierarchyLevel === hierarchyLevel) {
        throw new ValidationError(`A level at hierarchy level ${hierarchyLevel} already exists`);
      }
    }

    // Create new level definition
    const newLevel = await (prisma as any).levelDefinition.create({
      data: {
        tenantId,
        code,
        name,
        pluralName,
        hierarchyLevel,
        isStandard: false, // Custom level
        isEnabled: true,
        icon: icon || 'Building',
        color: color || '#6B7280',
        metadata: {}
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Custom organizational level created successfully',
      data: newLevel
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
