import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrganizationalHierarchy() {
  console.log('🔧 Starting organizational hierarchy fix...');
  
  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
      console.log(`\n📋 Processing tenant: ${tenant.name} (${tenant.id})`);
      
      // Get current fiscal year for this tenant (try both CURRENT and ACTIVE)
      let currentFiscalYear = await prisma.fiscalYear.findFirst({
        where: {
          tenantId: tenant.id,
          status: 'CURRENT'
        }
      });
      
      if (!currentFiscalYear) {
        currentFiscalYear = await prisma.fiscalYear.findFirst({
          where: {
            tenantId: tenant.id,
            status: 'ACTIVE'
          }
        });
      }
      
      if (!currentFiscalYear) {
        // Just get any fiscal year for this tenant
        currentFiscalYear = await prisma.fiscalYear.findFirst({
          where: {
            tenantId: tenant.id
          }
        });
      }
      
      if (!currentFiscalYear) {
        console.log(`⚠️  No fiscal year found for tenant ${tenant.name}`);
        continue;
      }
      
      console.log(`✅ Using fiscal year: ${currentFiscalYear.name} (status: ${currentFiscalYear.status})`);
      
      // Get the organization-level unit (should be the parent)
      const organizationUnit = await prisma.orgUnit.findFirst({
        where: {
          tenantId: tenant.id,
          fiscalYearId: currentFiscalYear.id,
          levelDefinition: {
            code: 'ORGANIZATION'
          }
        },
        include: {
          levelDefinition: true
        }
      });
      
      if (!organizationUnit) {
        console.log(`⚠️  No organization unit found for tenant ${tenant.name}`);
        continue;
      }
      
      console.log(`✅ Found organization unit: ${organizationUnit.name}`);
      
      // Get all department-level units that don't have a parent
      const departmentUnits = await prisma.orgUnit.findMany({
        where: {
          tenantId: tenant.id,
          fiscalYearId: currentFiscalYear.id,
          parentId: null,
          levelDefinition: {
            code: 'DEPARTMENT'
          }
        },
        include: {
          levelDefinition: true
        }
      });
      
      console.log(`📁 Found ${departmentUnits.length} department units without parents`);
      
      // Update each department to have the organization as parent
      for (const dept of departmentUnits) {
        await prisma.orgUnit.update({
          where: { id: dept.id },
          data: { parentId: organizationUnit.id }
        });
        console.log(`  ✅ Updated ${dept.name} -> parent: ${organizationUnit.name}`);
      }
      
      // Also fix any team-level units that should be under departments
      const teamUnits = await prisma.orgUnit.findMany({
        where: {
          tenantId: tenant.id,
          fiscalYearId: currentFiscalYear.id,
          parentId: null,
          levelDefinition: {
            code: 'TEAM'
          }
        },
        include: {
          levelDefinition: true
        }
      });
      
      if (teamUnits.length > 0) {
        console.log(`👥 Found ${teamUnits.length} team units without parents`);
        
        // For now, assign teams to the first department (or organization if no departments)
        const firstDept = departmentUnits[0] || organizationUnit;
        
        for (const team of teamUnits) {
          await prisma.orgUnit.update({
            where: { id: team.id },
            data: { parentId: firstDept.id }
          });
          console.log(`  ✅ Updated ${team.name} -> parent: ${firstDept.name}`);
        }
      }
    }
    
    console.log('\n🎉 Organizational hierarchy fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing organizational hierarchy:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixOrganizationalHierarchy()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
