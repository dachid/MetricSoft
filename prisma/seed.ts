import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
        description: 'Full system access',
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

  // Create demo users
  const adminPassword = await bcrypt.hash('admin123', 12)
  const userPassword = await bcrypt.hash('user123', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@metricsoft.com' },
    update: {},
    create: {
      email: 'admin@metricsoft.com',
      password: adminPassword,
      name: 'Admin User',
      tenantId: tenant.id
    }
  })

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@metricsoft.com' },
    update: {},
    create: {
      email: 'user@metricsoft.com',
      password: userPassword,
      name: 'Regular User',
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

  console.log('Database seeded successfully!')
  console.log('Demo tenant:', tenant.name)
  console.log('Demo users created:')
  console.log('- Admin: admin@metricsoft.com / admin123')
  console.log('- User: user@metricsoft.com / user123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
