import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkOrgStructure() {
  const productDept = await prisma.orgUnit.findFirst({
    where: { id: 'cmfhwbm7n000ybsik0aep2mdr' },
    include: { 
      levelDefinition: true,
      parent: {
        include: {
          levelDefinition: true
        }
      }
    }
  });
  
  console.log('Product Department:', {
    id: productDept?.id,
    name: productDept?.name,
    levelName: productDept?.levelDefinition?.name,
    levelId: productDept?.levelDefinition?.id,
    parentId: productDept?.parentId,
    parentName: productDept?.parent?.name,
    parentLevelName: productDept?.parent?.levelDefinition?.name,
    parentLevelId: productDept?.parent?.levelDefinition?.id
  });
  
  await prisma.$disconnect();
}

checkOrgStructure();
