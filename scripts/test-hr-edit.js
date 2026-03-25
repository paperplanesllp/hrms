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

async function testHREditAttendance() {
  console.log('🔐 Testing HR Edit Attendance...\n');

  try {
    // Login as HR
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'hr@erp.com',
      password: 'Hr@12345678'
    });
    
    if (loginRes.status !== 200) {
      console.error('❌ HR Login failed');
      return;
    }

    const token = loginRes.body.accessToken;
    const auth = { 'Authorization': `Bearer ${token}` };

    // Get attendance records
    const attendanceRes = await makeRequest('GET', '/api/attendance', auth);
    console.log('📊 Attendance records:', attendanceRes.status);
    
    if (attendanceRes.body && attendanceRes.body.length > 0) {
      const record = attendanceRes.body[0];
      console.log('📝 Editing record:', record._id);
      
      // Test editing attendance
      const editRes = await makeRequest('PUT', `/api/attendance/${record._id}`, auth, {
        checkIn: '09:15',
        checkOut: '17:30',
        status: 'PRESENT'
      });
      
      console.log('✏️ Edit result:', editRes.status, editRes.body?.attendance ? 'Success' : 'Failed');
    } else {
      console.log('📝 No attendance records to edit');
    }

    console.log('\n✅ HR edit test completed!');

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

testHREditAttendance();