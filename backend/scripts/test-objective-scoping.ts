import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testObjectiveScoping() {
  try {
    console.log('🔍 Testing objective scoping for org units...\n');
    
    // Get some org units and their objectives
    const orgUnits = await prisma.orgUnit.findMany({
      include: {
        levelDefinition: true
      },
      take: 5
    });
    
    console.log(`📊 Found ${orgUnits.length} org units:\n`);
    
    for (const orgUnit of orgUnits) {
      console.log(`--- ${orgUnit.name} (${orgUnit.id}) ---`);
      console.log(`Level: ${orgUnit.levelDefinition?.name}`);
      
      // Get objectives for this org unit
      const objectives = await (prisma as any).kPIObjective.findMany({
        where: {
          orgUnitId: orgUnit.id,
          isActive: true
        }
      });
      
      console.log(`Objectives: ${objectives.length}`);
      if (objectives.length > 0) {
        objectives.forEach((obj: any, index: number) => {
          console.log(`  ${index + 1}. ${obj.name} (${obj.id})`);
        });
      } else {
        console.log('  No objectives found');
      }
      console.log('');
    }
    
    // Test the exact scenario from the API
    console.log('🧪 Testing API logic scenario...\n');
    
    // Get a demo organization department
    const demoOrg = await prisma.orgUnit.findFirst({
      where: {
        name: 'Demo Organization'
      }
    });
    
    if (demoOrg) {
      console.log(`Demo Organization ID: ${demoOrg.id}`);
      
      // Get its departments
      const departments = await prisma.orgUnit.findMany({
        where: {
          parentId: demoOrg.id
        },
        include: {
          levelDefinition: true
        }
      });
      
      console.log(`\nDepartments under Demo Organization:`);
      for (const dept of departments) {
        console.log(`- ${dept.name} (${dept.id}) - Level: ${dept.levelDefinition?.name}`);
        
        // Test objective fetching for this department
        const deptObjectives = await (prisma as any).kPIObjective.findMany({
          where: {
            orgUnitId: dept.id,
            isActive: true
          }
        });
        
        console.log(`  Objectives for ${dept.name}: ${deptObjectives.length}`);
        deptObjectives.forEach((obj: any) => {
          console.log(`    - ${obj.name} (${obj.id})`);
        });
        
        // Also check what objectives exist for the parent org
        const parentObjectives = await (prisma as any).kPIObjective.findMany({
          where: {
            orgUnitId: demoOrg.id,
            isActive: true
          }
        });
        
        console.log(`  Parent org objectives: ${parentObjectives.length}`);
        if (parentObjectives.length > 0) {
          console.log(`    ⚠️  These should NOT appear when creating KPIs for ${dept.name}:`);
          parentObjectives.forEach((obj: any) => {
            console.log(`      - ${obj.name} (${obj.id})`);
          });
        }
        console.log('');
      }
    }
    
    // Test all objectives across all org units to show the scoping
    console.log('\n📋 All objectives by org unit:');
    const allObjectives = await (prisma as any).kPIObjective.findMany({
      where: {
        isActive: true
      },
      include: {
        orgUnit: {
          include: {
            levelDefinition: true
          }
        }
      }
    });
    
    const objectivesByOrgUnit = allObjectives.reduce((acc: any, obj: any) => {
      const orgUnitName = obj.orgUnit?.name || 'Unknown';
      if (!acc[orgUnitName]) {
        acc[orgUnitName] = [];
      }
      acc[orgUnitName].push(obj);
      return acc;
    }, {});
    
    Object.entries(objectivesByOrgUnit).forEach(([orgUnitName, objectives]: [string, any]) => {
      console.log(`\n${orgUnitName}:`);
      objectives.forEach((obj: any) => {
        console.log(`  - ${obj.name} (${obj.id})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testObjectiveScoping();