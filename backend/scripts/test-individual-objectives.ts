import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIndividualObjectives() {
  try {
    console.log('🔍 Testing individual objectives flow...');
    
    // 1. First, let's check if there are any existing individual objectives (orgUnitId = null)
    const existingIndividualObjectives = await prisma.kPIObjective.findMany({
      where: {
        orgUnitId: null
      },
      select: {
        id: true,
        name: true,
        orgUnitId: true,
        createdById: true,
        createdBy: {
          select: {
            email: true
          }
        }
      }
    });
    
    console.log('📊 Existing individual objectives (orgUnitId = null):', existingIndividualObjectives.length);
    if (existingIndividualObjectives.length > 0) {
      console.log('Sample individual objectives:');
      existingIndividualObjectives.slice(0, 3).forEach(obj => {
        console.log(`  - ${obj.name} (ID: ${obj.id}, createdBy: ${obj.createdBy.email})`);
      });
    }
    
    // 2. Check objectives that have orgUnitId (organizational objectives)
    const organizationalObjectives = await prisma.kPIObjective.findMany({
      where: {
        orgUnitId: { not: null }
      },
      select: {
        id: true,
        name: true,
        orgUnitId: true,
        createdById: true,
        orgUnit: {
          select: {
            name: true
          }
        },
        createdBy: {
          select: {
            email: true
          }
        }
      },
      take: 5
    });
    
    console.log('📊 Organizational objectives (with orgUnitId):', organizationalObjectives.length);
    if (organizationalObjectives.length > 0) {
      console.log('Sample organizational objectives:');
      organizationalObjectives.forEach(obj => {
        console.log(`  - ${obj.name} (createdBy: ${obj.createdBy.email}, orgUnit: ${obj.orgUnit?.name})`);
      });
    }
    
    // 3. Test the individual objectives API logic
    const testUserId = existingIndividualObjectives[0]?.createdById || 
                       organizationalObjectives[0]?.createdById;
    
    if (testUserId) {
      console.log(`\n🔍 Testing individual objectives filter for user: ${testUserId}`);
      
      const userIndividualObjectives = await prisma.kPIObjective.findMany({
        where: {
          orgUnitId: null,
          createdById: testUserId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true
        }
      });
      
      console.log(`📊 Individual objectives for user ${testUserId}:`, userIndividualObjectives.length);
      userIndividualObjectives.forEach(obj => {
        console.log(`  - ${obj.name}`);
      });
    }
    
    console.log('\n✅ Individual objectives test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing individual objectives:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndividualObjectives();