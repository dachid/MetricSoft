import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError } from '@/lib/errors';

// GET /api/tenants/[id]/org-structure/setup-status - Check organizational structure setup status
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

    // Check if level definitions exist
    const levelDefinitions = await (prisma as any).levelDefinition.findMany({
      where: { tenantId },
      orderBy: { hierarchyLevel: 'asc' }
    });

    // Check if org units exist
    const orgUnits = await (prisma as any).orgUnit.findMany({
      where: { 
        tenantId,
        isActive: true
      }
    });

    // Get tenant settings
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    // Parse org structure config
    const orgStructureConfig = (tenantSettings?.orgStructureConfig as any) || null;

    // Determine setup status
    const hasLevelDefinitions = levelDefinitions.length > 0;
    const hasOrgUnits = orgUnits.length > 0;
    const hasOrgStructureConfig = orgStructureConfig !== null;

    // Check if basic levels are configured
    const standardLevels = ['ORGANIZATION', 'DEPARTMENT', 'INDIVIDUAL'];
    const configuredLevels = levelDefinitions
      .filter((level: any) => level.isEnabled)
      .map((level: any) => level.code);
    
    const customLevels = levelDefinitions
      .filter((level: any) => !level.isStandard)
      .map((level: any) => level.code);

    // Determine next steps
    const nextSteps = [];
    
    if (!hasLevelDefinitions) {
      nextSteps.push({
        step: 'configure-levels',
        title: 'Configure Organizational Levels',
        description: 'Define the organizational levels for your company (e.g., Department, Team, Individual)',
        required: true
      });
    }

    if (hasLevelDefinitions && !hasOrgUnits) {
      nextSteps.push({
        step: 'create-units',
        title: 'Create Organizational Units',
        description: 'Create your departments, teams, or other organizational units',
        required: true
      });
    }

    if (hasOrgUnits && orgUnits.length > 0) {
      const unitsWithNoUsers = orgUnits.filter((unit: any) => !unit.userAssignments?.length);
      if (unitsWithNoUsers.length > 0) {
        nextSteps.push({
          step: 'assign-users',
          title: 'Assign Users',
          description: 'Assign team members to organizational units',
          required: false
        });
      }
    }

    // Consider the setup initialized if we have basic structure
    const isInitialized = hasLevelDefinitions && hasOrgStructureConfig;

    const setupStatus = {
      isInitialized,
      hasLevelDefinitions,
      hasOrgUnits,
      hasOrgStructureConfig,
      levelDefinitionsCount: levelDefinitions.length,
      orgUnitsCount: orgUnits.length,
      configuredLevels,
      customLevels,
      initializedAt: tenantSettings?.createdAt || null,
      nextSteps
    };

    return NextResponse.json({
      success: true,
      data: setupStatus
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
