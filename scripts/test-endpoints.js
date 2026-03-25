#!/usr/bin/env node
import http from 'http';

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? (data[0] === '{' ? JSON.parse(data) : data) : null
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testEndpoints() {
  console.log('🔍 Testing server endpoints...\n');

  try {
    // Test health endpoint
    const healthRes = await makeRequest('GET', '/health');
    console.log('Health check:', healthRes.status, healthRes.body);

    // Test auth login (existing endpoint)
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'test@test.com',
      password: 'test'
    });
    console.log('Login endpoint:', loginRes.status);

    // Test forgot password endpoint
    const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {}, {
      email: 'hr@erp.com'
    });
    console.log('Forgot password endpoint:', forgotRes.status, forgotRes.body);

  } catch (e) {
    console.error('❌ Connection error:', e.message);
    console.log('Make sure server is running: npm run dev');
  }
}

testEndpoints();