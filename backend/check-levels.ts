import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLevels() {
  try {
    const demoOrg = await prisma.orgUnit.findFirst({
      where: { name: 'Demo Organization' },
      include: { levelDefinition: true }
    });
    
    console.log('Demo Organization level:', {
      unitName: demoOrg?.name,
      levelName: demoOrg?.levelDefinition?.name,
      levelCode: demoOrg?.levelDefinition?.code
    });
    
    // Check current performance components with wrong organizationalLevel
    const wrongComponents = await prisma.performanceComponent.findMany({
      where: { organizationalLevel: 'Demo Organization' }
    });
    
    console.log('Components with wrong organizationalLevel:', wrongComponents.length);
    wrongComponents.forEach(comp => {
      console.log(`  - ${comp.name} (should be "Organization" not "Demo Organization")`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLevels();
