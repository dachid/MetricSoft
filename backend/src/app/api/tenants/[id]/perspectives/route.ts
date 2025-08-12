import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';
import { ApiErrorHandler, AuthenticationError, AuthorizationError, ValidationError } from '@/lib/errors';

const prisma = new PrismaClient();

// GET /api/tenants/[id]/perspectives - Get tenant perspectives
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
    // Super Admins can access any tenant, Organization Admins only their own tenant
    if (!authResult.user) {
      throw new AuthenticationError('User not found');
    }
    
    const isSuperAdmin = authResult.user.roles.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const perspectives = await prisma.perspective.findMany({
      where: { 
        tenantId,
        isActive: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return NextResponse.json({ 
      success: true,
      data: perspectives 
    });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}

// POST /api/tenants/[id]/perspectives - Create new perspective
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
    // Super Admins can access any tenant, Organization Admins only their own tenant
    if (!authResult.user) {
      throw new AuthenticationError('User not found');
    }
    
    const isSuperAdmin = authResult.user.roles.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      throw new AuthorizationError('Access denied to this tenant');
    }

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name) {
      throw new ValidationError('Name is required', 'name');
    }

    // Generate code from name (uppercase, replace spaces with underscores)
    const code = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

    // Check if code already exists
    const existingPerspective = await prisma.perspective.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code
        }
      }
    });

    if (existingPerspective) {
      throw new ValidationError('A perspective with this name already exists', 'name');
    }

    // Get next sort order
    const lastPerspective = await prisma.perspective.findFirst({
      where: { tenantId },
      orderBy: { sortOrder: 'desc' }
    });

    const sortOrder = (lastPerspective?.sortOrder || 0) + 1;

    const perspective = await prisma.perspective.create({
      data: {
        tenantId,
        code,
        name,
        description,
        color: color || '#3B82F6',
        icon,
        sortOrder
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Perspective created successfully',
      data: perspective 
    }, { status: 201 });
  } catch (error) {
    return ApiErrorHandler.handle(error);
  }
}
