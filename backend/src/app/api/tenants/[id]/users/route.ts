import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

// GET /api/tenants/[id]/users - Get all users in a tenant
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

    // Check if user is Organization Admin or Super Admin
    console.log('🔐 [DEBUG] User roles:', authResult.user.roles);
    console.log('🔐 [DEBUG] Requested tenant ID:', tenantId);
    console.log('🔐 [DEBUG] User tenant ID:', authResult.user.tenantId);
    
    const isAuthorized = authResult.user.roles.some((role: any) => {
      console.log('🔐 [DEBUG] Checking role:', role);
      const hasCorrectRole = ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(role.code);
      // Fix: Check user's tenantId, not role's tenantId
      const hasCorrectTenant = (role.code === 'SUPER_ADMIN' || authResult.user?.tenantId === tenantId);
      console.log('🔐 [DEBUG] Has correct role:', hasCorrectRole, 'Has correct tenant:', hasCorrectTenant);
      return hasCorrectRole && hasCorrectTenant;
    });
    
    console.log('🔐 [DEBUG] Is authorized:', isAuthorized);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all users in the tenant
    const users = await prisma.user.findMany({
      where: {
        tenantId: tenantId
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          lineManager: user.lineManager,
          roles: user.roles.map(userRole => ({
            role: userRole.role
          }))
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching tenant users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenants/[id]/users - Create a new user in a tenant
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

    // Check if user is Organization Admin or Super Admin
    const isAuthorized = authResult.user.roles.some((role: any) => {
      const hasCorrectRole = ['ORGANIZATION_ADMIN', 'SUPER_ADMIN'].includes(role.code);
      const hasCorrectTenant = (role.code === 'SUPER_ADMIN' || authResult.user?.tenantId === tenantId);
      return hasCorrectRole && hasCorrectTenant;
    });

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, email, lineManager } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Validate line manager if provided
    if (lineManager?.trim()) {
      const lineManagerUser = await prisma.user.findFirst({
        where: {
          email: lineManager.trim().toLowerCase(),
          tenantId: tenantId
        }
      });

      if (!lineManagerUser) {
        return NextResponse.json({ error: 'Line manager email not found in this organization' }, { status: 400 });
      }

      // Prevent setting line manager to the same email as the new user
      if (lineManagerUser.email === email.trim().toLowerCase()) {
        return NextResponse.json({ error: 'User cannot be their own line manager' }, { status: 400 });
      }
    }

    // Validate line manager if provided
    if (lineManager?.trim()) {
      const lineManagerUser = await prisma.user.findFirst({
        where: {
          email: lineManager.trim().toLowerCase(),
          tenantId: tenantId
        }
      });

      if (!lineManagerUser) {
        return NextResponse.json({ error: 'Line manager email not found in this organization' }, { status: 400 });
      }
    }

    // Get Employee role
    const employeeRole = await prisma.role.findUnique({
      where: { code: 'EMPLOYEE' }
    });

    if (!employeeRole) {
      return NextResponse.json({ error: 'Employee role not found' }, { status: 500 });
    }

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        tenantId,
        lineManager: lineManager?.trim() || null,
        roles: {
          create: {
            tenantId,
            roleId: employeeRole.id
          }
        }
      },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          lineManager: newUser.lineManager,
          roles: newUser.roles.map(userRole => ({
            role: userRole.role
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
