import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create system roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      update: {},
      create: {
        name: 'Super Administrator',
        code: 'SUPER_ADMIN',
        description: 'Full system access including tenant creation and management',
        permissions: ['*'],
        isSystem: true
      }
    }),
    prisma.role.upsert({
      where: { code: 'ORGANIZATION_ADMIN' },
      update: {},
      create: {
        name: 'Organization Administrator',
        code: 'ORGANIZATION_ADMIN',
        description: 'Full tenant access including user management and organization setup (cannot create new tenants)',
        permissions: ['manage:tenant_settings', 'manage:users', 'manage:organization', 'read:all_kpis', 'write:all_kpis', 'manage:cascades', 'view:reports'],
        isSystem: true
      }
    }),
    prisma.role.upsert({
      where: { code: 'STRATEGY_TEAM' },
      update: {},
      create: {
        name: 'Strategy Team',
        code: 'STRATEGY_TEAM',
        description: 'Strategic oversight and KPI management',
        permissions: ['read:all_kpis', 'write:all_kpis', 'manage:cascades', 'view:reports'],
        isSystem: true
      }
    }),
    prisma.role.upsert({
      where: { code: 'KPI_CHAMP' },
      update: {},
      create: {
        name: 'KPI Champion',
        code: 'KPI_CHAMP',
        description: 'Department-level KPI management',
        permissions: ['read:dept_kpis', 'write:dept_kpis', 'manage:evidence'],
        isSystem: true
      }
    }),
    prisma.role.upsert({
      where: { code: 'EMPLOYEE' },
      update: {},
      create: {
        name: 'Employee',
        code: 'EMPLOYEE',
        description: 'Individual KPI access',
        permissions: ['read:own_kpis', 'write:own_kpis', 'submit:evidence'],
        isSystem: true
      }
    })
  ])

  // Create a system tenant for Super Admin role assignments (required by schema)
  const systemTenant = await prisma.tenant.upsert({
    where: { subdomain: 'system' },
    update: {},
    create: {
      name: 'System',
      subdomain: 'system',
      settings: {}
    }
  })

  // Create the Super Admin user daveed_8@yahoo.com
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'daveed_8@yahoo.com' },
    update: {},
    create: {
      email: 'daveed_8@yahoo.com',
      name: 'David Super Admin',
      tenantId: null // Super admins don't belong to any specific tenant
    }
  })

  // Assign SUPER_ADMIN role (using system tenant for schema compliance)
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: superAdminUser.id,
      tenantId: systemTenant.id,
      roleId: roles[0].id
    }
  });

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: superAdminUser.id,
        tenantId: systemTenant.id,
        roleId: roles[0].id
      }
    });
  }

  console.log('Database seeded successfully!')
  console.log('Super Admin created: daveed_8@yahoo.com')
  console.log('')
  console.log('System is ready for tenant creation by Super Admin.')
  console.log('Next steps:')
  console.log('1. Super Admin (daveed_8@yahoo.com) logs in')
  console.log('2. Creates new tenants via Tenant Management')
  console.log('3. Assigns Organization Admins to manage each tenant')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
