#!/usr/bin/env node
import http from 'http';

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  try {
    console.log('🔐 Step 1: Login as HR...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'hr@erp.com',
      password: 'Hr@12345678'
    });
    console.log('Status:', loginRes.status);
    console.log('Response:', JSON.stringify(loginRes.body, null, 2));
    
    if (loginRes.status !== 200 || !loginRes.body?.accessToken) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginRes.body.accessToken;
    console.log('✅ Got token:', token.substring(0, 20) + '...');

    console.log('\n📰 Step 2: Get news...');
    const newsRes = await makeRequest('GET', '/api/news', {
      'Authorization': `Bearer ${token}`
    });
    console.log('Status:', newsRes.status);
    console.log('Response:', JSON.stringify(newsRes.body, null, 2));

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

test();
