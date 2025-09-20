import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testNewPerspectiveResolution() {
  const kpiId = 'cmfs0vnex001xbsq88yumidkp';
  
  try {
    console.log('🧪 Testing NEW Perspective Resolution Logic');
    console.log('==========================================');
    console.log(`KPI ID: ${kpiId}`);
    console.log('');

    // Step 1: Get KPI details
    console.log('🔍 Step 1: Getting KPI details...');
    const kpi = await prisma.kPI.findFirst({
      where: {
        id: kpiId
      },
      include: {
        performanceComponent: true,
        perspective: true
      }
    });

    if (!kpi) {
      console.error('❌ KPI not found');
      return;
    }

    console.log(`✅ Found KPI: ${kpi.name} (${kpi.code})`);
    console.log(`  Current Perspective ID: ${kpi.perspectiveId}`);
    console.log(`  Performance Component ID: ${kpi.performanceComponentId}`);
    console.log('');

    // Step 2: Follow the performance component chain backwards
    console.log('🔍 Step 2: Following performance component chain...');
    let currentKpi = kpi;
    let chainDepth = 0;
    const maxDepth = 20;
    let resolutionPath = [`${currentKpi.name} (${currentKpi.code})`];

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

      console.log(`  ✅ Found source KPI: ${sourceKpi.name} (${sourceKpi.code})`);
      console.log(`     Source KPI Performance Component ID: ${sourceKpi.performanceComponentId}`);
      console.log(`     Source KPI Perspective ID: ${sourceKpi.perspectiveId}`);

      resolutionPath.push(`${sourceKpi.name} (${sourceKpi.code})`);
      currentKpi = sourceKpi;

      // If this KPI has no performance component, it's the root organizational KPI
      if (!currentKpi.performanceComponentId) {
        console.log(`  🎯 Found root organizational KPI: ${currentKpi.name}`);
        break;
      }
    }

    console.log('');
    console.log('📊 RESOLUTION RESULT:');
    console.log('===================');
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

    // Compare with original KPI's perspective
    console.log('');
    console.log('🔍 COMPARISON:');
    console.log('==============');
    console.log(`Original KPI Perspective: ${kpi.perspectiveId}`);
    console.log(`Resolved Perspective: ${currentKpi?.perspectiveId || 'null'}`);
    
    if (kpi.perspectiveId === currentKpi?.perspectiveId) {
      console.log('✅ MATCH: Perspectives match');
    } else {
      console.log('❌ MISMATCH: Perspectives do NOT match');
      
      if (currentKpi?.perspectiveId) {
        const resolvedPerspective = await prisma.fiscalYearPerspective.findFirst({
          where: { id: currentKpi.perspectiveId }
        });
        console.log(`  Expected: ${resolvedPerspective?.name} (${currentKpi.perspectiveId})`);
      }
      
      if (kpi.perspectiveId) {
        const currentPerspective = await prisma.fiscalYearPerspective.findFirst({
          where: { id: kpi.perspectiveId }
        });
        console.log(`  Current: ${currentPerspective?.name} (${kpi.perspectiveId})`);
      }
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNewPerspectiveResolution();