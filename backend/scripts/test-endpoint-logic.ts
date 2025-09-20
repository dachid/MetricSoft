import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPerspectiveEndpoint() {
  try {
    console.log('🔍 Testing the new perspective resolution endpoint logic...');
    
    const kpiId = 'cmfs2b1jn0027bsq8d7yt958r';
    const tenantId = 'cmfi1vc420003bsrgn3yhv2q4'; // Correct tenant
    
    console.log(`\nTesting KPI: ${kpiId}`);
    
    // Simulate the new endpoint logic
    const kpi = await prisma.kPI.findUnique({
      where: { 
        id: kpiId,
        tenantId: tenantId 
      }
    });
    
    if (!kpi) {
      console.log('❌ KPI not found');
      return;
    }
    
    console.log(`\nKPI found: ${kpi.name}`);
    console.log(`Current perspective: ${kpi.perspectiveId}`);
    console.log(`Performance component: ${kpi.performanceComponentId}`);
    
    // Follow the performance component chain
    if (kpi.performanceComponentId) {
      let currentComponentId: string | null = kpi.performanceComponentId;
      let chainDepth = 0;
      const maxDepth = 20;
      
      console.log('\n🔗 Following performance component chain:');
      
      while (currentComponentId && chainDepth < maxDepth) {
        chainDepth++;
        console.log(`\n--- Chain Level ${chainDepth} ---`);
        
        const component = await prisma.performanceComponent.findUnique({
          where: { id: currentComponentId }
        });
        
        if (!component) {
          console.log('❌ Component not found');
          break;
        }
        
        console.log(`Component: ${component.name} (${component.id})`);
        console.log(`Component KPI ID: ${component.kpiId}`);
        
        if (!component.kpiId) {
          console.log('❌ No source KPI for this component');
          break;
        }
        
        const sourceKpi = await prisma.kPI.findUnique({
          where: { 
            id: component.kpiId,
            tenantId: tenantId 
          }
        });
        
        if (!sourceKpi) {
          console.log('❌ Source KPI not found');
          break;
        }
        
        console.log(`Source KPI: ${sourceKpi.name} (${sourceKpi.id})`);
        console.log(`Source KPI perspective: ${sourceKpi.perspectiveId}`);
        console.log(`Source KPI performance component: ${sourceKpi.performanceComponentId}`);
        
        // If this KPI has no performance component, it's the root organizational KPI
        if (!sourceKpi.performanceComponentId) {
          console.log('\n🎯 Found root organizational KPI!');
          
          // Get perspective details
          const perspective = await prisma.fiscalYearPerspective.findUnique({
            where: { id: sourceKpi.perspectiveId! }
          });
          
          console.log(`\n✅ RESOLVED PERSPECTIVE:`);
          console.log(`   ID: ${sourceKpi.perspectiveId}`);
          console.log(`   Name: ${perspective?.name}`);
          
          console.log(`\n❌ CURRENT PERSPECTIVE:`);
          const currentPerspective = await prisma.fiscalYearPerspective.findUnique({
            where: { id: kpi.perspectiveId! }
          });
          console.log(`   ID: ${kpi.perspectiveId}`);
          console.log(`   Name: ${currentPerspective?.name}`);
          
          if (sourceKpi.perspectiveId === kpi.perspectiveId) {
            console.log('\n✅ CORRECT: Perspectives match');
          } else {
            console.log('\n❌ INCORRECT: Perspectives do not match');
            console.log(`Should be: ${perspective?.name} (${sourceKpi.perspectiveId})`);
            console.log(`Currently: ${currentPerspective?.name} (${kpi.perspectiveId})`);
          }
          
          return;
        }
        
        // Continue following the chain
        currentComponentId = sourceKpi.performanceComponentId;
      }
      
      if (chainDepth >= maxDepth) {
        console.log('⚠️ Maximum chain depth reached, potential circular reference');
      }
    } else {
      console.log('ℹ️ No performance component, this is likely a root organizational KPI');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPerspectiveEndpoint();