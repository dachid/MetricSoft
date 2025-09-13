const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugInitiatives() {
  try {
    console.log('=== DEBUGGING INITIATIVES ===');
    
    // Find Demo Organization tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: { contains: 'Demo Organization' } }
    });
    
    if (!tenant) {
      console.log('❌ Demo Organization tenant not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant.name, 'ID:', tenant.id);
    
    // Find current fiscal year
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { 
        tenantId: tenant.id,
        status: { in: ['active', 'locked'] }
      }
    });
    
    if (!fiscalYear) {
      console.log('❌ No active fiscal year found');
      return;
    }
    
    console.log('✅ Found fiscal year:', fiscalYear.name, 'ID:', fiscalYear.id);
    
    // Find Organization level
    const orgLevel = await prisma.fiscalYearLevelDefinition.findFirst({
      where: {
        fiscalYearId: fiscalYear.id,
        name: 'Organization'
      }
    });
    
    if (!orgLevel) {
      console.log('❌ Organization level not found');
      return;
    }
    
    console.log('✅ Found org level:', orgLevel.name, 'ID:', orgLevel.id);
    
    // Check all performance components for this tenant and level
    console.log('\n=== ALL PERFORMANCE COMPONENTS ===');
    const allComponents = await prisma.performanceComponent.findMany({
      where: {
        tenantId: tenant.id
      }
    });
    
    console.log('Total components in DB:', allComponents.length);
    allComponents.forEach(comp => {
      console.log(`- ID: ${comp.id}, Name: ${comp.name}, Type: ${comp.componentType}, Level: "${comp.organizationalLevel}"`);
    });
    
    // Check components specifically for Organization level
    console.log('\n=== ORGANIZATION LEVEL COMPONENTS ===');
    const orgComponents = await prisma.performanceComponent.findMany({
      where: {
        tenantId: tenant.id,
        organizationalLevel: 'Organization'
      }
    });
    
    console.log('Components for Organization level:', orgComponents.length);
    orgComponents.forEach(comp => {
      console.log(`- ID: ${comp.id}, Name: ${comp.name}, Type: ${comp.componentType}`);
    });
    
    // Check EXIT components specifically
    console.log('\n=== ORGANIZATION EXIT COMPONENTS (INITIATIVES) ===');
    const exitComponents = await prisma.performanceComponent.findMany({
      where: {
        tenantId: tenant.id,
        organizationalLevel: 'Organization',
        componentType: 'EXIT'
      }
    });
    
    console.log('EXIT components for Organization level:', exitComponents.length);
    exitComponents.forEach(comp => {
      console.log(`- ID: ${comp.id}, Name: ${comp.name}`);
    });
    
    // Check what KPIs exist at organization level
    console.log('\n=== ORGANIZATION LEVEL KPIS ===');
    const orgUnits = await prisma.organizationalUnit.findMany({
      where: {
        tenantId: tenant.id,
        levelDefinitionId: orgLevel.id
      },
      include: {
        levelDefinition: true
      }
    });
    
    console.log('Organization units:', orgUnits.length);
    
    for (const orgUnit of orgUnits) {
      console.log(`\nOrg Unit: ${orgUnit.name} (Level: ${orgUnit.levelDefinition.name})`);
      
      const kpis = await prisma.kPI.findMany({
        where: {
          orgUnitId: orgUnit.id,
          fiscalYearId: fiscalYear.id
        },
        include: {
          performanceComponent: true
        }
      });
      
      console.log(`  KPIs: ${kpis.length}`);
      kpis.forEach(kpi => {
        console.log(`    - KPI: ${kpi.name} (Code: ${kpi.code})`);
        if (kpi.performanceComponent) {
          console.log(`      -> Linked to component: ${kpi.performanceComponent.name} (${kpi.performanceComponent.componentType})`);
        } else {
          console.log(`      -> No performance component linked`);
        }
      });
    }
    
    // Check department level org units to see what they should be seeing
    console.log('\n=== DEPARTMENT LEVEL ORG UNITS ===');
    const deptLevel = await prisma.fiscalYearLevelDefinition.findFirst({
      where: {
        fiscalYearId: fiscalYear.id,
        name: 'Department'
      }
    });
    
    if (!deptLevel) {
      console.log('❌ Department level not found');
      return;
    }
    
    const deptUnits = await prisma.organizationalUnit.findMany({
      where: {
        tenantId: tenant.id,
        levelDefinitionId: deptLevel.id
      },
      include: {
        levelDefinition: true,
        parent: {
          include: {
            levelDefinition: true
          }
        }
      }
    });
    
    console.log('Department units:', deptUnits.length);
    
    for (const deptUnit of deptUnits) {
      console.log(`\nDept Unit: ${deptUnit.name}`);
      console.log(`  Parent: ${deptUnit.parent?.name} (Level: ${deptUnit.parent?.levelDefinition.name})`);
      console.log(`  Parent Level ID: ${deptUnit.parent?.levelDefinitionId}`);
      
      if (deptUnit.parent?.levelDefinitionId) {
        // This is what the API query should find
        const parentLevel = await prisma.fiscalYearLevelDefinition.findUnique({
          where: { id: deptUnit.parent.levelDefinitionId }
        });
        
        console.log(`  Parent level name: "${parentLevel?.name}"`);
        
        const shouldSeeComponents = await prisma.performanceComponent.findMany({
          where: {
            tenantId: tenant.id,
            organizationalLevel: parentLevel?.name || '',
            componentType: 'EXIT'
          }
        });
        
        console.log(`  Should see ${shouldSeeComponents.length} initiatives:`);
        shouldSeeComponents.forEach(comp => {
          console.log(`    - ${comp.name}`);
        });
      }
    }

  } catch (error) {
    console.error('Error debugging initiatives:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugInitiatives();
