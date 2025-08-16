import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/middleware/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; fyId: string } }
) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const tenantId = params.id;
    const fiscalYearId = params.fyId;

    // Validate access to tenant
    if (user.tenantId !== tenantId && !user.roles.some((role: any) => role.code === 'SUPER_ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Access denied to this tenant' },
        { status: 403 }
      );
    }

    // Check if user has admin permissions
    const isAdmin = user.roles.some((role: any) => 
      ['SUPER_ADMIN', 'ORGANIZATION_ADMIN'].includes(role.code)
    );
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin permissions required' },
        { status: 403 }
      );
    }

    // Get the fiscal year with current confirmations
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        tenantId: tenantId
      },
      include: {
        confirmations: true,
        _count: {
          select: {
            levelDefinitions: true
          }
        }
      }
    });

    if (!fiscalYear) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Fiscal year not found' },
        { status: 404 }
      );
    }

    // Check if already confirmed
    const existingConfirmation = fiscalYear.confirmations.find(
      (c: any) => c.confirmationType === 'org_structure'
    );

    if (existingConfirmation) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Organizational structure is already confirmed' },
        { status: 409 }
      );
    }

    // Validate that structure is ready for confirmation
    
    // Check if there are level definitions
    if (fiscalYear._count.levelDefinitions === 0) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: 'Cannot confirm structure: No organizational levels have been defined' 
        },
        { status: 400 }
      );
    }

    // Check if there are organizational units
    const orgUnitsCount = await prisma.orgUnit.count({
      where: {
        fiscalYearId: fiscalYearId,
        tenantId: tenantId
      }
    });

    if (orgUnitsCount === 0) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: 'Cannot confirm structure: No organizational units have been created' 
        },
        { status: 400 }
      );
    }

    // Validate organizational structure integrity
    const orgUnits = await prisma.orgUnit.findMany({
      where: {
        fiscalYearId: fiscalYearId,
        tenantId: tenantId
      },
      select: {
        id: true,
        parentId: true,
        name: true
      }
    });

    // Check for orphaned units (units with invalid parent references)
    const unitIds = new Set(orgUnits.map(unit => unit.id));
    const orphanedUnits = orgUnits.filter(unit => 
      unit.parentId && !unitIds.has(unit.parentId)
    );

    if (orphanedUnits.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: `Cannot confirm structure: Found organizational units with invalid parent references: ${orphanedUnits.map(u => u.name).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Check for circular references
    const hasCircularReference = (unitId: string, visited: Set<string> = new Set()): boolean => {
      if (visited.has(unitId)) return true;
      visited.add(unitId);
      
      const unit = orgUnits.find(u => u.id === unitId);
      if (unit?.parentId) {
        return hasCircularReference(unit.parentId, visited);
      }
      return false;
    };

    const circularRefs = orgUnits.filter(unit => hasCircularReference(unit.id));
    if (circularRefs.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: `Cannot confirm structure: Circular references detected in units: ${circularRefs.map(u => u.name).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Ensure there are root-level units
    const rootUnits = orgUnits.filter(unit => !unit.parentId);
    if (rootUnits.length === 0) {
      return NextResponse.json(
        { 
          error: 'Validation Error', 
          message: 'Cannot confirm structure: No root-level organizational units found' 
        },
        { status: 400 }
      );
    }

    // Create the confirmation
    await prisma.fiscalYearConfirmation.create({
      data: {
        fiscalYearId: fiscalYearId,
        confirmationType: 'org_structure',
        confirmedBy: user.id,
        confirmedAt: new Date()
      }
    });

    // Fetch the updated fiscal year with confirmations
    const updatedFiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        tenantId: tenantId
      },
      include: {
        confirmations: true,
        _count: {
          select: {
            levelDefinitions: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Organizational structure confirmed successfully',
      data: updatedFiscalYear
    });

  } catch (error) {
    console.error('Error confirming organizational structure:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to confirm organizational structure' 
      },
      { status: 500 }
    );
  }
}
