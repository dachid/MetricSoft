import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

// GET /api/tenants/[id]/objectives - Get objectives for a specific org unit and fiscal year
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user belongs to the same tenant
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const orgUnitId = searchParams.get('orgUnitId');
    const fiscalYearId = searchParams.get('fiscalYearId');

    if (!orgUnitId || !fiscalYearId) {
      return NextResponse.json({ error: 'orgUnitId and fiscalYearId are required' }, { status: 400 });
    }

    // Fetch objectives for the specified org unit and fiscal year
    const objectives = await prisma.kPIObjective.findMany({
      where: {
        tenantId: tenantId,
        orgUnitId: orgUnitId,
        fiscalYearId: fiscalYearId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: objectives
    });

  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants/[id]/objectives - Create a new objective for the organization
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const tenantId = params.id;
    
    // Verify user has access to this tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Check if user belongs to the same tenant
    if (authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    console.log('🔍 [Objectives API] Request body:', body);
    
    const { name, description, orgUnitId, fiscalYearId } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Objective name is required' }, { status: 400 });
    }

    if (!orgUnitId) {
      return NextResponse.json({ error: 'Organization unit ID is required' }, { status: 400 });
    }

    if (!fiscalYearId) {
      return NextResponse.json({ error: 'Fiscal year ID is required' }, { status: 400 });
    }

    // Verify the org unit exists and belongs to this tenant
    const orgUnit = await prisma.orgUnit.findFirst({
      where: {
        id: orgUnitId,
        tenantId: tenantId
      }
    });

    if (!orgUnit) {
      return NextResponse.json({ error: 'Organization unit not found' }, { status: 404 });
    }

    // Verify the fiscal year exists and belongs to this tenant
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: {
        id: fiscalYearId,
        tenantId: tenantId
      }
    });

    if (!fiscalYear) {
      return NextResponse.json({ error: 'Fiscal year not found' }, { status: 404 });
    }

    // Create the objective
    const objective = await prisma.kPIObjective.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        orgUnitId: orgUnitId,
        fiscalYearId: fiscalYearId,
        tenantId: tenantId,
        createdById: authResult.user.id
      }
    });
    
    return NextResponse.json({
      success: true,
      data: objective
    });

  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
