const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateTerminology() {
  try {
    console.log('🔄 Starting terminology update...')
    
    // Get all tenant settings
    const tenantSettings = await prisma.tenantSettings.findMany()
    
    console.log(`📋 Found ${tenantSettings.length} tenant settings to check`)
    
    let updatedCount = 0
    
    for (const setting of tenantSettings) {
      const terminology = setting.terminology as any
      
      // Check if initiatives exists in terminology
      if (terminology && terminology.initiatives) {
        console.log(`🔧 Updating terminology for tenant: ${setting.tenantId}`)
        
        // Create new terminology without initiatives
        const newTerminology = {
          perspectives: terminology.perspectives || 'Perspectives',
          objectives: terminology.objectives || 'Objectives',
          kpis: terminology.kpis || 'KPIs',
          targets: terminology.targets || 'Targets'
        }
        
        // Update the record
        await prisma.tenantSettings.update({
          where: { id: setting.id },
          data: { terminology: newTerminology }
        })
        
        updatedCount++
      } else {
        console.log(`✅ Tenant ${setting.tenantId} already has correct terminology`)
      }
    }
    
    console.log(`✨ Updated ${updatedCount} tenant settings`)
    console.log('🎉 Terminology update completed successfully!')
    
  } catch (error) {
    console.error('❌ Error updating terminology:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateTerminology()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
