import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/prisma';
import { authMiddleware } from '../../../../../../../lib/middleware/auth';

/**
 * Performance Components API
 * Phase 2 - Performance Components Configuration System
 */

// GET /api/tenants/{id}/fiscal-years/{fyId}/performance-components
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId } = params;

    // Verify tenant access - Super Admins can access any tenant
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all performance components for this fiscal year
    const components = await prisma.performanceComponentTemplate.findMany({
      where: {
        fiscalYearId,
        fiscalYear: { tenantId }
      },
      include: {
        orgLevel: true,
        exitRelationships: {
          include: {
            entryComponent: {
              include: {
                orgLevel: true
              }
            },
            toLevel: true
          }
        },
        entryRelationships: {
          include: {
            exitComponent: {
              include: {
                orgLevel: true
              }
            },
            fromLevel: true
          }
        }
      },
      orderBy: [
        { orgLevel: { hierarchyLevel: 'asc' } },
        { sequenceOrder: 'asc' }
      ]
    });

    // Get cascade relationships
    const cascadeRelationships = await prisma.performanceCascadeRelationship.findMany({
      where: {
        fiscalYearId,
        fiscalYear: { tenantId }
      },
      include: {
        fromLevel: true,
        toLevel: true,
        exitComponent: true,
        entryComponent: true
      },
      orderBy: [
        { fromLevel: { hierarchyLevel: 'asc' } },
        { toLevel: { hierarchyLevel: 'asc' } }
      ]
    });

    // Check if performance components are confirmed/locked
    const confirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'performance_components'
        }
      },
      include: {
        fiscalYear: {
          select: {
            name: true
          }
        }
      }
    });

    // Group components by org level
    const componentsByLevel = components.reduce((acc: Record<string, any>, component) => {
      const levelId = component.orgLevelId;
      if (!acc[levelId]) {
        acc[levelId] = {
          level: component.orgLevel,
          components: []
        };
      }
      acc[levelId].components.push(component);
      return acc;
    }, {});

    return NextResponse.json({
      componentsByLevel,
      cascadeRelationships,
      totalComponents: components.length,
      isConfirmed: !!confirmation,
      confirmation: confirmation ? {
        confirmedAt: confirmation.confirmedAt,
        canModify: confirmation.canModify,
        fiscalYearName: confirmation.fiscalYear.name
      } : null
    });

  } catch (error) {
    console.error('Error fetching performance components:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/{id}/fiscal-years/{fyId}/performance-components
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId } = params;
    const body = await request.json();

    // Verify tenant access - Super Admins can access any tenant
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if performance components are already confirmed
    const confirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'performance_components'
        }
      }
    });

    if (confirmation && !confirmation.canModify) {
      return NextResponse.json(
        { error: 'Performance components are confirmed and cannot be modified' },
        { status: 403 }
      );
    }

    const { componentsByLevel, cascadeRelationships } = body;

    console.log('=== BACKEND SAVE DEBUG ===');
    console.log('Received componentsByLevel:', JSON.stringify(componentsByLevel, null, 2));
    console.log('Received cascadeRelationships:', JSON.stringify(cascadeRelationships, null, 2));

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      console.log('Starting transaction...');
      
      // Delete existing components and cascades for this fiscal year
      await tx.performanceCascadeRelationship.deleteMany({
        where: { fiscalYearId }
      });
      console.log('Deleted existing cascade relationships');
      
      await tx.performanceComponentTemplate.deleteMany({
        where: { fiscalYearId }
      });
      console.log('Deleted existing component templates');

      // Create new components and store them by level and type
      const createdComponents = [];
      const componentsByLevelAndType: Record<string, Record<string, any>> = {};
      
      for (const [levelId, levelData] of Object.entries(componentsByLevel as Record<string, any>)) {
        console.log(`Processing level ${levelId}:`, levelData);
        componentsByLevelAndType[levelId] = {};
        
        for (const [index, component] of (levelData.components || []).entries()) {
          console.log(`Creating component ${index + 1}:`, component);
          try {
            const created = await tx.performanceComponentTemplate.create({
              data: {
                id: component.id || undefined,
                fiscalYearId,
                orgLevelId: levelId,
                componentType: component.componentType,
                componentName: component.componentName,
                isStandard: component.isStandard || false,
                isMandatory: component.isMandatory || false,
                sequenceOrder: component.sequenceOrder,
                metadata: component.metadata || {}
              }
            });
            console.log('Created component:', created);
            createdComponents.push(created);
            
            // Store by level and type for cascade relationship creation
            componentsByLevelAndType[levelId][component.componentType] = created;
          } catch (componentError) {
            console.error(`Error creating component ${index + 1} for level ${levelId}:`, componentError);
            throw componentError;
          }
        }
      }

      // Create cascade relationships using actual component IDs
      const createdCascades = [];
      
      // Get organizational levels sorted by hierarchy to determine cascade flow
      const orgLevels = await tx.fiscalYearLevelDefinition.findMany({
        where: { fiscalYearId },
        orderBy: { hierarchyLevel: 'asc' }
      });
      
      console.log('Creating cascade relationships between levels...');
      
      // Create cascades between consecutive levels
      for (let i = 0; i < orgLevels.length - 1; i++) {
        const fromLevel = orgLevels[i];
        const toLevel = orgLevels[i + 1];
        
        console.log(`Creating cascade from ${fromLevel.name} to ${toLevel.name}`);
        
        // Find exit component in fromLevel and entry component in toLevel
        const exitComponent = componentsByLevelAndType[fromLevel.id]?.['exit'];
        const entryComponent = componentsByLevelAndType[toLevel.id]?.['entry'];
        
        if (exitComponent && entryComponent) {
          console.log(`Creating cascade: Exit(${exitComponent.id}) -> Entry(${entryComponent.id})`);
          
          try {
            const created = await tx.performanceCascadeRelationship.create({
              data: {
                fiscalYearId,
                fromLevelId: fromLevel.id,
                toLevelId: toLevel.id,
                exitComponentId: exitComponent.id,
                entryComponentId: entryComponent.id
              }
            });
            
            console.log('Created cascade relationship:', created);
            createdCascades.push(created);
          } catch (cascadeError) {
            console.error(`Error creating cascade ${fromLevel.name} -> ${toLevel.name}:`, cascadeError);
            // Don't throw here - let components be saved even if cascade fails
          }
        } else {
          console.log(`Skipping cascade ${fromLevel.name} -> ${toLevel.name}: Exit=${!!exitComponent}, Entry=${!!entryComponent}`);
        }
      }

      console.log(`Transaction completed: ${createdComponents.length} components, ${createdCascades.length} cascades created`);
      return { components: createdComponents, cascades: createdCascades };
    });

    return NextResponse.json({
      success: true,
      message: 'Performance components updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating performance components:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants/{id}/fiscal-years/{fyId}/performance-components/confirm
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id: tenantId, fyId: fiscalYearId } = params;

    // Verify tenant access - Super Admins can access any tenant
    const isSuperAdmin = authResult.user.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if org structure is confirmed first
    const orgStructureConfirmation = await prisma.fiscalYearConfirmation.findUnique({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'org_structure'
        }
      }
    });

    if (!orgStructureConfirmation) {
      return NextResponse.json(
        { error: 'Organizational structure must be confirmed before performance components' },
        { status: 400 }
      );
    }

    // Validate that performance components are properly configured
    const components = await prisma.performanceComponentTemplate.findMany({
      where: { fiscalYearId }
    });

    if (components.length === 0) {
      return NextResponse.json(
        { error: 'No performance components configured' },
        { status: 400 }
      );
    }

    // Create or update confirmation
    const confirmation = await prisma.fiscalYearConfirmation.upsert({
      where: {
        fiscalYearId_confirmationType: {
          fiscalYearId,
          confirmationType: 'performance_components'
        }
      },
      update: {
        confirmedBy: authResult.user.id,
        confirmedAt: new Date(),
        canModify: false
      },
      create: {
        fiscalYearId,
        confirmationType: 'performance_components',
        confirmedBy: authResult.user.id,
        confirmedAt: new Date(),
        canModify: false
      }
    });

    // Update fiscal year status to 'locked' when performance components are confirmed
    // This indicates that the fiscal year setup is complete and locked
    const fiscalYear = await prisma.fiscalYear.findUnique({
      where: { id: fiscalYearId }
    });

    if (fiscalYear && (fiscalYear.status === 'active' || fiscalYear.status === 'draft')) {
      await prisma.fiscalYear.update({
        where: { id: fiscalYearId },
        data: { status: 'locked' }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Performance components confirmed successfully',
      confirmation
    });

  } catch (error) {
    console.error('Error confirming performance components:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}