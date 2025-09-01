import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware to automatically set parent for new organizational units
export async function enforceParentHierarchy(tenantId: string, levelDefinitionId: string, parentId?: string) {
  // If parentId is already provided, return it
  if (parentId) {
    return parentId;
  }

  // Get the level definition to determine hierarchy
  const levelDef = await prisma.fiscalYearLevelDefinition.findUnique({
    where: { id: levelDefinitionId },
    include: { fiscalYear: true }
  });

  if (!levelDef) {
    throw new Error('Invalid level definition');
  }

  // If it's the organization level (hierarchy level 0), no parent needed
  if (levelDef.hierarchyLevel === 0) {
    return undefined;
  }

  // For other levels, try to find a suitable parent
  const fiscalYearId = levelDef.fiscalYearId;

  // Get organization unit (should be the top-level parent)
  const organizationUnit = await prisma.orgUnit.findFirst({
    where: {
      tenantId,
      fiscalYearId,
      levelDefinition: {
        hierarchyLevel: 0 // Organization level
      }
    }
  });

  if (!organizationUnit) {
    console.warn(`No organization unit found for tenant ${tenantId}. Creating unit without parent.`);
    return undefined;
  }

  // For departments (level 1), use organization as parent
  if (levelDef.hierarchyLevel === 1) {
    console.log(`Auto-assigning organization ${organizationUnit.name} as parent for department`);
    return organizationUnit.id;
  }

  // For deeper levels, find the most recent unit at the immediate parent level
  const parentLevel = await prisma.fiscalYearLevelDefinition.findFirst({
    where: {
      fiscalYearId,
      hierarchyLevel: levelDef.hierarchyLevel - 1
    }
  });

  if (parentLevel) {
    const parentUnit = await prisma.orgUnit.findFirst({
      where: {
        tenantId,
        fiscalYearId,
        levelDefinitionId: parentLevel.id
      },
      orderBy: { createdAt: 'desc' } // Get the most recently created parent unit
    });

    if (parentUnit) {
      console.log(`Auto-assigning ${parentUnit.name} as parent for new unit`);
      return parentUnit.id;
    }
  }

  // Fallback to organization unit
  console.log(`Falling back to organization ${organizationUnit.name} as parent`);
  return organizationUnit.id;
}

export default enforceParentHierarchy;
