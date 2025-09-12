async function testKPIEndpoint() {
  try {
    // First, let me check what we have in the database for user session
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true
      }
    });
    
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) | Tenant: ${user.tenantId}`);
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testKPIEndpoint();
