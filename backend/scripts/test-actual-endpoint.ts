import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testActualEndpoint() {
  try {
    console.log('🔍 Testing the actual new perspective resolution endpoint...');
    
    const tenantId = 'cmfi1vc420003bsrgn3yhv2q4';
    const kpiId = 'cmfs2b1jn0027bsq8d7yt958r';
    
    // Make a request to our new endpoint
    const response = await fetch(`http://localhost:3000/api/tenants/${tenantId}/kpis/${kpiId}/perspective`);
    
    if (!response.ok) {
      console.log(`❌ Endpoint failed: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Endpoint response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
  }
}

testActualEndpoint();