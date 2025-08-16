import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking current users in database...')
  
  // Check current users
  const currentUsers = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  })
  
  console.log(`Found ${currentUsers.length} users:`)
  currentUsers.forEach(user => {
    console.log(`- ${user.email} (${user.name || 'No name'}) - Roles: ${user.roles.map(r => r.role.code).join(', ')}`)
  })
  
  console.log('\n🧹 Cleaning up all users except Super Admin...')
  
  // Delete all users except the Super Admin
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        not: 'daveed_8@yahoo.com'
      }
    }
  })
  
  console.log(`✅ Deleted ${deletedUsers.count} users`)
  
  // Verify only Super Admin remains
  const remainingUsers = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  })
  
  console.log(`\n✅ Remaining users (${remainingUsers.length}):`)
  remainingUsers.forEach(user => {
    console.log(`- ${user.email} (${user.name || 'No name'}) - Roles: ${user.roles.map(r => r.role.code).join(', ')}`)
  })
  
  // Also clean up orphaned tenants (keep only system tenant)
  console.log('\n🧹 Cleaning up non-system tenants...')
  const deletedTenants = await prisma.tenant.deleteMany({
    where: {
      subdomain: {
        not: 'system'
      }
    }
  })
  
  console.log(`✅ Deleted ${deletedTenants.count} tenants`)
  
  console.log('\n🎉 Database cleanup complete! Only Super Admin and system tenant remain.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
