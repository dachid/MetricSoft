import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrganizationalLevels() {
  try {
    // Update all performance components that have "Demo Organization" as organizationalLevel
    const result = await prisma.performanceComponent.updateMany({
      where: { organizationalLevel: 'Demo Organization' },
      data: { organizationalLevel: 'Organization' }
    });
    
    console.log(`✅ Fixed ${result.count} performance components`);
    console.log('Changed organizationalLevel from "Demo Organization" to "Organization"');
    
    // Verify the fix
    const fixedComponents = await prisma.performanceComponent.findMany({
      where: { organizationalLevel: 'Organization' }
    });
    
    console.log(`\n📊 Performance components with correct organizationalLevel: ${fixedComponents.length}`);
    fixedComponents.forEach(comp => {
      console.log(`  - ${comp.name} (organizationalLevel: ${comp.organizationalLevel})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrganizationalLevels();
