#!/usr/bin/env node
import http from 'http';

const BASE_URL = 'http://localhost:5000';

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

async function test() {
  const start = Date.now();
  try {
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'hr@erp.com',
      password: 'Hr@12345678'
    });
    
    if (loginRes.status !== 200 || !loginRes.body?.accessToken) {
      console.error('❌ Login failed');
      return;
    }

    const token = loginRes.body.accessToken;
    const auth = { 'Authorization': `Bearer ${token}` };

    const [createRes, newsRes] = await Promise.all([
      makeRequest('POST', '/api/news', auth, {
        title: 'Welcome to HR Portal',
        body: 'This is an important announcement for all employees.',
        isPolicyUpdate: false
      }),
      makeRequest('GET', '/api/news', auth)
    ]);

    console.log(`✅ Tests completed in ${Date.now() - start}ms`);
    console.log('Create:', createRes.status, createRes.body?.title || 'Failed');
    console.log('Get:', newsRes.status, `${newsRes.body?.length || 0} items`);

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

test();
