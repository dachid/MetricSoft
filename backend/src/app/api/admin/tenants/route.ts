import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/lib/middleware/auth';
import { sendEmail, getWelcomeEmailTemplate } from '@/lib/email';

const prisma = new PrismaClient();

// GET /api/admin/tenants - List all tenants (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verify user is Super Admin
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    const isSuperAdmin = authResult.user.roles.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    // Get all tenants with user count (exclude system tenant)
    const tenants = await prisma.tenant.findMany({
      where: {
        subdomain: {
          not: 'system' // Hide system tenant from frontend
        }
      },
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tenants - Create new tenant (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Verify user is Super Admin
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    const isSuperAdmin = authResult.user.roles.some((role: any) => role.code === 'SUPER_ADMIN');
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, subdomain, adminEmail, adminName, allowedDomains } = body;

    // Validate required fields
    if (!name || !subdomain || !adminEmail || !adminName) {
      return NextResponse.json(
        { error: 'Name, subdomain, admin email, and admin name are required' },
        { status: 400 }
      );
    }

    // Validate allowedDomains if provided
    let validatedDomains: string[] = [];
    if (allowedDomains && Array.isArray(allowedDomains) && allowedDomains.length > 0) {
      const domainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]*\.[a-z]{2,}$/;
      for (const domain of allowedDomains) {
        if (typeof domain !== 'string' || !domainRegex.test(domain.toLowerCase())) {
          return NextResponse.json(
            { error: `Invalid domain format: ${domain}` },
            { status: 400 }
          );
        }
      }
      validatedDomains = allowedDomains.map((d: string) => d.toLowerCase());

      // Validate admin email against allowed domains if domains are specified
      const adminEmailDomain = adminEmail.split('@')[1]?.toLowerCase();
      if (adminEmailDomain && !validatedDomains.includes(adminEmailDomain)) {
        return NextResponse.json(
          { error: `Admin email domain "${adminEmailDomain}" is not in the allowed domains list: ${validatedDomains.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: 'Subdomain must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if subdomain already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain }
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain already exists' },
        { status: 409 }
      );
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Admin email already exists' },
        { status: 409 }
      );
    }

    // Get ORGANIZATION_ADMIN role
    const orgAdminRole = await prisma.role.findUnique({
      where: { code: 'ORGANIZATION_ADMIN' }
    });

    if (!orgAdminRole) {
      return NextResponse.json(
        { error: 'ORGANIZATION_ADMIN role not found' },
        { status: 500 }
      );
    }

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          subdomain,
          allowedDomains: validatedDomains,
          settings: {},
          isActive: true
        }
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          tenantId: tenant.id
        }
      });

      // Assign ORGANIZATION_ADMIN role
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          tenantId: tenant.id,
          roleId: orgAdminRole.id
        }
      });

      // Create default tenant settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          terminology: {
            perspectives: 'Perspectives',
            objectives: 'Objectives',
            kpis: 'KPIs',
            targets: 'Targets',
            initiatives: 'Initiatives'
          },
          fiscalYearStart: new Date('2025-01-01'),
          periods: [],
          branding: {
            primaryColor: '#3B82F6',
            companyName: name,
            logoUrl: ''
          },
          setupCompleted: false,
          setupStep: 1
        }
      });

      return { tenant, adminUser };
    });

    // Send welcome email to the Organization Admin
    try {
      const { html, text } = getWelcomeEmailTemplate(
        name,
        adminName, 
        subdomain
      );
      
      await sendEmail({
        to: adminEmail,
        subject: `Welcome to MetricSoft - ${name} Organization Administrator`,
        html,
        text
      });
      
      console.log(`Welcome email sent to Organization Admin: ${adminEmail}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the tenant creation if email fails, just log it
    }

    // TODO: Additional notifications or integrations can be added here
    console.log(`Tenant created: ${name} (${subdomain})`);
    console.log(`Organization Admin: ${adminEmail}`);
    console.log(`Login URL: http://localhost:3000/login`);

    return NextResponse.json({ 
      message: 'Tenant created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
