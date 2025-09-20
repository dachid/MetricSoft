import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRecentKPIs() {
  try {
    console.log('🔍 Finding recent KPIs...');
    
    // Get the most recent KPIs created
    const recentKPIs = await prisma.kPI.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
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
    
    console.log(`\n📊 Found ${recentKPIs.length} recent KPIs:`);
    
    recentKPIs.forEach((kpi, index) => {
      console.log(`\n${index + 1}. KPI: ${kpi.name} (${kpi.id})`);
      console.log(`   Created: ${kpi.createdAt.toISOString()}`);
      console.log(`   Perspective: ${kpi.perspective?.name} (${kpi.perspectiveId})`);
      console.log(`   Performance Component: ${kpi.performanceComponent?.name || 'None'} (${kpi.performanceComponentId || 'None'})`);
      console.log(`   Org Unit: ${kpi.orgUnit?.name || 'None'} (${kpi.orgUnitId || 'None'})`);
      console.log(`   Org Level: ${kpi.orgUnit?.levelDefinition?.name || 'None'}`);
    });
    
    // If user provided ID doesn't exist, let's find KPIs that might match the pattern
    console.log('\n🔍 Looking for KPIs with similar IDs...');
    const kpisWithSimilarId = await prisma.kPI.findMany({
      where: {
        id: {
          contains: 'cmfi1vc42'
        }
      },
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
    
    if (kpisWithSimilarId.length > 0) {
      console.log(`\n📊 Found ${kpisWithSimilarId.length} KPIs with similar IDs:`);
      kpisWithSimilarId.forEach((kpi, index) => {
        console.log(`\n${index + 1}. KPI: ${kpi.name} (${kpi.id})`);
        console.log(`   Perspective: ${kpi.perspective?.name} (${kpi.perspectiveId})`);
        console.log(`   Performance Component: ${kpi.performanceComponent?.name || 'None'} (${kpi.performanceComponentId || 'None'})`);
      });
    } else {
      console.log('No KPIs found with similar IDs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findRecentKPIs();