const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKpiDetails() {
  try {
    const kpi = await prisma.kPI.findFirst({
      where: {
        parentObjectiveId: null
      },
      include: {
        orgUnit: true,
        fiscalYear: true
      }
    });
    
    console.log('KPI with NULL parentObjectiveId details:', JSON.stringify(kpi, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKpiDetails();
