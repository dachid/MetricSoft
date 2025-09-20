import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSpecificKPIPerspective() {
  try {
    console.log('🔍 Testing perspective resolution for KPI: cmfs2b1jn0027bsq8d7yt958r');
    
    // First, get the KPI details
    const kpi = await prisma.kPI.findUnique({
      where: { id: 'cmfs2b1jn0027bsq8d7yt958r' },
      include: {
        perspective: true,
        performanceComponent: true,
        orgUnit: {
          include: {
            levelDefinition: true
          }
        }
      }
    });
    
    if (!kpi) {
      console.log('❌ KPI not found');
      return;
    }
    
    console.log('\n📊 KPI Details:');
    console.log(`- Name: ${kpi.name}`);
    console.log(`- Current Perspective: ${kpi.perspective?.name} (${kpi.perspectiveId})`);
    console.log(`- Performance Component: ${kpi.performanceComponent?.name} (${kpi.performanceComponentId})`);
    console.log(`- Org Unit: ${kpi.orgUnit?.name} (${kpi.orgUnitId})`);
    console.log(`- Org Level: ${kpi.orgUnit?.levelDefinition?.name}`);
    
    // Now trace the performance component chain to see what perspective should be used
    if (kpi.performanceComponentId) {
      console.log('\n🔗 Tracing Performance Component Chain:');
      
      let currentComponentId: string | null = kpi.performanceComponentId;
      let chainDepth = 0;
      const maxDepth = 10;
      
      while (currentComponentId && chainDepth < maxDepth) {
        chainDepth++;
        console.log(`\n--- Chain Level ${chainDepth} ---`);
        
        const component = await prisma.performanceComponent.findUnique({
          where: { id: currentComponentId }
        });
        
        let sourceKpi = null;
        if (component?.kpiId) {
          sourceKpi = await prisma.kPI.findUnique({
            where: { id: component.kpiId },
            include: {
              perspective: true,
              orgUnit: {
                include: {
                  levelDefinition: true
                }
              }
            }
          });
        }
        
        if (!component) {
          console.log('❌ Component not found, stopping chain');
          break;
        }
        
        console.log(`Component: ${component.name} (${component.id})`);
        console.log(`Component Type: ${component.componentType}`);
        console.log(`Org Level: ${component.organizationalLevel}`);
        
        if (sourceKpi) {
          console.log(`Source KPI: ${sourceKpi.name} (${component.kpiId})`);
          console.log(`Source KPI Perspective: ${sourceKpi.perspective?.name} (${sourceKpi.perspectiveId})`);
          console.log(`Source KPI Org Unit: ${sourceKpi.orgUnit?.name} (${sourceKpi.orgUnitId})`);
          console.log(`Source KPI Org Level: ${sourceKpi.orgUnit?.levelDefinition?.name}`);
          
          // If the source KPI has no performance component, it's the root
          if (!sourceKpi.performanceComponentId) {
            console.log('\n🎯 FOUND ROOT KPI - This should be the perspective source!');
            console.log(`Root KPI Perspective: ${sourceKpi.perspective?.name} (${sourceKpi.perspectiveId})`);
            break;
          } else {
            console.log(`Source KPI has performance component: ${sourceKpi.performanceComponentId}, continuing chain...`);
            currentComponentId = sourceKpi.performanceComponentId;
          }
        } else {
          console.log('❌ No source KPI found, stopping chain');
          break;
        }
      }
      
      if (chainDepth >= maxDepth) {
        console.log('⚠️ Maximum chain depth reached, potential circular reference');
      }
    } else {
      console.log('ℹ️ No performance component, this might be a root organizational KPI');
    }
    
    // Test our new perspective resolution endpoint logic manually
    console.log('\n🧪 Testing New Perspective Resolution Logic:');
    
    if (kpi.performanceComponentId) {
      let currentComponentId: string | null = kpi.performanceComponentId;
      let chainDepth = 0;
      const maxDepth = 10;
      
      while (currentComponentId && chainDepth < maxDepth) {
        chainDepth++;
        
        const component = await prisma.performanceComponent.findUnique({
          where: { id: currentComponentId }
        });
        
        if (!component?.kpiId) break;
        
        const sourceKpi = await prisma.kPI.findUnique({
          where: { id: component.kpiId }
        });
        
        if (!sourceKpi) break;
        
        // If this KPI has no performance component, it's the root
        if (!sourceKpi.performanceComponentId) {
          console.log(`✅ Found root KPI: ${sourceKpi.id}`);
          console.log(`✅ Root KPI perspective: ${sourceKpi.perspectiveId}`);
          
          // Get perspective name
          const perspective = await prisma.fiscalYearPerspective.findUnique({
            where: { id: sourceKpi.perspectiveId! }
          });
          
          console.log(`✅ Expected perspective: ${perspective?.name} (${sourceKpi.perspectiveId})`);
          console.log(`❌ Current perspective: ${kpi.perspective?.name} (${kpi.perspectiveId})`);
          
          if (sourceKpi.perspectiveId === kpi.perspectiveId) {
            console.log('✅ MATCH: Perspective is correct');
          } else {
            console.log('❌ MISMATCH: Perspective should be updated');
          }
          break;
        }
        
        currentComponentId = sourceKpi.performanceComponentId;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSpecificKPIPerspective();