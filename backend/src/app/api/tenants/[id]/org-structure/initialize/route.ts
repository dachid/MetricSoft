import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

// POST /api/tenants/[id]/org-structure/initialize - Initialize default organizational structure
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
    const { 
      enabledLevels = ['ORGANIZATION', 'DEPARTMENT', 'INDIVIDUAL'],
      organizationName,
      customLevels = []
    }: {
      enabledLevels?: string[];
      organizationName?: string;
      customLevels?: Array<{ name: string; pluralName?: string; icon?: string; color?: string }>;
    } = body;

    // Validation
    if (!organizationName) {
      throw new ValidationError('Organization name is required for initialization');
    }

    // Check if already initialized
    const existingLevels = await (prisma as any).levelDefinition.findMany({
      where: { tenantId }
    });

    if (existingLevels.length > 0) {
      throw new ValidationError('Organizational structure already initialized for this tenant');
    }

    // Start transaction to create complete structure
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create standard level definitions
      const standardLevels = [
        {
          code: 'ORGANIZATION',
          name: 'Organization',
          pluralName: 'Organizations',
          hierarchyLevel: 0,
          isStandard: true,
          isEnabled: enabledLevels.includes('ORGANIZATION'),
          icon: 'Building2',
          color: '#1E40AF'
        },
        {
          code: 'DEPARTMENT',
          name: 'Department',
          pluralName: 'Departments',
          hierarchyLevel: 1,
          isStandard: true,
          isEnabled: enabledLevels.includes('DEPARTMENT'),
          icon: 'Building',
          color: '#7C3AED'
        },
        {
          code: 'TEAM',
          name: 'Team',
          pluralName: 'Teams',
          hierarchyLevel: 2,
          isStandard: true,
          isEnabled: enabledLevels.includes('TEAM'),
          icon: 'Users',
          color: '#059669'
        },
        {
          code: 'INDIVIDUAL',
          name: 'Individual',
          pluralName: 'Individuals',
          hierarchyLevel: 3,
          isStandard: true,
          isEnabled: enabledLevels.includes('INDIVIDUAL'),
          icon: 'User',
          color: '#DC2626'
        }
      ];

      // Create standard levels (only enabled ones)
      const createdLevels = [];
      const enabledStandardLevels = standardLevels.filter(level => level.isEnabled === true);
      for (const level of enabledStandardLevels) {
        const created = await (tx as any).levelDefinition.create({
          data: {
            tenantId,
            ...level,
            isEnabled: true // Ensure it's always true since we filtered
          }
        });
        createdLevels.push(created);
      }

      // 2. Create custom levels if provided
      let customLevelHierarchy = 4; // Start after standard levels
      for (const customLevel of customLevels) {
        const code = customLevel.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50);
        const created = await (tx as any).levelDefinition.create({
          data: {
            tenantId,
            code,
            name: customLevel.name,
            pluralName: customLevel.pluralName || `${customLevel.name}s`,
            hierarchyLevel: customLevelHierarchy++,
            isStandard: false,
            isEnabled: true,
            icon: customLevel.icon || 'Building',
            color: customLevel.color || '#6B7280'
          }
        });
        createdLevels.push(created);
      }

      // 3. Create root organization unit
      const organizationLevel = createdLevels.find(l => l.code === 'ORGANIZATION');
      let rootOrgUnit = null;

      if (organizationLevel && organizationLevel.isEnabled) {
        const orgCode = organizationName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20);
        
        rootOrgUnit = await (tx as any).orgUnit.create({
          data: {
            tenantId,
            levelDefinitionId: organizationLevel.id,
            code: orgCode,
            name: organizationName,
            description: `Root organization unit for ${organizationName}`,
            parentId: null,
            sortOrder: 1,
            isActive: true,
            effectiveFrom: new Date(),
            metadata: {
              isRoot: true,
              createdBy: 'initialization'
            }
          }
        });
      }

      // 4. Update tenant settings with org structure config
      await tx.tenantSettings.upsert({
        where: { tenantId },
        create: {
          tenantId,
          orgStructureConfig: {
            enabledLevels,
            customLevels: customLevels.map(cl => cl.name),
            initialized: true,
            initializedAt: new Date().toISOString()
          } as any
        },
        update: {
          orgStructureConfig: {
            enabledLevels,
            customLevels: customLevels.map(cl => cl.name),
            initialized: true,
            initializedAt: new Date().toISOString()
          } as any,
          updatedAt: new Date()
        }
      });

      return {
        levelDefinitions: createdLevels,
        rootOrgUnit,
        orgStructureConfig: {
          enabledLevels,
          customLevels: customLevels.map(cl => cl.name),
          initialized: true
        }
      };
    });

    return NextResponse.json({
      success: true,
      message: `Organizational structure initialized successfully with ${result.levelDefinitions.length} levels`,
      data: result
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// GET /api/tenants/[id]/org-structure/setup-status - Check initialization status
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

    // Check current setup status
    const [levelCount, orgUnitCount, tenantSettings] = await Promise.all([
      (prisma as any).levelDefinition.count({
        where: { tenantId }
      }),
      (prisma as any).orgUnit.count({
        where: { tenantId, isActive: true }
      }),
      prisma.tenantSettings.findUnique({
        where: { tenantId }
      })
    ]);

    const orgStructureConfig = (tenantSettings?.orgStructureConfig as any) || {};
    
    interface NextStep {
      step: string;
      title: string;
      description: string;
      required: boolean;
    }
    
    const setupStatus = {
      isInitialized: levelCount > 0,
      hasLevelDefinitions: levelCount > 0,
      hasOrgUnits: orgUnitCount > 0,
      levelDefinitionsCount: levelCount,
      orgUnitsCount: orgUnitCount,
      configuredLevels: orgStructureConfig.enabledLevels || [],
      customLevels: orgStructureConfig.customLevels || [],
      initializedAt: orgStructureConfig.initializedAt || null,
      nextSteps: [] as NextStep[]
    };

    // Determine next steps based on current status
    if (!setupStatus.isInitialized) {
      setupStatus.nextSteps.push({
        step: 'initialize',
        title: 'Initialize Organizational Structure',
        description: 'Set up your organizational levels and create the root organization',
        required: true
      });
    } else {
      if (setupStatus.orgUnitsCount === 0) {
        setupStatus.nextSteps.push({
          step: 'create_org_units',
          title: 'Create Organizational Units',
          description: 'Create departments, teams, or other organizational units',
          required: false
        });
      }
      
      setupStatus.nextSteps.push({
        step: 'assign_users',
        title: 'Assign Users to Units',
        description: 'Assign team members to their respective organizational units',
        required: false
      });
    }

    return NextResponse.json({
      success: true,
      data: setupStatus
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
