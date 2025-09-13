import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking EXIT components (initiatives) in performance_components table...')
  
  try {
    // Find the Demo Organization
    const demoOrg = await prisma.orgUnit.findFirst({
      where: { name: 'Demo Organization' }
    })
    
    if (!demoOrg) {
      console.log('❌ Demo Organization not found')
      return
    }
    
    console.log('✅ Demo Organization found:', demoOrg.id)
    
    // Check for EXIT components in performance_components table
    const exitComponents = await prisma.performanceComponent.findMany({
      where: {
        tenantId: demoOrg.tenantId,
        organizationalLevel: 'Organization', // This is likely how it's stored
        componentType: 'EXIT'
      }
    })
    
    console.log(`\n📊 EXIT components (initiatives) found: ${exitComponents.length}`)
    exitComponents.forEach(comp => {
      console.log('  - Initiative:', {
        id: comp.id,
        name: comp.name,
        organizationalLevel: comp.organizationalLevel,
        componentType: comp.componentType
      })
    })
    
    // Also check all performance components to see what's there
    const allComponents = await prisma.performanceComponent.findMany({
      where: {
        tenantId: demoOrg.tenantId
      }
    })
    
    console.log(`\n📋 All performance components: ${allComponents.length}`)
    allComponents.forEach(comp => {
      console.log('  - Component:', {
        id: comp.id,
        name: comp.name,
        level: comp.organizationalLevel,
        type: comp.componentType
      })
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
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
