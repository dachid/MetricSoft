import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPerspectiveResolution() {
  const kpiId = 'cmfs0vnex001xbsq88yumidkp';
  const tenantId = 'cmfi1vc420003bsrgn3yhv2q4';
  
  try {
    console.log('🔍 Testing Perspective Resolution Logic');
    console.log('=====================================');
    console.log(`KPI ID: ${kpiId}`);
    console.log(`Tenant ID: ${tenantId}`);
    console.log('');

    // Step 1: Get KPI details
    console.log('🔍 Step 1: Getting KPI details from database...');
    const kpi = await prisma.kPI.findFirst({
      where: {
        id: kpiId,
        tenantId: tenantId
      },
      include: {
        orgUnit: true,
        performanceComponent: {
          include: {
            orgUnit: true
          }
        },
        fiscalYear: true,
        perspective: true
      }
    });

    if (!kpi) {
      console.error('❌ KPI not found');
      return;
    }

    console.log('✅ Found KPI:');
    console.log(`  Name: ${kpi.name}`);
    console.log(`  Code: ${kpi.code}`);
    console.log(`  Org Unit ID: ${kpi.orgUnitId}`);
    console.log(`  Performance Component ID: ${kpi.performanceComponentId}`);
    console.log(`  Current Perspective ID: ${kpi.perspectiveId}`);
    console.log('');

    // Step 2: Determine the org unit to use for perspective resolution
    let orgUnitForResolution = null;
    
    if (kpi.orgUnitId) {
      // Organizational KPI
      console.log('📍 This is an Organizational KPI');
      orgUnitForResolution = kpi.orgUnit;
    } else if (kpi.performanceComponent && kpi.performanceComponent.orgUnitId) {
      // Individual KPI
      console.log('📍 This is an Individual KPI');
      console.log(`  Performance Component: ${kpi.performanceComponent.name}`);
      console.log(`  Performance Component Org Unit: ${kpi.performanceComponent.orgUnitId}`);
      orgUnitForResolution = kpi.performanceComponent.orgUnit;
    } else {
      console.error('❌ Cannot determine org unit for perspective resolution');
      return;
    }

    if (!orgUnitForResolution) {
      console.error('❌ Org unit not found');
      return;
    }

    console.log(`📍 Using Org Unit for perspective resolution:`);
    console.log(`  ID: ${orgUnitForResolution.id}`);
    console.log(`  Name: ${orgUnitForResolution.name}`);
    console.log(`  Parent ID: ${orgUnitForResolution.parentId}`);
    console.log('');

    // Step 3: Traverse up to find root unit
    console.log('🔍 Step 3: Traversing org hierarchy to find root unit...');
    let currentUnit = orgUnitForResolution;
    let traversalPath = [currentUnit.name];

    while (currentUnit.parentId) {
      const parentUnit = await prisma.orgUnit.findFirst({
        where: {
          id: currentUnit.parentId,
          tenantId: tenantId
        }
      });

      if (!parentUnit) {
        console.error('❌ Parent unit not found in hierarchy');
        break;
      }

      currentUnit = parentUnit;
      traversalPath.push(currentUnit.name);
      console.log(`  Found parent: ${currentUnit.name} (${currentUnit.id})`);
    }

    console.log(`✅ Root unit found: ${currentUnit.name} (${currentUnit.id})`);
    console.log(`📍 Traversal path: ${traversalPath.reverse().join(' → ')}`);
    console.log('');

    // Step 4: Get perspectives for root unit's fiscal year
    console.log('🔍 Step 4: Getting perspectives for root unit fiscal year...');
    const perspectives = await prisma.fiscalYearPerspective.findMany({
      where: {
        fiscalYearId: currentUnit.fiscalYearId,
        isActive: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${perspectives.length} perspectives:`);
    perspectives.forEach((p, index) => {
      console.log(`  ${index + 1}. ${p.name} (${p.id}) - ${p.code}`);
    });
    console.log('');

    if (perspectives.length === 0) {
      console.error('❌ No perspectives found for root unit fiscal year');
      return;
    }

    const resolvedPerspective = perspectives[0];
    console.log('📊 RESOLUTION RESULT:');
    console.log('===================');
    console.log(`KPI ID: ${kpiId}`);
    console.log(`KPI Type: ${kpi.orgUnitId ? 'Organizational' : 'Individual'}`);
    console.log(`Current Perspective ID: ${kpi.perspectiveId || 'null'}`);
    console.log(`RESOLVED Perspective ID: ${resolvedPerspective.id}`);
    console.log(`Perspective Name: ${resolvedPerspective.name}`);
    console.log(`Perspective Code: ${resolvedPerspective.code}`);
    console.log(`Root Org Unit: ${currentUnit.name} (${currentUnit.id})`);
    console.log('');

    // Step 5: Compare with current logic
    if (kpi.perspectiveId === resolvedPerspective.id) {
      console.log('✅ MATCH: Current perspective matches resolved perspective');
    } else {
      console.log('❌ MISMATCH: Current perspective does NOT match resolved perspective');
      console.log(`  Expected: ${resolvedPerspective.id}`);
      console.log(`  Actual: ${kpi.perspectiveId || 'null'}`);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPerspectiveResolution();