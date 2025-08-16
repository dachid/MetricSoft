import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for organizational_levels table...')
  
  try {
    // Check if the organizational_levels table exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'organizational_levels'
      );
    `
    
    console.log('Organizational levels table exists:', result)
    
    // List all tables
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
    
    console.log('\nAll tables in database:')
    console.log(tables)
    
  } catch (error) {
    console.error('❌ Error checking database:', error)
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
