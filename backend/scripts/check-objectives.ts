import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkObjectives() {
  try {
    console.log('🔍 Checking objectives in the database...\n');

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true
      }
    });

    console.log('📊 Found tenants:', tenants.length);
    console.log(tenants.map(t => `  - ${t.name} (${t.subdomain})`).join('\n'));
    console.log('');

    // Get all fiscal years
    const fiscalYears = await prisma.fiscalYear.findMany({
      select: {
        id: true,
        name: true,
        tenantId: true,
        isCurrent: true
      }
    });

    console.log('📅 Found fiscal years:', fiscalYears.length);
    fiscalYears.forEach(fy => {
      console.log(`  - ${fy.name} (Current: ${fy.isCurrent})`);
    });
    console.log('');

    // Get all organizational units
    const orgUnits = await prisma.orgUnit.findMany({
      select: {
        id: true,
        name: true,
        tenantId: true,
        fiscalYearId: true,
        levelDefinition: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('🏢 Found organizational units:', orgUnits.length);
    orgUnits.forEach(ou => {
      console.log(`  - ${ou.name} (${ou.levelDefinition?.name || 'No level'})`);
    });
    console.log('');

    // Get all objectives
    const objectives = await (prisma as any).kPIObjective.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        orgUnit: {
          select: {
            name: true,
            levelDefinition: {
              select: {
                name: true
              }
            }
          }
        },
        fiscalYear: {
          select: {
            name: true
          }
        },
        tenant: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('🎯 Found objectives:', objectives.length);
    if (objectives.length === 0) {
      console.log('  No objectives found in the database');
    } else {
      objectives.forEach((obj: any) => {
        console.log(`  - "${obj.name}" in ${obj.orgUnit?.name || 'Unknown Org'} (${obj.orgUnit?.levelDefinition?.name || 'Unknown Level'}) - ${obj.tenant?.name || 'Unknown Tenant'} - ${obj.fiscalYear?.name || 'Unknown FY'}`);
      });
    }
    console.log('');

    // Get Demo Organization specifically
    const demoOrg = orgUnits.find(ou => ou.name.toLowerCase().includes('demo'));
    if (demoOrg) {
      console.log('🎯 Checking objectives for Demo Organization specifically...');
      const demoObjectives = await (prisma as any).kPIObjective.findMany({
        where: {
          orgUnitId: demoOrg.id
        },
        select: {
          id: true,
          name: true,
          description: true
        }
      });
      
      console.log(`📋 Demo Organization objectives: ${demoObjectives.length}`);
      demoObjectives.forEach((obj: any) => {
        console.log(`  - ${obj.name}`);
      });
    } else {
      console.log('❌ No Demo Organization found');
    }

  } catch (error) {
    console.error('❌ Error checking objectives:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkObjectives();
