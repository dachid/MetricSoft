const fetch = require('node-fetch');

async function testPerspectiveResolution() {
  const baseUrl = 'http://localhost:5000';
  const tenantId = 'cmfi1vc420003bsrgn3yhv2q4';
  const kpiId = 'cmfs0vnex001xbsq88yumidkp';
  
  try {
    // Step 1: Initiate passwordless auth
    console.log('🔍 Step 1: Initiating passwordless authentication...');
    const authInitResponse = await fetch(`${baseUrl}/api/auth/passwordless/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'dacheed@gmail.com'
      })
    });
    
    const authInitData = await authInitResponse.json();
    console.log('Passwordless initiation response:', authInitData);
    
    if (!authInitData.success) {
      console.error('❌ Failed to initiate passwordless auth:', authInitData.error);
      return;
    }
    
    console.log('📧 Please check your email for the magic link and click it, then press Enter to continue...');
    
    // Wait for user to click the magic link
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise(resolve => {
      rl.question('Press Enter after clicking the magic link in your email: ', () => {
        rl.close();
        resolve();
      });
    });
    
    // For now, let's assume you have session cookies from browser. 
    // You can copy them from browser dev tools
    console.log('Please provide session cookies from your browser:');
    console.log('1. Open browser dev tools (F12)');
    console.log('2. Go to Application > Cookies');
    console.log('3. Copy the session cookie value');
    
    // For testing, we'll use a placeholder - you'll need to replace this
    const cookies = 'session=your-session-cookie-here';
    console.log('Using session cookies (replace with actual values)');
    
    // Step 2: Get KPI details
    console.log('\n🔍 Step 2: Getting KPI details...');
    const kpiResponse = await fetch(`${baseUrl}/api/kpis/${kpiId}`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    if (!kpiResponse.ok) {
      console.error('❌ Failed to get KPI details:', kpiResponse.status, kpiResponse.statusText);
      return;
    }
    
    const kpiData = await kpiResponse.json();
    console.log('KPI Data:', JSON.stringify(kpiData, null, 2));
    
    // Step 3: Determine orgUnitId for perspective resolution
    let orgUnitIdForPerspective = null;
    
    if (kpiData.orgUnitId) {
      // Organizational KPI
      orgUnitIdForPerspective = kpiData.orgUnitId;
      console.log('\n📍 Organizational KPI detected, using orgUnitId:', orgUnitIdForPerspective);
    } else if (kpiData.performanceComponentId) {
      // Individual KPI - need to get performance component's orgUnitId
      console.log('\n📍 Individual KPI detected, getting performance component details...');
      
      const perfCompResponse = await fetch(`${baseUrl}/api/performance-components/${kpiData.performanceComponentId}`, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/json'
        }
      });
      
      if (perfCompResponse.ok) {
        const perfCompData = await perfCompResponse.json();
        orgUnitIdForPerspective = perfCompData.orgUnitId;
        console.log('Performance Component orgUnitId:', orgUnitIdForPerspective);
      } else {
        console.error('❌ Failed to get performance component details');
        return;
      }
    }
    
    if (!orgUnitIdForPerspective) {
      console.error('❌ Could not determine orgUnitId for perspective resolution');
      return;
    }
    
    // Step 4: Call root-perspective endpoint
    console.log('\n🔍 Step 4: Calling root-perspective endpoint...');
    const perspectiveResponse = await fetch(`${baseUrl}/api/tenants/${tenantId}/org-units/${orgUnitIdForPerspective}/root-perspective`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    if (!perspectiveResponse.ok) {
      console.error('❌ Failed to get root perspective:', perspectiveResponse.status, perspectiveResponse.statusText);
      const errorText = await perspectiveResponse.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const perspectiveData = await perspectiveResponse.json();
    console.log('\n✅ Root Perspective Result:');
    console.log(JSON.stringify(perspectiveData, null, 2));
    
    console.log('\n📊 Summary:');
    console.log(`KPI ID: ${kpiId}`);
    console.log(`Org Unit used for resolution: ${orgUnitIdForPerspective}`);
    console.log(`Resolved Perspective ID: ${perspectiveData.perspectiveId}`);
    console.log(`Perspective Name: ${perspectiveData.perspectiveName}`);
    console.log(`Root Org Unit: ${perspectiveData.rootOrgUnitName} (${perspectiveData.rootOrgUnitId})`);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testPerspectiveResolution();