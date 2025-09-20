const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultObjectiveAndUpdateKpi() {
  try {
    // Get the KPI details
    const kpi = await prisma.kPI.findFirst({
      where: {
        parentObjectiveId: null
      },
      include: {
        orgUnit: true,
        fiscalYear: true,
        createdBy: true
      }
    });
    
    if (!kpi) {
      console.log('No KPI with NULL parentObjectiveId found');
      return;
    }
    
    console.log('Found KPI:', kpi.name, 'in org unit:', kpi.orgUnit.name);
    
    // Check if there's already an objective for this org unit
    let objective = await prisma.kPIObjective.findFirst({
      where: {
        tenantId: kpi.tenantId,
        fiscalYearId: kpi.fiscalYearId,
        orgUnitId: kpi.orgUnitId
      }
    });
    
    if (!objective) {
      // Create a default objective for this org unit
      objective = await prisma.kPIObjective.create({
        data: {
          tenantId: kpi.tenantId,
          fiscalYearId: kpi.fiscalYearId,
          orgUnitId: kpi.orgUnitId,
          name: `${kpi.orgUnit.name} Performance Objectives`,
          description: `Default objectives for ${kpi.orgUnit.name} department`,
          createdById: kpi.createdById
        }
      });
      
      console.log('Created default objective:', objective.name, 'with ID:', objective.id);
    } else {
      console.log('Found existing objective:', objective.name, 'with ID:', objective.id);
    }
    
    // Update the KPI to reference this objective
    await prisma.kPI.update({
      where: {
        id: kpi.id
      },
      data: {
        parentObjectiveId: objective.id
      }
    });
    
    console.log('Updated KPI to reference objective:', objective.id);
    
    // Verify the update
    const updatedKpi = await prisma.kPI.findUnique({
      where: {
        id: kpi.id
      },
      select: {
        id: true,
        name: true,
        parentObjectiveId: true
      }
    });
    
    console.log('Verification - KPI now has parentObjectiveId:', updatedKpi.parentObjectiveId);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultObjectiveAndUpdateKpi();
