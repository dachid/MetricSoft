import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPerformanceComponents() {
  try {
    // Get the first tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Please create a tenant first.');
      return;
    }

    console.log(`Seeding performance components for tenant: ${tenant.name}`);

    // Individual Level Components
    const individualComponents = [
      {
        name: 'Individual Productivity',
        description: 'Measures individual output and efficiency',
        organizationalLevel: 'INDIVIDUAL',
        weight: 1.0,
      },
      {
        name: 'Skill Development',
        description: 'Tracks learning and professional growth',
        organizationalLevel: 'INDIVIDUAL',
        weight: 0.8,
      },
      {
        name: 'Quality of Work',
        description: 'Measures accuracy and attention to detail',
        organizationalLevel: 'INDIVIDUAL',
        weight: 1.2,
      },
    ];

    // Organizational Level Components
    const organizationalComponents = [
      {
        name: 'Team Performance',
        description: 'Overall team productivity and collaboration',
        organizationalLevel: 'ORGANIZATIONAL',
        weight: 1.5,
      },
      {
        name: 'Revenue Growth',
        description: 'Financial performance and growth metrics',
        organizationalLevel: 'ORGANIZATIONAL',
        weight: 2.0,
      },
      {
        name: 'Customer Satisfaction',
        description: 'Client feedback and satisfaction scores',
        organizationalLevel: 'ORGANIZATIONAL',
        weight: 1.3,
      },
    ];

    // Create individual components
    for (const component of individualComponents) {
      await prisma.performanceComponent.upsert({
        where: {
          tenantId_name_organizationalLevel: {
            tenantId: tenant.id,
            name: component.name,
            organizationalLevel: component.organizationalLevel,
          },
        },
        update: component,
        create: {
          ...component,
          tenantId: tenant.id,
        },
      });
    }

    // Create organizational components
    for (const component of organizationalComponents) {
      await prisma.performanceComponent.upsert({
        where: {
          tenantId_name_organizationalLevel: {
            tenantId: tenant.id,
            name: component.name,
            organizationalLevel: component.organizationalLevel,
          },
        },
        update: component,
        create: {
          ...component,
          tenantId: tenant.id,
        },
      });
    }

    console.log('Performance components seeded successfully!');
  } catch (error) {
    console.error('Error seeding performance components:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPerformanceComponents();
