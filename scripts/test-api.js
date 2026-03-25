// Test API endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function test() {
  try {
    // Test health endpoint
   const res = await fetch(`${BASE_URL}/health`);
    console.log('Health check:', res.status);
    
    // Test dashboard endpoint (should return 401 without auth)
    const dashRes = await fetch(`${BASE_URL}/api/dashboard/stats`);
    console.log('Dashboard stats:', dashRes.status);
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
