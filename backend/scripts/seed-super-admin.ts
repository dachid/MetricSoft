const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  try {
    console.log('🔍 Checking for existing super-admin user...');
    
    // Check if the super-admin user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'daveed_8@yahoo.com' },
      include: {
        roles: {
          include: {
            role: true
          }
        },
        tenant: true
      }
    });

    if (existingUser) {
      console.log('✅ Super-admin user already exists:');
      console.log('   Email:', existingUser.email);
      console.log('   Name:', existingUser.name);
      console.log('   Tenant:', existingUser.tenant?.name || 'No tenant');
      console.log('   Roles:', existingUser.roles.map((r: any) => r.role.name).join(', ') || 'No roles');
      return;
    }

    console.log('👤 Super-admin user not found. Creating...');

    // Check if Super Admin role exists
    let superAdminRole = await prisma.role.findUnique({
      where: { code: 'SUPER_ADMIN' }
    });

    if (!superAdminRole) {
      console.log('🔧 Creating Super Admin role...');
      superAdminRole = await prisma.role.create({
        data: {
          name: 'Super Admin',
          code: 'SUPER_ADMIN',
          description: 'Full system access with all permissions',
          permissions: [
            'FULL_ACCESS',
            'MANAGE_TENANTS',
            'MANAGE_USERS',
            'MANAGE_ROLES',
            'SYSTEM_SETTINGS',
            'DELETE_DATA'
          ],
          isSystem: true
        }
      });
      console.log('✅ Super Admin role created');
    }

    // Check if there's a default tenant or create one
    let defaultTenant = await prisma.tenant.findFirst({
      where: { subdomain: 'metricsoft-admin' }
    });

    if (!defaultTenant) {
      console.log('🏢 Creating default tenant for super-admin...');
      defaultTenant = await prisma.tenant.create({
        data: {
          name: 'MetricSoft Admin',
          subdomain: 'metricsoft-admin',
          settings: {},
          isActive: true
        }
      });

      // Create tenant settings
      await prisma.tenantSettings.create({
        data: {
          tenantId: defaultTenant.id,
          terminology: {
            perspectives: 'Perspectives',
            objectives: 'Objectives',
            kpis: 'KPIs',
            targets: 'Targets',
            initiatives: 'Initiatives'
          },
          fiscalYearStart: new Date('2025-01-01'),
          periods: [],
          branding: {},
          setupCompleted: true,
          setupStep: 999
        }
      });

      console.log('✅ Default tenant created');
    }

    // Create the super-admin user
    const superAdminUser = await prisma.user.create({
      data: {
        email: 'daveed_8@yahoo.com',
        name: 'Super Administrator',
        tenantId: defaultTenant.id
      }
    });

    // Assign Super Admin role
    await prisma.userRole.create({
      data: {
        userId: superAdminUser.id,
        tenantId: defaultTenant.id,
        roleId: superAdminRole.id
      }
    });

    console.log('✅ Super-admin user created successfully:');
    console.log('   Email: daveed_8@yahoo.com');
    console.log('   Name: Super Administrator');
    console.log('   Tenant:', defaultTenant.name);
    console.log('   Role: Super Admin');
    console.log('');
    console.log('🔑 You can now login with email: daveed_8@yahoo.com');
    console.log('   The system will send a passwordless login code to this email.');

  } catch (error) {
    console.error('❌ Error seeding super-admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSuperAdmin();
