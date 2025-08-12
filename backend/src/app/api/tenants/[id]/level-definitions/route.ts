import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

interface AuthUser {
  id: string;
  tenantId: string;
  roles: { code: string }[];
}

async function authenticate(request: NextRequest): Promise<AuthUser | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) return null;

    return {
      id: user.id,
      tenantId: user.tenantId || '',
      roles: user.roles.map(ur => ({ code: ur.role.code }))
    };
  } catch (error) {
    return null;
  }
}

// GET /api/tenants/[id]/level-definitions - Get level definitions for a tenant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticate(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = params.id;

    // Check authorization - Super Admin can access any tenant, Organization Admin only their own
    const isSuperAdmin = authResult.roles.some(role => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const levelDefinitions = await (prisma as any).levelDefinition.findMany({
      where: { tenantId },
      orderBy: { hierarchyLevel: 'asc' }
    });

    // If no level definitions exist, return empty array
    // The frontend will initialize defaults
    return NextResponse.json({
      success: true,
      data: levelDefinitions || []
    });
  } catch (error) {
    console.error('Error fetching level definitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/[id]/level-definitions - Update level definitions for a tenant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticate(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = params.id;

    // Check authorization - Super Admin can access any tenant, Organization Admin only their own
    const isSuperAdmin = authResult.roles.some(role => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { levels } = body;

    if (!Array.isArray(levels)) {
      return NextResponse.json({ error: 'Invalid levels data' }, { status: 400 });
    }

    // Validate that Organization level exists and is enabled
    const organizationLevel = levels.find(l => l.code === 'ORGANIZATION');
    if (!organizationLevel || !organizationLevel.isEnabled) {
      return NextResponse.json({ 
        error: 'Organization level is required and must be enabled' 
      }, { status: 400 });
    }

    // Use a transaction to update all levels atomically
    await prisma.$transaction(async (tx: any) => {
      // Delete existing level definitions for this tenant
      await tx.levelDefinition.deleteMany({
        where: { tenantId }
      });

      // Create new level definitions
      for (const level of levels) {
        await tx.levelDefinition.create({
          data: {
            tenantId,
            code: level.code,
            name: level.name,
            pluralName: level.pluralName,
            hierarchyLevel: level.hierarchyLevel,
            isStandard: level.isStandard,
            isEnabled: level.isEnabled,
            icon: level.icon || null,
            color: level.color,
            metadata: level.metadata || {}
          }
        });
      }
    });

    // Fetch updated level definitions
    const updatedLevels = await (prisma as any).levelDefinition.findMany({
      where: { tenantId },
      orderBy: { hierarchyLevel: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: updatedLevels,
      message: 'Level definitions updated successfully'
    });
  } catch (error) {
    console.error('Error updating level definitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
