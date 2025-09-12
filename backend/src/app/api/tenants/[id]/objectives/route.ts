import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

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
    const { title, description } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Objective title is required' }, { status: 400 });
    }

    // For now, we'll validate the objective data and return success
    // The actual objective will be created as part of the KPI creation process
    // This endpoint serves to validate the objective title and make it available
    // for immediate use in the auto-complete dropdown
    
    return NextResponse.json({
      success: true,
      data: {
        objective: {
          title: title.trim(),
          description: description?.trim() || ''
        }
      }
    });

  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
