#!/usr/bin/env node
import http from 'http';

function checkServer() {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server is running on port 5000 (Status: ${res.statusCode})`);
  });

  req.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 5000');
      console.log('💡 Please start the server with: npm run dev');
    } else {
      console.log('❌ Connection error:', err.message);
    }
  });

  req.on('timeout', () => {
    console.log('❌ Server connection timeout');
    req.destroy();
  });

  req.end();
}

checkServer();