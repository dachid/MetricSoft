import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating Super Admin user...')
  
  // Create system roles first
  const superAdminRole = await prisma.role.upsert({
    where: { code: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'Super Administrator',
      code: 'SUPER_ADMIN',
      description: 'Full system access including tenant creation and management',
      permissions: ['*'],
      isSystem: true
    }
  })

  // Create a system tenant for Super Admin role assignments
  const systemTenant = await prisma.tenant.upsert({
    where: { subdomain: 'system' },
    update: {},
    create: {
      name: 'System Administration',
      subdomain: 'system',
      settings: {},
      isActive: true
    }
  })

  // Create the Super Admin user with system tenant
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'daveed_8@yahoo.com' },
    update: {},
    create: {
      email: 'daveed_8@yahoo.com',
      name: 'David Super Admin',
      tenantId: systemTenant.id  // Associate with system tenant
    }
  })

  // Assign SUPER_ADMIN role
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: superAdminUser.id,
      tenantId: systemTenant.id,
      roleId: superAdminRole.id
    }
  })

  if (!existingUserRole) {
    await prisma.userRole.create({
      data: {
        userId: superAdminUser.id,
        tenantId: systemTenant.id,
        roleId: superAdminRole.id
      }
    })
  }

  console.log('✅ Super Admin user created successfully!')
  console.log(`Email: ${superAdminUser.email}`)
  console.log(`Name: ${superAdminUser.name}`)
  console.log(`Role: ${superAdminRole.name}`)
  console.log('')
  console.log('🚀 System ready for tenant creation!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
