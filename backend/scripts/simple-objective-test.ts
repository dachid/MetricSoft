import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Testing if null orgUnitId is supported...')
    
    // Try to count objectives with null orgUnitId
    const nullCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM kpi_objectives 
      WHERE org_unit_id IS NULL
    `
    
    console.log('📊 Objectives with null orgUnitId:', nullCount)
    
    // Try to count objectives with non-null orgUnitId  
    const nonNullCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM kpi_objectives 
      WHERE org_unit_id IS NOT NULL
    `
    
    console.log('📊 Objectives with orgUnitId:', nonNullCount)
    
    // Test basic query that should work with the new schema
    const allObjectives = await prisma.kPIObjective.findMany({
      select: {
        id: true,
        name: true,
        orgUnitId: true,
        createdById: true
      },
      take: 5
    })
    
    console.log('📊 Sample objectives:', allObjectives.length)
    allObjectives.forEach(obj => {
      console.log(`  - ${obj.name} (orgUnitId: ${obj.orgUnitId || 'NULL'})`)
    })
    
    console.log('\n✅ Basic test completed successfully!')
    
  } catch (error) {
    console.error('❌ Error in simple test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()