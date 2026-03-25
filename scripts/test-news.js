import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testNews() {
  try {
    // Step 1: Login as HR
    console.log('🔐 Logging in as HR...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@erp.com', password: 'Hr@12345678' }),
      credentials: 'include'
    });
    
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.accessToken) {
      console.error('❌ No access token received');
      return;
    }
    
    const token = loginData.accessToken;
    
    // Step 2: Get news
    console.log('\n📰 Getting news...');
    const newsRes = await fetch(`${BASE_URL}/api/news`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('News status:', newsRes.status);
    const newsData = await newsRes.json();
    console.log('News response:', JSON.stringify(newsData, null, 2));
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

testNews();
