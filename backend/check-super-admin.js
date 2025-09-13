const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'daveed_8@yahoo.com' },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });
    
    console.log('Super Admin User:', JSON.stringify(user, null, 2));
    
    if (user && user.roles.length > 0) {
      console.log('\nUser roles:');
      user.roles.forEach(userRole => {
        console.log(`- ${userRole.role.name} (${userRole.role.code})`);
      });
    } else {
      console.log('\nNo roles found for user!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();
