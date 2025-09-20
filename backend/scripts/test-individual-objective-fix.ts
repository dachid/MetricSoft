import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIndividualObjectiveFix() {
  try {
    console.log('🔍 Testing the individual objective fix...\n');
    
    // Get a sample user
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
    
    // Check existing objectives with this user's ID as orgUnitId
    const existingUserObjectives = await (prisma as any).kPIObjective.findMany({
      where: {
        orgUnitId: user.id
      }
    });
    
    console.log(`📋 Existing objectives with user ID as orgUnitId: ${existingUserObjectives.length}`);
    existingUserObjectives.forEach((obj: any, index: number) => {
      console.log(`  ${index + 1}. ${obj.name} (${obj.id})`);
    });
    
    // Check what objectives currently exist with department IDs (the problematic ones)
    const problematicObjectives = await prisma.$queryRaw`
      SELECT 
        o.id as objective_id,
        o.name as objective_name,
        o."orgUnitId" as objective_org_unit_id,
        ou.name as org_unit_name,
        ld.name as org_level,
        k.id as kpi_id,
        k.name as kpi_name
      FROM kpi_objectives o
      LEFT JOIN org_units ou ON o."orgUnitId" = ou.id
      LEFT JOIN fiscal_year_level_definitions ld ON ou."levelDefinitionId" = ld.id
      LEFT JOIN kpis k ON k."objectiveId" = o.id
      WHERE k."orgUnitId" IS NULL  -- Individual KPIs
      AND o."orgUnitId" IS NOT NULL  -- Have objectives
      AND ld.name != 'Individual'  -- But objective is NOT at individual level
      AND (o.name LIKE '%individual%' OR o.name LIKE '%contributor%')
    `;
    
    console.log(`\n🚨 Problematic objectives that should be fixed:`);
    if ((problematicObjectives as any[]).length > 0) {
      (problematicObjectives as any[]).forEach((obj: any) => {
        console.log(`  - ${obj.objective_name} (${obj.objective_id})`);
        console.log(`    Currently linked to: ${obj.org_unit_name} (${obj.org_level})`);
        console.log(`    Used by KPI: ${obj.kpi_name} (${obj.kpi_id})`);
        console.log(`    Should be linked to: User ID instead of department`);
        console.log('');
      });
    } else {
      console.log('  ✅ No problematic objectives found');
    }
    
    // Check what the new behavior should look like
    console.log(`\n✅ NEW BEHAVIOR: When creating individual objectives, they will use:`);
    console.log(`   orgUnitId: ${user.id} (user ID)`);
    console.log(`   This will ensure proper scoping for individual KPIs`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndividualObjectiveFix();