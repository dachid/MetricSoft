import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApiQuery() {
  try {
    // Simulate what the API does when called with levelId and componentType=EXIT
    const demoOrg = await prisma.orgUnit.findFirst({
      where: { name: 'Demo Organization' },
      include: { levelDefinition: true }
    });
    
    if (!demoOrg) {
      console.log('Demo Organization not found');
      return;
    }
    
    console.log('Demo Org Level ID:', demoOrg.levelDefinition?.id);
    console.log('Demo Org Level Name:', demoOrg.levelDefinition?.name);
    
    // Get the org level (what the API does)
    const orgLevel = await prisma.fiscalYearLevelDefinition.findUnique({
      where: { id: demoOrg.levelDefinition?.id }
    });
    
    console.log('Found org level:', orgLevel?.name);
    
    // Query performance components (what the API does)
    const components = await prisma.performanceComponent.findMany({
      where: {
        tenantId: demoOrg.tenantId,
        organizationalLevel: orgLevel?.name || '', // Should now be "Organization"
        componentType: 'EXIT'
      },
      orderBy: [{ name: 'asc' }]
    });

    console.log(`\n🔍 Query results (what API would return):`);
    console.log(`Found ${components.length} EXIT components at "${orgLevel?.name}" level:`);
    
    const transformedComponents = components.map(comp => ({
      id: comp.id,
      componentName: comp.name,
      componentType: comp.componentType,
      organizationalLevel: comp.organizationalLevel
    }));
    
    console.log(JSON.stringify(transformedComponents, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiQuery();
