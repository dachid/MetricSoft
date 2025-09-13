const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExitComponents() {
  try {
    // Find Demo Organization tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Demo Organization' }
    });
    
    if (!tenant) {
      console.log('Demo Organization not found');
      return;
    }
    
    console.log('=== Demo Organization Exit Components ===');
    console.log('Tenant ID:', tenant.id);
    
    // Get current fiscal year
    const fiscalYear = await prisma.fiscalYear.findFirst({
      where: { 
        tenantId: tenant.id,
        isCurrent: true 
      }
    });
    
    if (!fiscalYear) {
      console.log('No active fiscal year found');
      return;
    }
    
    console.log('Fiscal Year:', fiscalYear.name);
    
    // Get performance component templates (exit components)
    const templates = await prisma.performanceComponentTemplate.findMany({
      where: { fiscalYearId: fiscalYear.id },
      include: {
        orgLevel: true,
        exitRelationships: {
          include: {
            entryComponent: {
              include: { orgLevel: true }
            }
          }
        }
      }
    });
    
    console.log('\nPerformance Component Templates:');
    templates.forEach(template => {
      console.log(`- ${template.componentName} (${template.componentType}) at ${template.orgLevel.name}`);
      if (template.exitRelationships.length > 0) {
        console.log(`  Exit relationships:`);
        template.exitRelationships.forEach(rel => {
          console.log(`    -> ${rel.entryComponent.componentName} at ${rel.entryComponent.orgLevel.name}`);
        });
      }
    });
    
    // Check KPIs and their exit components
    const kpis = await prisma.kPI.findMany({
      where: { tenantId: tenant.id },
      include: {
        orgUnit: {
          include: { levelDefinition: true }
        }
      }
    });
    
    console.log('\n=== Current KPIs ===');
    kpis.forEach(kpi => {
      console.log(`KPI: ${kpi.name} at ${kpi.orgUnit.name} (${kpi.orgUnit.levelDefinition.name})`);
    });
    
    // Get org levels to understand hierarchy
    const orgLevels = await prisma.fiscalYearLevelDefinition.findMany({
      where: { fiscalYearId: fiscalYear.id },
      orderBy: { sequenceOrder: 'asc' }
    });
    
    console.log('\n=== Organizational Levels ===');
    orgLevels.forEach(level => {
      console.log(`- ${level.name} (Order: ${level.sequenceOrder})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExitComponents();
