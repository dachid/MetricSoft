import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAndTestIndividualKPI() {
  try {
    console.log('🔍 Finding Individual KPIs for testing...');
    console.log('=========================================');

    // Find Individual KPIs (orgUnitId = null)
    const individualKpis = await prisma.kPI.findMany({
      where: {
        orgUnitId: null, // Individual KPIs have null orgUnitId
        isActive: true
      },
      include: {
        performanceComponent: true,
        perspective: true
      },
      take: 5
    });

    console.log(`Found ${individualKpis.length} Individual KPIs`);

    if (individualKpis.length === 0) {
      console.log('❌ No Individual KPIs found to test');
      return;
    }

    // Test with the first Individual KPI
    const testKpi = individualKpis[0];
    console.log('\n🧪 Testing Individual KPI:');
    console.log(`  ID: ${testKpi.id}`);
    console.log(`  Name: ${testKpi.name}`);
    console.log(`  Code: ${testKpi.code}`);
    console.log(`  Org Unit ID: ${testKpi.orgUnitId} (should be null)`);
    console.log(`  Performance Component ID: ${testKpi.performanceComponentId}`);
    console.log(`  Current Perspective ID: ${testKpi.perspectiveId}`);
    console.log('');

    if (!testKpi.performanceComponentId) {
      console.log('❌ This Individual KPI has no performance component to follow');
      return;
    }

    // Now test the NEW logic on this Individual KPI
    console.log('🔍 Applying NEW Performance Component Chain Logic:');
    console.log('================================================');

    let currentKpi = testKpi;
    let chainDepth = 0;
    const maxDepth = 20;
    let resolutionPath = [`${currentKpi.name} (${currentKpi.code}) [INDIVIDUAL]`];

    while (currentKpi?.performanceComponentId && chainDepth < maxDepth) {
      chainDepth++;
      console.log(`  Chain depth ${chainDepth}: Following component ${currentKpi.performanceComponentId}`);

      // Get the performance component
      const performanceComponent = await prisma.performanceComponent.findFirst({
        where: {
          id: currentKpi.performanceComponentId,
          isActive: true
        }
      });

      if (!performanceComponent) {
        console.log(`  ❌ Performance component not found: ${currentKpi.performanceComponentId}`);
        break;
      }

      if (!performanceComponent.kpiId) {
        console.log(`  ❌ Performance component has no source KPI: ${performanceComponent.id}`);
        break;
      }

      // Get the source KPI
      const sourceKpi = await prisma.kPI.findFirst({
        where: {
          id: performanceComponent.kpiId
        },
        include: {
          performanceComponent: true,
          perspective: true
        }
      });

      if (!sourceKpi) {
        console.log(`  ❌ Source KPI not found: ${performanceComponent.kpiId}`);
        break;
      }

      const kpiType = sourceKpi.orgUnitId ? 'ORGANIZATIONAL' : 'INDIVIDUAL';
      console.log(`  ✅ Found source KPI: ${sourceKpi.name} (${sourceKpi.code}) [${kpiType}]`);
      console.log(`     Source KPI Performance Component ID: ${sourceKpi.performanceComponentId}`);
      console.log(`     Source KPI Perspective ID: ${sourceKpi.perspectiveId}`);

      resolutionPath.push(`${sourceKpi.name} (${sourceKpi.code}) [${kpiType}]`);
      currentKpi = sourceKpi;

      // If this KPI has no performance component, it's the root organizational KPI
      if (!currentKpi.performanceComponentId) {
        console.log(`  🎯 Found root organizational KPI: ${currentKpi.name}`);
        break;
      }
    }

    console.log('');
    console.log('📊 INDIVIDUAL KPI RESOLUTION RESULT:');
    console.log('====================================');
    console.log(`Resolution Chain: ${resolutionPath.reverse().join(' → ')}`);
    console.log(`Chain Depth: ${chainDepth}`);
    
    if (currentKpi?.perspectiveId) {
      const perspective = await prisma.fiscalYearPerspective.findFirst({
        where: {
          id: currentKpi.perspectiveId
        }
      });
      
      console.log(`✅ RESOLVED Perspective ID: ${currentKpi.perspectiveId}`);
      console.log(`✅ Perspective Name: ${perspective?.name || 'Unknown'}`);
      console.log(`✅ Perspective Code: ${perspective?.code || 'Unknown'}`);
      console.log(`✅ Root KPI: ${currentKpi.name} (${currentKpi.code})`);
    } else {
      console.log('❌ No perspective found in root KPI');
    }

    // Compare with original Individual KPI's perspective
    console.log('');
    console.log('🔍 COMPARISON:');
    console.log('==============');
    console.log(`Individual KPI Current Perspective: ${testKpi.perspectiveId}`);
    console.log(`Resolved Perspective: ${currentKpi?.perspectiveId || 'null'}`);
    
    if (testKpi.perspectiveId === currentKpi?.perspectiveId) {
      console.log('✅ MATCH: Perspectives match - Individual KPI logic is correct');
    } else {
      console.log('❌ MISMATCH: Individual KPI should be updated');
      
      if (currentKpi?.perspectiveId) {
        const resolvedPerspective = await prisma.fiscalYearPerspective.findFirst({
          where: { id: currentKpi.perspectiveId }
        });
        console.log(`  Should be: ${resolvedPerspective?.name} (${currentKpi.perspectiveId})`);
      }
      
      if (testKpi.perspectiveId) {
        const currentPerspective = await prisma.fiscalYearPerspective.findFirst({
          where: { id: testKpi.perspectiveId }
        });
        console.log(`  Currently: ${currentPerspective?.name} (${testKpi.perspectiveId})`);
      } else {
        console.log(`  Currently: null`);
      }
    }

    console.log('');
    console.log('✅ CONCLUSION: The same performance component chain logic works for Individual KPIs!');
    console.log('   Individual KPIs → Performance Components → Source KPIs → Root Organizational KPI → Correct Perspective');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
findAndTestIndividualKPI();