import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIndividualObjectivesApproach() {
  try {
    console.log('🔍 Testing the new individual objectives approach...\n');
    
    // Get a test user
    const user = await prisma.user.findFirst({
      where: {
        tenantId: 'cmfi1vc420003bsrgn3yhv2q4'
      }
    });
    
    if (!user) {
      console.log('❌ No user found for testing');
      return;
    }
    
    console.log(`📊 Testing with user: ${user.name} (${user.id})\n`);
    
    // Test the new approach: Create a test individual objective with null orgUnitId
    console.log('🧪 Testing objective creation with null orgUnitId...');
    
    const testObjective = {
      name: 'Test Individual Objective (null orgUnitId)',
      description: 'Testing the new approach',
      orgUnitId: null,  // This should work now
      fiscalYearId: 'cmfi1y7te000tbsrgh6nkfhf8', // Demo fiscal year
      createdById: user.id
    };
    
    console.log('Payload:', testObjective);
    
    // Make API call to test objective creation
    try {
      const response = await fetch('http://localhost:3000/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}` // Simulating auth
        },
        body: JSON.stringify(testObjective)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Objective creation successful:', data);
      } else {
        const error = await response.text();
        console.log('❌ Objective creation failed:', response.status, error);
      }
    } catch (error) {
      console.log('❌ API call failed:', error);
    }
    
    // Test the individual objectives endpoint
    console.log('\n🔍 Testing individual objectives endpoint...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/individual-objectives?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Individual objectives endpoint successful:', data);
      } else {
        const error = await response.text();
        console.log('❌ Individual objectives endpoint failed:', response.status, error);
      }
    } catch (error) {
      console.log('❌ Individual objectives API call failed:', error);
    }
    
    // Check current state of objectives in database
    console.log('\n📊 Current individual objectives in database:');
    
    const individualObjectives = await (prisma as any).kPIObjective.findMany({
      where: {
        orgUnitId: null  // Use null directly, not in a where clause
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`Found ${individualObjectives.length} objectives with null orgUnitId:`);
    individualObjectives.forEach((obj: any, index: number) => {
      console.log(`  ${index + 1}. ${obj.name} (${obj.id})`);
      console.log(`     Created by: ${obj.createdBy?.name || 'Unknown'} (${obj.createdById})`);
      console.log(`     OrgUnitId: ${obj.orgUnitId || 'null'}`);
    });
    
    // Check problematic objectives that should be converted
    console.log('\n🚨 Problematic objectives (should be converted to null orgUnitId):');
    
    const problematicObjectives = await prisma.$queryRaw`
      SELECT 
        o.id as objective_id,
        o.name as objective_name,
        o."orgUnitId" as objective_org_unit_id,
        o."createdById" as created_by_id,
        ou.name as org_unit_name,
        ld.name as org_level,
        k.id as kpi_id,
        k.name as kpi_name
      FROM kpi_objectives o
      LEFT JOIN org_units ou ON o."orgUnitId" = ou.id
      LEFT JOIN fiscal_year_level_definitions ld ON ou."levelDefinitionId" = ld.id
      LEFT JOIN kpis k ON k."objectiveId" = o.id
      WHERE k."orgUnitId" IS NULL  -- Individual KPIs
      AND o."orgUnitId" IS NOT NULL  -- But objective has orgUnitId (should be null)
      AND (o.name LIKE '%individual%' OR o.name LIKE '%contributor%')
    `;
    
    if ((problematicObjectives as any[]).length > 0) {
      console.log(`Found ${(problematicObjectives as any[]).length} objectives that should be converted:`);
      (problematicObjectives as any[]).forEach((obj: any) => {
        console.log(`  - ${obj.objective_name} (${obj.objective_id})`);
        console.log(`    Currently: orgUnitId=${obj.objective_org_unit_id} (${obj.org_unit_name})`);
        console.log(`    Should be: orgUnitId=null, createdById=${obj.created_by_id}`);
      });
    } else {
      console.log('✅ No problematic objectives found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndividualObjectivesApproach();