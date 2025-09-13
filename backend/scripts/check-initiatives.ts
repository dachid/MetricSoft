import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking initiatives at Organization level...')
  
  try {
    // Find the Demo Organization
    const demoOrg = await prisma.orgUnit.findFirst({
      where: { name: 'Demo Organization' },
      include: { levelDefinition: true }
    })
    
    if (!demoOrg) {
      console.log('❌ Demo Organization not found')
      return
    }
    
    console.log('✅ Demo Organization found:', {
      id: demoOrg.id,
      name: demoOrg.name,
      levelId: demoOrg.levelDefinition?.id,
      levelName: demoOrg.levelDefinition?.name
    })
    
    // Find current fiscal year
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { 
        tenantId: demoOrg.tenantId,
        status: 'ACTIVE'
      }
    })
    
    if (!fiscalYear) {
      console.log('❌ No active fiscal year found')
      return
    }
    
    console.log('✅ Active fiscal year found:', fiscalYear.name)
    
    // Check for EXIT performance component templates at the organization level
    const exitComponents = await prisma.performanceComponentTemplate.findMany({
      where: {
        fiscalYearId: fiscalYear.id,
        orgLevelId: demoOrg.levelDefinition?.id,
        componentType: 'EXIT'
      },
      include: {
        orgLevel: true
      }
    })
    
    console.log(`\n📊 EXIT component templates at Organization level: ${exitComponents.length}`)
    exitComponents.forEach(comp => {
      console.log('  - Component:', {
        id: comp.id,
        name: comp.componentName,
        type: comp.componentType,
        levelId: comp.orgLevelId
      })
    })
    
    // Also check the department level to see what the API call should be looking for
    const departments = await prisma.orgUnit.findMany({
      where: { 
        tenantId: demoOrg.tenantId,
        parentId: demoOrg.id
      },
      include: { levelDefinition: true }
    })
    
    console.log(`\n🏢 Departments under Demo Organization: ${departments.length}`)
    departments.forEach(dept => {
      console.log('  - Department:', {
        id: dept.id,
        name: dept.name,
        levelId: dept.levelDefinition?.id,
        levelName: dept.levelDefinition?.name,
        parentId: dept.parentId
      })
    })
    
    // If we have departments, check what the frontend API call would look like
    if (departments.length > 0 && demoOrg.levelDefinition?.id) {
      console.log(`\n🔍 Frontend API call from department would be:`)
      console.log(`  /tenants/${demoOrg.tenantId}/fiscal-years/${fiscalYear.id}/performance-components?levelId=${demoOrg.levelDefinition.id}&componentType=EXIT`)
    }
    
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
