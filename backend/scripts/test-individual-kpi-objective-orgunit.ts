import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testIndividualKPIObjectiveOrgUnit() {
  try {
    console.log('🔍 Testing orgUnitId for individual KPI objectives...\n');
    
    // Find individual KPIs and their objectives
    const individualKPIs = await (prisma as any).kPI.findMany({
      where: {
        orgUnitId: null  // Individual KPIs have null orgUnitId
      },
      include: {
        objective: true
      }
    });
    
    console.log(`📊 Found ${individualKPIs.length} individual KPIs (orgUnitId = null):\n`);
    
    for (const kpi of individualKPIs) {
      console.log(`--- Individual KPI: ${kpi.name} (${kpi.id}) ---`);
      console.log(`KPI orgUnitId: ${kpi.orgUnitId || 'null'}`);
      
      if (kpi.objective) {
        console.log(`Objective: ${kpi.objective.name} (${kpi.objective.id})`);
        console.log(`Objective orgUnitId: ${kpi.objective.orgUnitId}`);
        
        // Get the org unit details
        if (kpi.objective.orgUnitId) {
          const orgUnit = await prisma.orgUnit.findUnique({
            where: { id: kpi.objective.orgUnitId },
            include: {
              levelDefinition: true
            }
          });
          
          if (orgUnit) {
            console.log(`Objective's Org Unit: ${orgUnit.name} (Level: ${orgUnit.levelDefinition?.name})`);
            
            // Check if this is a department or individual unit
            if (orgUnit.levelDefinition?.name === 'Individual') {
              console.log('✅ CORRECT: Objective is linked to individual unit');
            } else {
              console.log('❌ INCORRECT: Objective is linked to department/org unit, not individual');
            }
          }
        } else {
          console.log('❌ ISSUE: Objective has null orgUnitId');
        }
      } else {
        console.log('No objective linked to this KPI');
      }
      console.log('');
    }
    
    // Also check all objectives that might be from individual KPIs
    console.log('\n🔍 Checking all objectives that might be from individual KPIs...\n');
    
    const allObjectives = await (prisma as any).kPIObjective.findMany({
      where: {
        isActive: true
      },
      include: {
        orgUnit: {
          include: {
            levelDefinition: true
          }
        }
      }
    });
    
    // Filter for objectives that look like they're from individual KPIs
    const suspiciousObjectives = allObjectives.filter((obj: any) => 
      obj.name.toLowerCase().includes('individual') || 
      obj.name.toLowerCase().includes('contributor')
    );
    
    console.log(`📋 Found ${suspiciousObjectives.length} objectives with "individual" or "contributor" in name:\n`);
    
    suspiciousObjectives.forEach((obj: any) => {
      console.log(`--- ${obj.name} (${obj.id}) ---`);
      console.log(`Objective orgUnitId: ${obj.orgUnitId}`);
      console.log(`Org Unit: ${obj.orgUnit?.name} (Level: ${obj.orgUnit?.levelDefinition?.name})`);
      
      if (obj.orgUnit?.levelDefinition?.name === 'Individual') {
        console.log('✅ CORRECT: Linked to individual unit');
      } else if (obj.orgUnit?.levelDefinition?.name === 'Department') {
        console.log('❌ INCORRECT: Individual objective linked to department!');
      } else {
        console.log(`⚠️  UNKNOWN: Linked to ${obj.orgUnit?.levelDefinition?.name} level`);
      }
      console.log('');
    });
    
    // Find the specific case - check if any individual KPIs have objectives linked to departments
    console.log('\n🚨 CRITICAL CHECK: Individual KPIs with department-level objectives:\n');
    
    const problematicCases = await prisma.$queryRaw`
      SELECT 
        k.id as kpi_id,
        k.name as kpi_name,
        k."orgUnitId" as kpi_org_unit_id,
        o.id as objective_id,
        o.name as objective_name,
        o."orgUnitId" as objective_org_unit_id,
        ou.name as objective_org_unit_name,
        ld.name as objective_org_level
      FROM kpis k
      LEFT JOIN kpi_objectives o ON k."objectiveId" = o.id
      LEFT JOIN org_units ou ON o."orgUnitId" = ou.id
      LEFT JOIN fiscal_year_level_definitions ld ON ou."levelDefinitionId" = ld.id
      WHERE k."orgUnitId" IS NULL  -- Individual KPIs
      AND o."orgUnitId" IS NOT NULL  -- Have objectives
      AND ld.name != 'Individual'  -- But objective is NOT at individual level
    `;
    
    if ((problematicCases as any[]).length > 0) {
      console.log('❌ FOUND PROBLEMATIC CASES:');
      (problematicCases as any[]).forEach((case_: any) => {
        console.log(`  KPI: ${case_.kpi_name} (${case_.kpi_id})`);
        console.log(`    Objective: ${case_.objective_name} (${case_.objective_id})`);
        console.log(`    Objective linked to: ${case_.objective_org_unit_name} (${case_.objective_org_level} level)`);
        console.log(`    ❌ This should be linked to an Individual level unit, not ${case_.objective_org_level}!`);
        console.log('');
      });
    } else {
      console.log('✅ No problematic cases found - all individual KPI objectives are properly scoped');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndividualKPIObjectiveOrgUnit();