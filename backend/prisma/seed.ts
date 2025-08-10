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
        description: 'Full system access including tenant configuration',
        permissions: ['*'],
        isSystem: true
      }
    }),
    prisma.role.upsert({
      where: { code: 'STRATEGY_TEAM' },
      update: {},
      create: {
        name: 'Strategy Team',
        code: 'STRATEGY_TEAM',
        description: 'Strategic oversight, KPI management, and tenant configuration access',
        permissions: ['read:all_kpis', 'write:all_kpis', 'manage:cascades', 'view:reports', 'manage:tenant_settings'],
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

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      subdomain: 'demo',
      settings: {
        fiscalYearStart: '2024-01-01',
        terminology: {
          perspectives: 'Focus Areas',
          objectives: 'Goals',
          kpis: 'Metrics',
          targets: 'Benchmarks',
          initiatives: 'Projects'
        }
      }
    }
  })

  // Create demo users with proper authentication model (passwordless)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@metricsoft.com' },
    update: {},
    create: {
      email: 'admin@metricsoft.com',
      name: 'Admin User',
      tenantId: tenant.id
    }
  })

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@metricsoft.com' },
    update: {},
    create: {
      email: 'user@metricsoft.com',
      name: 'Regular User',
      tenantId: tenant.id
    }
  })

  // Create the specific test user daveed_8@yahoo.com with STRATEGY_TEAM role
  const testUser = await prisma.user.upsert({
    where: { email: 'daveed_8@yahoo.com' },
    update: {},
    create: {
      email: 'daveed_8@yahoo.com',
      name: 'David Test User',
      tenantId: tenant.id
    }
  })

  // Assign roles to users
  await prisma.userRole.upsert({
    where: {
      userId_tenantId_roleId: {
        userId: adminUser.id,
        tenantId: tenant.id,
        roleId: roles[0].id // Super Admin
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      tenantId: tenant.id,
      roleId: roles[0].id
    }
  })

  await prisma.userRole.upsert({
    where: {
      userId_tenantId_roleId: {
        userId: regularUser.id,
        tenantId: tenant.id,
        roleId: roles[3].id // Employee
      }
    },
    update: {},
    create: {
      userId: regularUser.id,
      tenantId: tenant.id,
      roleId: roles[3].id
    }
  })

  // Give test user STRATEGY_TEAM role for tenant settings access
  await prisma.userRole.upsert({
    where: {
      userId_tenantId_roleId: {
        userId: testUser.id,
        tenantId: tenant.id,
        roleId: roles[1].id // Strategy Team
      }
    },
    update: {},
    create: {
      userId: testUser.id,
      tenantId: tenant.id,
      roleId: roles[1].id
    }
  })

  // Create tenant settings for the demo tenant
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      terminology: {
        perspectives: 'Strategic Perspectives',
        objectives: 'Strategic Objectives',
        kpis: 'Key Performance Indicators',
        targets: 'Performance Targets',
        initiatives: 'Strategic Initiatives'
      },
      fiscalYearStart: new Date('2024-01-01'),
      periods: [],
      branding: {
        primaryColor: '#3B82F6',
        companyName: 'Demo Organization',
        logoUrl: ''
      },
      setupCompleted: false,
      setupStep: 1
    }
  })

  console.log('Database seeded successfully!')
  console.log('Demo tenant:', tenant.name)
  console.log('Demo users created:')
  console.log('- Admin: admin@metricsoft.com (SUPER_ADMIN)')
  console.log('- User: user@metricsoft.com (EMPLOYEE)')
  console.log('- Test User: daveed_8@yahoo.com (STRATEGY_TEAM) - Can access tenant settings!')
  console.log('')
  console.log('Role permissions for tenant settings:')
  console.log('- SUPER_ADMIN: Full system access (✅ can manage tenant settings)')
  console.log('- STRATEGY_TEAM: Strategic oversight (✅ can manage tenant settings)')
  console.log('- KPI_CHAMP: Department level (❌ cannot manage tenant settings)')
  console.log('- EMPLOYEE: Individual level (❌ cannot manage tenant settings)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
