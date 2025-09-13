// Simple test script to verify the objectives API endpoint
import { apiClient } from '../lib/apiClient';

// Test function to call objectives API
export const testObjectivesAPI = async () => {
  console.log('🧪 Testing objectives API...');
  
  const orgUnitId = 'cmfhw91oy000ubsiksrzzjg7j'; // Demo Organization
  const fiscalYearId = 'cmfhw2j33000ebsiktgyuvanj'; // FY 2025
  
  try {
    const url = `/objectives?orgUnitId=${orgUnitId}&fiscalYearId=${fiscalYearId}`;
    console.log('🧪 Calling URL:', url);
    
    const response = await apiClient.get(url);
    console.log('🧪 Response:', response);
    
    if (response.success) {
      console.log('✅ API call successful');
      console.log('📊 Data received:', response.data);
      console.log('📊 Data type:', typeof response.data);
      console.log('📊 Is array:', Array.isArray(response.data));
      if (Array.isArray(response.data)) {
        console.log('📊 Number of objectives:', response.data.length);
        response.data.forEach((obj: any, index: number) => {
          console.log(`📊 Objective ${index + 1}:`, obj);
        });
      }
    } else {
      console.error('❌ API call failed:', response.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Auto-run test when this file is imported
if (typeof window !== 'undefined') {
  // Only run in browser
  setTimeout(() => {
    testObjectivesAPI();
  }, 1000);
}
