import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing User table schema...')
  
  try {
    // Try to execute raw SQL to fix the schema
    await prisma.$executeRaw`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS level,
      DROP COLUMN IF EXISTS "isIndividualUnit";
    `
    
    await prisma.$executeRaw`
      ALTER TABLE users 
      ALTER COLUMN "tenantId" DROP NOT NULL;
    `
    
    console.log('✅ User table schema fixed!')
    console.log('- Removed level column')
    console.log('- Removed isIndividualUnit column') 
    console.log('- Made tenantId optional')
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
