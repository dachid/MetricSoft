import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIndividualUnits() {
  try {
    console.log('🔍 Testing individual units and user mapping...\n');
    
    // Find all individual-level org units
    const individualUnits = await prisma.orgUnit.findMany({
      where: {
        levelDefinition: {
          name: {
            in: ['Individual', 'Individual Unit', 'Employee']
          }
        }
      },
      include: {
        levelDefinition: true,
        parent: {
          include: {
            levelDefinition: true
          }
        }
      }
    });
    
    console.log(`📊 Found ${individualUnits.length} individual-level org units:\n`);
    
    individualUnits.forEach((unit, index) => {
      console.log(`${index + 1}. ${unit.name} (${unit.id})`);
      console.log(`   Level: ${unit.levelDefinition?.name}`);
      console.log(`   Parent: ${unit.parent?.name} (${unit.parent?.levelDefinition?.name})`);
      console.log('');
    });
    
    // Check if there are users assigned to individual units
    console.log('🔍 Checking user assignments to individual units...\n');
    
    const users = await prisma.user.findMany({
      where: {
        tenantId: 'cmfi1vc420003bsrgn3yhv2q4' // Demo tenant
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`📊 Found ${users.length} users in the tenant:\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    
    // Check if there's any relationship between users and individual org units
    // This might be through assignments, or naming conventions, etc.
    console.log('\n🔍 Looking for user-to-individual-unit mapping patterns...\n');
    
    for (const user of users) {
      // Look for individual units that might belong to this user
      const possibleUserUnits = individualUnits.filter(unit => 
        unit.name.toLowerCase().includes(user.name.toLowerCase()) ||
        unit.name.toLowerCase().includes(user.email.split('@')[0].toLowerCase())
      );
      
      if (possibleUserUnits.length > 0) {
        console.log(`User ${user.name} might be mapped to:`);
        possibleUserUnits.forEach(unit => {
          console.log(`  - ${unit.name} (${unit.id})`);
        });
      } else {
        console.log(`User ${user.name} has no obvious individual unit mapping`);
      }
    }
    
    // Check if there are any KPI champions assigned to individual units
    console.log('\n🔍 Checking KPI champion assignments to individual units...\n');
    
    for (const unit of individualUnits) {
      const champions = await prisma.orgUnitKpiChampion.findMany({
        where: {
          orgUnitId: unit.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (champions.length > 0) {
        console.log(`Individual unit "${unit.name}" has KPI champions:`);
        champions.forEach(champion => {
          console.log(`  - ${champion.user.name} (${champion.user.email})`);
        });
      } else {
        console.log(`Individual unit "${unit.name}" has no KPI champions`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndividualUnits();