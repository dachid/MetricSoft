const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ ok: res.statusCode < 400, status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ ok: res.statusCode < 400, status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testPerspectiveResolution() {
  const baseUrl = 'http://localhost:5000';
  const tenantId = 'cmfi1vc420003bsrgn3yhv2q4';
  const kpiId = 'cmfs0vnex001xbsq88yumidkp';
  
  // Get session cookies from your browser:
  // 1. Open browser dev tools (F12)
  // 2. Go to Application > Storage > Cookies > http://localhost:5000
  // 3. Copy the session and csrf-token values
  // 4. Replace the values below:
  
  const sessionCookie = 'Q0N54MTkjAQBVx2nGqlNW3r_7BCkkpFUxqO8xmdksvI'; // Replace with your session value
  const csrfToken = 'D4h6tvqGZHTa5RbQz_HtxBer175pFUjd'; // Replace with your csrf-token value
  
  const cookies = `session=${sessionCookie}; csrf-token=${csrfToken}`;
  
  try {
    // Step 1: Get KPI details
    console.log('🔍 Step 1: Getting KPI details...');
    const kpiResponse = await makeRequest(`${baseUrl}/api/kpis/${kpiId}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'csrf': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!kpiResponse.ok) {
      console.error('❌ Failed to get KPI details:', kpiResponse.status);
      console.error('Error details:', kpiResponse.data);
      return;
    }
    
    const kpiData = kpiResponse.data;
    console.log('KPI Data:', JSON.stringify(kpiData, null, 2));
    
    // Step 2: Determine orgUnitId for perspective resolution
    let orgUnitIdForPerspective = null;
    
    if (kpiData.orgUnitId) {
      // Organizational KPI
      orgUnitIdForPerspective = kpiData.orgUnitId;
      console.log('\n📍 Organizational KPI detected, using orgUnitId:', orgUnitIdForPerspective);
    } else if (kpiData.performanceComponentId) {
      // Individual KPI - need to get performance component's orgUnitId
      console.log('\n📍 Individual KPI detected, getting performance component details...');
      console.log('Performance Component ID:', kpiData.performanceComponentId);
      
      // For individual KPIs, we need to query the performance component
      // Let's try a direct database approach or use available endpoints
      console.log('Need to get performance component orgUnitId for:', kpiData.performanceComponentId);
      
      // Try getting tenant performance components
      const perfCompResponse = await makeRequest(`${baseUrl}/api/tenants/${tenantId}/fiscal-years/${kpiData.fiscalYearId}/performance-components`, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'csrf': csrfToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (perfCompResponse.ok) {
        const perfCompListData = await perfCompResponse.json();
        console.log('Performance Components available:', perfCompListData.data?.length || 0);
        
        // Find the specific performance component
        const targetComponent = perfCompListData.data?.find(comp => comp.id === kpiData.performanceComponentId);
        if (targetComponent) {
          orgUnitIdForPerspective = targetComponent.orgUnitId;
          console.log('Found performance component orgUnitId:', orgUnitIdForPerspective);
        }
      } else {
        console.error('❌ Failed to get performance components list');
        return;
      }
    }
    
    if (!orgUnitIdForPerspective) {
      console.error('❌ Could not determine orgUnitId for perspective resolution');
      return;
    }
    
    // Step 3: Call root-perspective endpoint
    console.log('\n🔍 Step 3: Calling root-perspective endpoint...');
    console.log(`URL: ${baseUrl}/api/tenants/${tenantId}/org-units/${orgUnitIdForPerspective}/root-perspective`);
    
    const perspectiveResponse = await makeRequest(`${baseUrl}/api/tenants/${tenantId}/org-units/${orgUnitIdForPerspective}/root-perspective`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'csrf': csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!perspectiveResponse.ok) {
      console.error('❌ Failed to get root perspective:', perspectiveResponse.status);
      console.error('Error details:', perspectiveResponse.data);
      return;
    }
    
    const perspectiveData = perspectiveResponse.data;
    console.log('\n✅ Root Perspective Result:');
    console.log(JSON.stringify(perspectiveData, null, 2));
    
    console.log('\n📊 Summary:');
    console.log(`KPI ID: ${kpiId}`);
    console.log(`KPI Type: ${kpiData.orgUnitId ? 'Organizational' : 'Individual'}`);
    console.log(`Org Unit used for resolution: ${orgUnitIdForPerspective}`);
    console.log(`Resolved Perspective ID: ${perspectiveData.perspectiveId}`);
    console.log(`Perspective Name: ${perspectiveData.perspectiveName}`);
    console.log(`Root Org Unit: ${perspectiveData.rootOrgUnitName} (${perspectiveData.rootOrgUnitId})`);
    
    console.log('\n🔍 This is the perspectiveId that should be used for this KPI:', perspectiveData.perspectiveId);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

console.log('🧪 Testing Perspective Resolution Logic');
console.log('=====================================');
console.log('IMPORTANT: Make sure to update the session and csrf-token values in the script!');
console.log('You can find them in your browser dev tools > Application > Cookies');
console.log('');

// Run the test
testPerspectiveResolution();