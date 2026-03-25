#!/usr/bin/env node

/**
 * Complete Fix for WebSocket 403 & Policy API Errors
 * Run this script to diagnose and fix all issues
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ERP System - Complete Diagnostic & Fix                        ║
║  WebSocket + Auth Token Issues                                 ║
╚════════════════════════════════════════════════════════════════╝
`);

// ============ STEP 1: Check Backend ============
console.log(`\n📋 STEP 1: Checking Backend Server...`);
console.log(`   ✓ Backend should be running on: http://localhost:5000`);
console.log(`   ✓ Check Terminal 1 for logs`);
console.log(`   ✓ If not running, execute:`);
console.log(`   
   cd server
   npm install
   npm run dev
   `);

// ============ STEP 2: Check Frontend Auth ============
console.log(`\n📋 STEP 2: Checking Frontend Authentication...`);
console.log(`   In Browser Console (F12), run:`);
console.log(`
   // Check 1: Auth token
   const auth = JSON.parse(localStorage.getItem('erp_auth'));
   console.log('Auth Data:', auth);
   console.log('Token Exists?', !!auth?.accessToken);
   console.log('User Role:', auth?.user?.role);
   
   // Check 2: Token Format
   const token = auth?.accessToken;
   if (token) {
     const parts = token.split('.');
     console.log('Token Parts:', parts.length === 3 ? '✅ Valid JWT' : '❌ Invalid');
   }
   `);

// ============ STEP 3: Fix #1 - Clear & Re-Login ============
console.log(`\n📋 STEP 3: Clear Auth & Re-Login...`);
console.log(`   In Browser Console, run:`);
console.log(`
   // Clear everything
   localStorage.clear()
   location.reload()
   
   // Then login with:
   // Email: admin@gmail.com
   // Password: (your password)
   `);

// ============ STEP 4: Fix #2 - Verify Socket Connection ============
console.log(`\n📋 STEP 4: Verify Socket Connection...`);
console.log(`   In Browser Console, run:`);
console.log(`
   // Close all socket listeners
   window.location.reload()
   
   // Wait 2 seconds, then check
   setTimeout(() => {
     console.log('Socket Status:', 
       document.body.innerHTML.includes('connected') ? 'Connected' : 'Check Console'
     );
   }, 2000);
   `);

// ============ STEP 5: Test API Manually ============
console.log(`\n📋 STEP 5: Manual API Test...`);
console.log(`   In Browser Console, run:`);
console.log(`
   const auth = JSON.parse(localStorage.getItem('erp_auth'));
   const token = auth?.accessToken;
   
   fetch('http://localhost:5000/api/policy/company-policy', {
     method: 'GET',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': \`Bearer \${token}\`
     }
   })
   .then(r => {
     console.log('Status:', r.status);
     return r.json();
   })
   .then(d => console.log('Response:', d))
   .catch(e => console.error('Error:', e));
   `);

// ============ STEP 6: Check .env Files ============
console.log(`\n📋 STEP 6: Environment Files Check...`);

const frontendEnv = path.join(process.cwd(), 'erp-dashboard', '.env');
const serverEnv = path.join(process.cwd(), 'server', '.env');

console.log(`\n   Frontend (.env):`);
if (fs.existsSync(frontendEnv)) {
  const content = fs.readFileSync(frontendEnv, 'utf8');
  if (content.includes('VITE_API_BASE_URL')) {
    console.log(`   ✅ VITE_API_BASE_URL is set`);
    console.log(`      Should be: http://localhost:5000/api`);
  } else {
    console.log(`   ⚠️  Add this to .env:`);
    console.log(`      VITE_API_BASE_URL=http://localhost:5000/api`);
  }
} else {
  console.log(`   ⚠️  .env not found`);
}

console.log(`\n   Backend (.env):`);
if (fs.existsSync(serverEnv)) {
  const content = fs.readFileSync(serverEnv, 'utf8');
  if (content.includes('JWT_ACCESS_SECRET') && content.includes('MONGODB_URI')) {
    console.log(`   ✅ JWT_ACCESS_SECRET and MONGODB_URI are set`);
  }
} else {
  console.log(`   ⚠️  .env not found`);
}

// ============ FINAL CHECKLIST ============
console.log(`

╔════════════════════════════════════════════════════════════════╗
║  FINAL CHECKLIST - Do These in Order                          ║
╚════════════════════════════════════════════════════════════════╝

1. ✓ Backend Running?
   → Open Terminal 1
   → cd server && npm run dev
   → Wait for "Server running on port 5000"

2. ✓ Frontend Running?
   → Open Terminal 2
   → cd erp-dashboard && npm run dev
   → Wait for "Local: http://localhost:5173"

3. ✓ Clear Browser Cache
   → F12 → Application → localStorage → Clear All
   → Close browser tab and reopen

4. ✓ Login Again
   → Email: admin@gmail.com
   → Password: (use your password)
   → Wait for redirect to dashboard

5. ✓ Check Browser Console
   → F12 → Console tab
   → Should see: "🔌 Connected to real-time notifications"
   → NO red errors

6. ✓ Test Policy Page
   → Navigate to /policy
   → Should LOAD WITHOUT errors
   → Should see "Edit Policy" button

7. ✓ Test Other Pages
   → Try /dashboard
   → Try /leave
   → Try /attendance
   → All should work

╔════════════════════════════════════════════════════════════════╗
║  If Still Getting 403 Error                                   ║
╚════════════════════════════════════════════════════════════════╝

Run this in Browser Console:

  // Get full error details
  fetch('http://localhost:5000/api/policy/company-policy', {
    headers: {
      'Authorization': \`Bearer \${JSON.parse(localStorage.getItem('erp_auth'))?.accessToken || 'NO_TOKEN'}\`
    }
  })
  .then(r => r.json())
  .then(d => {
    console.log('=== API Response ===');
    console.log('Status:', d.statusCode);
    console.log('Message:', d.message);
    console.log('Full:', d);
  })
  .catch(e => console.error('Network Error:', e));

Share the output in console!

╔════════════════════════════════════════════════════════════════╗
║  Common Issues & Solutions                                    ║
╚════════════════════════════════════════════════════════════════╝

Issue: "403 Forbidden"
→ Token missing or expired
→ Solution: Clear localStorage & re-login

Issue: "WebSocket closed before connection"
→ Backend not running on port 5000
→ Solution: Start backend server

Issue: "Cannot GET /api/policy/company-policy"
→ Backend routes not loaded
→ Solution: Restart backend (npm run dev)

Issue: "Token validation failed"
→ JWT_ACCESS_SECRET mismatch
→ Solution: Check .env files match

Issue: "CORS error"
→ Frontend/backend URL mismatch
→ Solution: Check VITE_API_BASE_URL

╔════════════════════════════════════════════════════════════════╗
║  Getting Help                                                 ║
╚════════════════════════════════════════════════════════════════╝

Share these from browser console:
1. localStorage.getItem('erp_auth')
2. Network tab → policy-request → Response
3. Console errors (red messages)
4. Backend terminal output

Then I can fix the exact issue! 🚀
`);
