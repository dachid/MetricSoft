const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInitiatives() {
  try {
    // Find the Demo Organization
    const demoOrg = await prisma.organizationalUnit.findFirst({
      where: { name: 'Demo Organization' },
      include: { level: true }
    });
    
    if (!demoOrg) {
      console.log('Demo Organization not found');
      return;
    }
    
    console.log('Demo Organization found:', {
      id: demoOrg.id,
      name: demoOrg.name,
      levelId: demoOrg.level?.id,
      levelName: demoOrg.level?.name
    });
    
    // Find current fiscal year
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { 
        tenantId: demoOrg.tenantId,
        status: 'ACTIVE'
      }
    });
    
    if (!fiscalYear) {
      console.log('No active fiscal year found');
      return;
    }
    
    console.log('Active fiscal year found:', fiscalYear.name);
    
    // Check for EXIT performance components at the organization level
    const exitComponents = await prisma.performanceComponent.findMany({
      where: {
        tenantId: demoOrg.tenantId,
        fiscalYearId: fiscalYear.id,
        levelId: demoOrg.level?.id,
        componentType: 'EXIT'
      }
    });
    
    console.log('\nEXIT components at Organization level:', exitComponents.length);
    exitComponents.forEach(comp => {
      console.log('- Component:', {
        id: comp.id,
        name: comp.componentName,
        type: comp.componentType
      });
    });
    
    // Also check the department level to see what the API call should be looking for
    const departments = await prisma.organizationalUnit.findMany({
      where: { 
        tenantId: demoOrg.tenantId,
        parentId: demoOrg.id
      },
      include: { level: true }
    });
    
    console.log('\nDepartments under Demo Organization:');
    departments.forEach(dept => {
      console.log('- Department:', {
        id: dept.id,
        name: dept.name,
        levelId: dept.level?.id,
        levelName: dept.level?.name,
        parentId: dept.parentId
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInitiatives();
