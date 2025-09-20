const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNullObjectives() {
  try {
    const kpisWithNullObjectives = await prisma.kPI.findMany({
      where: {
        parentObjectiveId: null
      },
      select: {
        id: true,
        name: true,
        parentObjectiveId: true
      }
    });
    
    console.log('KPIs with NULL parentObjectiveId:', kpisWithNullObjectives);
    console.log('Count:', kpisWithNullObjectives.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNullObjectives();
