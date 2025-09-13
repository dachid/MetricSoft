const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testExitComponents() {
  try {
    console.log('Testing exit component API logic...\n');

    // Get the first KPI
    const kpi = await prisma.kPI.findFirst({
      include: {
        orgUnit: {
          include: {
            levelDefinition: true
          }
        },
        fiscalYear: true
      }
    });

    if (!kpi) {
      console.log('No KPIs found');
      return;
    }

    console.log('KPI Found:');
    console.log(`- ID: ${kpi.id}`);
    console.log(`- Name: ${kpi.name}`);
    console.log(`- Org Unit: ${kpi.orgUnit.name} (ID: ${kpi.orgUnit.id})`);
    console.log(`- Level Definition: ${kpi.orgUnit.levelDefinition.name} (ID: ${kpi.orgUnit.levelDefinitionId})`);
    console.log(`- Fiscal Year: ${kpi.fiscalYear.name} (ID: ${kpi.fiscalYearId})\n`);

    // Check for exit component templates
    console.log('Looking for exit component templates...');
    const exitComponents = await prisma.performanceComponentTemplate.findMany({
      where: {
        fiscalYearId: kpi.fiscalYearId,
        orgLevelId: kpi.orgUnit.levelDefinitionId,
        componentType: 'exit'
      },
      include: {
        orgLevel: true,
        exitRelationships: {
          include: {
            entryComponent: {
              include: { orgLevel: true }
            }
          }
        }
      },
      orderBy: { sequenceOrder: 'asc' }
    });

    console.log(`Found ${exitComponents.length} exit component templates:`);
    exitComponents.forEach((template, index) => {
      console.log(`${index + 1}. ${template.componentName} (${template.componentType})`);
      console.log(`   - Org Level: ${template.orgLevel.name}`);
      console.log(`   - Sequence: ${template.sequenceOrder}`);
      console.log(`   - Exit Relationships: ${template.exitRelationships.length}`);
      if (template.exitRelationships.length > 0) {
        template.exitRelationships.forEach(rel => {
          console.log(`     -> Cascades to: ${rel.entryComponent.componentName} (${rel.entryComponent.orgLevel.name})`);
        });
      }
      console.log('');
    });

    // Check existing objectives
    console.log('Looking for existing objectives...');
    const existingObjectives = await prisma.kPIObjective.findMany({
      where: {
        tenantId: kpi.tenantId,
        fiscalYearId: kpi.fiscalYearId,
        orgUnitId: kpi.orgUnitId
      }
    });

    console.log(`Found ${existingObjectives.length} existing objectives:`);
    existingObjectives.forEach((obj, index) => {
      console.log(`${index + 1}. ${obj.name}`);
      if (obj.description) console.log(`   Description: ${obj.description}`);
      console.log(`   Created: ${obj.createdAt}`);
      console.log('');
    });

    // Check all performance component templates for this fiscal year and org level
    console.log('All performance component templates for this fiscal year and org level:');
    const allTemplates = await prisma.performanceComponentTemplate.findMany({
      where: {
        fiscalYearId: kpi.fiscalYearId,
        orgLevelId: kpi.orgUnit.levelDefinitionId
      },
      include: {
        orgLevel: true
      }
    });

    console.log(`Found ${allTemplates.length} total templates:`);
    allTemplates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.componentName} (${template.componentType})`);
    });

  } catch (error) {
    console.error('Error testing exit components:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testExitComponents();
