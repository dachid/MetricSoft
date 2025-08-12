import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';

const prisma = new PrismaClient();

// GET /api/tenants/[id]/settings - Get tenant settings
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
    // Super Admins can access any tenant, Organization Admins only their own tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    const isSuperAdmin = authResult.user.roles.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get tenant settings, create with defaults if doesn't exist
    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            name: true,
            subdomain: true
          }
        }
      }
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.tenantSettings.create({
        data: {
          tenantId,
          terminology: {
            perspectives: "Perspectives",
            objectives: "Objectives", 
            kpis: "KPIs",
            targets: "Targets",
            initiatives: "Initiatives"
          },
          fiscalYearStart: new Date('2025-01-01'),
          periods: [],
          branding: {
            primaryColor: "#3B82F6",
            logoUrl: null,
            companyName: ""
          }
        },
        include: {
          tenant: {
            select: {
              name: true,
              subdomain: true
            }
          }
        }
      });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/[id]/settings - Update tenant settings
export async function PUT(
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
    // Super Admins can access any tenant, Organization Admins only their own tenant
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    const isSuperAdmin = authResult.user.roles.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin && authResult.user.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { terminology, fiscalYearStart, periods, branding, setupCompleted, setupStep } = body;

    // Validate fiscal year start if provided
    if (fiscalYearStart && !Date.parse(fiscalYearStart)) {
      return NextResponse.json(
        { error: 'Invalid fiscal year start date' },
        { status: 400 }
      );
    }

    // Validate terminology structure
    if (terminology) {
      const requiredTerms = ['perspectives', 'objectives', 'kpis', 'targets', 'initiatives'];
      const missingTerms = requiredTerms.filter(term => !terminology[term]);
      
      if (missingTerms.length > 0) {
        return NextResponse.json(
          { error: `Missing terminology for: ${missingTerms.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update settings
    const updatedSettings = await prisma.tenantSettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        terminology: terminology || {
          perspectives: "Perspectives",
          objectives: "Objectives",
          kpis: "KPIs", 
          targets: "Targets",
          initiatives: "Initiatives"
        },
        fiscalYearStart: fiscalYearStart ? new Date(fiscalYearStart) : new Date('2025-01-01'),
        periods: periods || [],
        branding: branding || {
          primaryColor: "#3B82F6",
          logoUrl: null,
          companyName: ""
        },
        setupCompleted: setupCompleted || false,
        setupStep: setupStep || 1
      },
      update: {
        ...(terminology && { terminology }),
        ...(fiscalYearStart && { fiscalYearStart: new Date(fiscalYearStart) }),
        ...(periods && { periods }),
        ...(branding && { branding }),
        ...(typeof setupCompleted === 'boolean' && { setupCompleted }),
        ...(setupStep && { setupStep }),
        updatedAt: new Date()
      },
      include: {
        tenant: {
          select: {
            name: true,
            subdomain: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      data: updatedSettings 
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
