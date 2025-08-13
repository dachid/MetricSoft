import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDefaultFiscalYear() {
  try {
    console.log('🗓️ Creating default fiscal year for admin tenant...');
    
    // Find the admin tenant
    const adminTenant = await prisma.tenant.findUnique({
      where: { subdomain: 'metricsoft-admin' }
    });

    if (!adminTenant) {
      console.log('❌ Admin tenant not found');
      return;
    }

    // Check if fiscal year already exists
    const existingFY = await prisma.fiscalYear.findFirst({
      where: { tenantId: adminTenant.id }
    });

    if (existingFY) {
      console.log('✅ Fiscal year already exists:', existingFY.name);
      return;
    }

    // Create fiscal year
    const fiscalYear = await prisma.fiscalYear.create({
      data: {
        tenantId: adminTenant.id,
        name: 'FY 2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        status: 'active',
        isCurrent: true
      }
    });

    // Create standard level definitions
    const levelDefinitions = [
      {
        code: 'ORGANIZATION',
        name: 'Organization',
        pluralName: 'Organizations',
        hierarchyLevel: 0,
        isStandard: true,
        isEnabled: true,
        icon: '🏢',
        color: '#1F2937'
      },
      {
        code: 'DEPARTMENT',
        name: 'Department',
        pluralName: 'Departments',
        hierarchyLevel: 1,
        isStandard: true,
        isEnabled: true,
        icon: '🏬',
        color: '#374151'
      },
      {
        code: 'TEAM',
        name: 'Team',
        pluralName: 'Teams',
        hierarchyLevel: 2,
        isStandard: true,
        isEnabled: true,
        icon: '👥',
        color: '#4B5563'
      },
      {
        code: 'INDIVIDUAL',
        name: 'Individual',
        pluralName: 'Individuals',
        hierarchyLevel: 3,
        isStandard: true,
        isEnabled: true,
        icon: '👤',
        color: '#6B7280'
      }
    ];

    for (const levelDef of levelDefinitions) {
      await prisma.fiscalYearLevelDefinition.create({
        data: {
          fiscalYearId: fiscalYear.id,
          ...levelDef
        }
      });
    }

    console.log('✅ Default fiscal year and org structure created:');
    console.log('   Fiscal Year:', fiscalYear.name);
    console.log('   Period:', fiscalYear.startDate.toISOString().split('T')[0], 'to', fiscalYear.endDate.toISOString().split('T')[0]);
    console.log('   Org Levels:', levelDefinitions.length, 'levels created');

  } catch (error) {
    console.error('❌ Error creating default fiscal year:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultFiscalYear();
