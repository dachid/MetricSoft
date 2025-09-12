const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKPIs() {
  try {
    const kpis = await prisma.kPI.findMany({
      select: {
        id: true,
        name: true,
        orgUnitId: true,
        tenantId: true,
        fiscalYearId: true,
        createdById: true,
        evaluatorId: true,
        isActive: true,
        createdAt: true,
        orgUnit: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        fiscalYear: {
          select: {
            id: true,
            name: true,
            isCurrent: true
          }
        }
      }
    });
    
    console.log('Found', kpis.length, 'KPIs');
    kpis.forEach(kpi => {
      console.log('KPI:', kpi.name);
      console.log('  - OrgUnit ID:', kpi.orgUnitId, '| OrgUnit Name:', kpi.orgUnit?.name || 'NULL');
      console.log('  - Fiscal Year ID:', kpi.fiscalYearId, '| Fiscal Year:', kpi.fiscalYear?.name || 'NULL', '| Current:', kpi.fiscalYear?.isCurrent);
      console.log('  - Tenant ID:', kpi.tenantId);
      console.log('  - Created By:', kpi.createdById);
      console.log('  - Evaluator:', kpi.evaluatorId);
      console.log('  - Active:', kpi.isActive);
      console.log('---');
    });
    
    // Also check org units with KPI champions
    const orgUnits = await prisma.orgUnit.findMany({
      include: {
        kpiChampions: {
          include: {
            user: true
          }
        },
        levelDefinition: true
      }
    });
    
    console.log('\nFound', orgUnits.length, 'Org Units with champions:');
    orgUnits.forEach(unit => {
      console.log('OrgUnit:', unit.name, '| ID:', unit.id, '| Champions:', unit.kpiChampions.length);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKPIs();
