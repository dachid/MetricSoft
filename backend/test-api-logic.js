const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPILogic() {
  try {
    // Simulate the exact query from the API
    const userId = 'cmei9r673000mbs7gaal32d9i'; // Dacheed Master
    const tenantId = 'cmei9nvsl0002bs7gjipnkn5a';
    const fiscalYearId = 'cmei9orgn000cbs7g1tj1ubuy'; // FY 2025
    
    console.log('Testing API logic with:');
    console.log('- User ID:', userId);
    console.log('- Tenant ID:', tenantId);
    console.log('- Fiscal Year ID:', fiscalYearId);
    console.log('');
    
    // Base query for KPIs (from the API)
    const baseWhere = {
      tenantId: tenantId,
      isActive: true,
    };

    // Add fiscal year filter
    baseWhere.fiscalYearId = fiscalYearId;

    console.log('Base where clause:', baseWhere);
    console.log('');

    // Get KPIs created by or assigned to the user (exact API logic)
    const kpis = await prisma.kPI.findMany({
      where: {
        ...baseWhere,
        OR: [
          { createdById: userId },
          { evaluatorId: userId }
        ]
      },
      include: {
        target: true,
        perspective: true,
        parentObjective: true,
        evaluator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orgUnit: {
          include: {
            levelDefinition: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('API Query Result:');
    console.log('- Found KPIs:', kpis.length);
    kpis.forEach(kpi => {
      console.log(`  - ${kpi.name} | Created by: ${kpi.createdBy?.name} | Evaluator: ${kpi.evaluator?.name}`);
    });
    
    // Let's also test individual conditions
    console.log('\nTesting individual conditions:');
    
    const kpisByCreator = await prisma.kPI.findMany({
      where: {
        ...baseWhere,
        createdById: userId
      }
    });
    console.log('KPIs created by user:', kpisByCreator.length);
    
    const kpisByEvaluator = await prisma.kPI.findMany({
      where: {
        ...baseWhere,
        evaluatorId: userId
      }
    });
    console.log('KPIs evaluated by user:', kpisByEvaluator.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPILogic();
