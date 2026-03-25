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

async function testForgotPassword() {
  console.log('🔐 Testing Forgot Password Flow...\n');

  try {
    // Step 1: Request password reset
    console.log('📧 Step 1: Request password reset...');
    const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {}, {
      email: 'hr@erp.com'
    });
    
    console.log('Status:', forgotRes.status);
    console.log('Response:', forgotRes.body);
    
    if (forgotRes.status !== 200) {
      console.error('❌ Forgot password request failed');
      return;
    }

    // In development, the token is returned in response
    const resetToken = forgotRes.body.resetToken;
    if (!resetToken) {
      console.log('✅ Production mode - token sent via email');
      return;
    }

    console.log('🔑 Reset token:', resetToken);

    // Step 2: Reset password with token
    console.log('\n🔄 Step 2: Reset password with token...');
    const resetRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      password: 'NewPassword123!'
    });
    
    console.log('Status:', resetRes.status);
    console.log('Response:', resetRes.body);

    if (resetRes.status !== 200) {
      console.error('❌ Password reset failed');
      return;
    }

    // Step 3: Test login with new password
    console.log('\n🔐 Step 3: Test login with new password...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'hr@erp.com',
      password: 'NewPassword123!'
    });
    
    console.log('Status:', loginRes.status);
    console.log('Login successful:', loginRes.status === 200);

    // Step 4: Reset back to original password
    if (loginRes.status === 200) {
      console.log('\n🔄 Step 4: Reset back to original password...');
      const forgotRes2 = await makeRequest('POST', '/api/auth/forgot-password', {}, {
        email: 'hr@erp.com'
      });
      
      if (forgotRes2.body.resetToken) {
        await makeRequest('POST', '/api/auth/reset-password', {}, {
          token: forgotRes2.body.resetToken,
          password: 'Hr@12345678'
        });
        console.log('✅ Password restored to original');
      }
    }

    console.log('\n✅ Forgot password flow test completed!');

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

testForgotPassword();