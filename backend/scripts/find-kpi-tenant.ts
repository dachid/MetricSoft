import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findKPITenant() {
  try {
    console.log('🔍 Finding KPI and its tenant...');
    
    const kpi = await prisma.kPI.findUnique({
      where: { id: 'cmfs2b1jn0027bsq8d7yt958r' }
    });
    
    if (!kpi) {
      console.log('❌ KPI not found');
      return;
    }
    
    console.log(`✅ KPI found:`);
    console.log(`   Name: ${kpi.name}`);
    console.log(`   Tenant ID: ${kpi.tenantId}`);
    console.log(`   Org Unit ID: ${kpi.orgUnitId}`);
    console.log(`   Perspective ID: ${kpi.perspectiveId}`);
    console.log(`   Performance Component ID: ${kpi.performanceComponentId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findKPITenant();