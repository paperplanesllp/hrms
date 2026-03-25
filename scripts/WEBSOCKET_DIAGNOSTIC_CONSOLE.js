/**
 * WebSocket Connection Diagnostic Tool
 * 
 * Paste this entire script into browser Console (F12) to diagnose socket issues
 * 
 * Output format:
 * ✅ = Working correctly
 * ❌ = Error/problem  
 * ⚠️ = Warning/needs attention
 * ℹ️ = Information
 */

console.clear();
console.log("%c🔌 WEBSOCKET DIAGNOSTIC TOOL", "color: cyan; font-size: 18px; font-weight: bold;");
console.log("═".repeat(60));

// ==============================================================================
// TEST 1: Authentication Status
// ==============================================================================
console.log("\n📋 TEST 1: Authentication Status");
console.log("─".repeat(60));

const auth = JSON.parse(localStorage.getItem('erp_auth') || '{}');
const hasToken = !!auth?.accessToken;
const hasUser = !!auth?.user;

console.log(hasToken ? "✅ Token exists in localStorage" : "❌ NO TOKEN - Not logged in!");
console.log(hasUser ? "✅ User data exists" : "❌ NO USER DATA");

if (hasToken) {
  console.log("ℹ️ User Email:", auth.user?.email);
  console.log("ℹ️ User Role:", auth.user?.role);
  console.log("ℹ️ Token Length:", auth.accessToken.length);
  console.log("ℹ️ Token Preview:", auth.accessToken.substring(0, 50) + "...");
  
  // Check if token looks valid (should start with "eyJ")
  if (auth.accessToken.startsWith('eyJ')) {
    console.log("✅ Token format looks valid (JWT)");
  } else {
    console.log("❌ Token format invalid - doesn't start with 'eyJ'");
  }
} else {
  console.log("%c💡 ACTION: You need to login first!", "color: orange; font-weight: bold;");
}

// ==============================================================================
// TEST 2: Environment Configuration
// ==============================================================================
console.log("\n📋 TEST 2: Environment Configuration");
console.log("─".repeat(60));

const apiBase = import.meta.env.VITE_API_BASE_URL;
console.log("ℹ️ API Base URL:", apiBase || "NOT SET");
console.log("ℹ️ Current Page URL:", window.location.href);

if (apiBase?.includes('5000')) {
  console.log("✅ API configured to port 5000");
} else {
  console.log("⚠️ API may not be configured to port 5000 - Check .env");
}

// ==============================================================================
// TEST 3: Socket.io Library Status
// ==============================================================================
console.log("\n📋 TEST 3: Socket.io Library Status");
console.log("─".repeat(60));

console.log(typeof window.io !== 'undefined' ? "✅ Socket.io library loaded" : "❌ Socket.io library NOT loaded");

// ==============================================================================
// TEST 4: Backend Connectivity
// ==============================================================================
console.log("\n📋 TEST 4: Backend Connectivity");
console.log("─".repeat(60));

console.log("🔄 Testing connection to backend (http://localhost:5000)...");

fetch('http://localhost:5000/api/health', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => {
  console.log(`✅ Backend responds (HTTP ${r.status})`);
  return r.json();
})
.then(d => console.log("ℹ️ Server message:", d?.message || d))
.catch(e => {
  console.error(`❌ Cannot reach backend: ${e.message}`);
  console.log("💡 POSSIBLE FIXES:");
  console.log("   1. Check if server is running: npm run dev in server folder");
  console.log("   2. Check if port 5000 is available");
  console.log("   3. Check backend Terminal for error messages");
});

// ==============================================================================
// TEST 5: Socket Authentication Test
// ==============================================================================
console.log("\n📋 TEST 5: Socket Connection Test");
console.log("─".repeat(60));

if (!hasToken) {
  console.error("❌ Cannot test socket - no token available");
  console.log("💡 Login first, then run this diagnostic again");
} else {
  console.log("🔄 Attempting socket connection with token...");
  
  try {
    const { io } = window;
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const serverUrl = apiUrl.replace('/api', '');
    
    const testSocket = io(serverUrl, {
      auth: {
        token: auth.accessToken
      },
      autoConnect: false, // Don't auto-connect, we'll manually connect
      reconnection: false,
      transports: ['websocket']
    });

    const testStartTime = Date.now();

    testSocket.on('connect', () => {
      const connectTime = Date.now() - testStartTime;
      console.log(`✅ Socket connected successfully! (${connectTime}ms)`);
      testSocket.disconnect();
    });

    testSocket.on('connect_error', (error) => {
      const errorTime = Date.now() - testStartTime;
      console.error(`❌ Socket connection error (${errorTime}ms):`);
      console.error(`   ${error.message}`);
      
      if (error.message.includes('Authentication')) {
        console.log("💡 SOLUTION: Token is invalid");
        console.log("   → Clear localStorage: localStorage.clear()");
        console.log("   → Refresh page: F5");
        console.log("   → Login again with credentials");
      }
      testSocket.disconnect();
    });

    console.log("🔄 Connecting to socket...");
    testSocket.connect();
    
    // Timeout if no response
    setTimeout(() => {
      if (!testSocket.connected) {
        console.error("❌ Socket connection timeout (5 seconds)");
        console.log("💡 POSSIBLE CAUSES:");
        console.log("   1. Backend server not running");
        console.log("   2. Port 5000 blocked by firewall");
        console.log("   3. CORS configuration issue");
        testSocket.disconnect();
      }
    }, 5000);
    
  } catch (e) {
    console.error(`❌ Socket test error: ${e.message}`);
  }
}

// ==============================================================================
// TEST 6: CORS Headers Check
// ==============================================================================
console.log("\n📋 TEST 6: CORS Configuration");
console.log("─".repeat(60));

console.log("ℹ️ Your frontend port:", window.location.port || "80 (default)");
console.log("ℹ️ Backend should allow: http://localhost:" + window.location.port);
console.log("💡 To check CORS in Network tab:");
console.log("   1. Open Network tab (F12 → Network)");
console.log("   2. Make an API request or try socket connection");
console.log("   3. Look for response headers:");
console.log("      - access-control-allow-origin");
console.log("      - access-control-allow-credentials");

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log("\n" + "═".repeat(60));
console.log("%c📊 DIAGNOSTIC SUMMARY", "color: cyan; font-weight: bold;");
console.log("═".repeat(60));

console.log("\n🎯 NEXT STEPS:");
if (!hasToken) {
  console.log("1. ❌ Not logged in - LOGIN FIRST");
  console.log("2. Go to http://localhost:5174/login");
  console.log("3. Enter: admin@gmail.com + password");
  console.log("4. Click Login");
  console.log("5. Wait 2 seconds");
  console.log("6. Run this diagnostic again");
} else {
  console.log("1. ✅ You're logged in");
  console.log("2. Check if socket connected above");
  console.log("3. If connected: Check browser console for 'Connected' message");
  console.log("4. If NOT connected:");
  console.log("   → Refresh page: F5");
  console.log("   → Check backend Terminal for errors");
  console.log("   → Clear auth: localStorage.clear()");
  console.log("   → Login again");
}

console.log("\n📞 If still not working, collect:");
console.log("   1. This entire console output (Ctrl+A, Ctrl+C)");
console.log("   2. Backend Terminal output");
console.log("   3. Tell us which step fails:");
for (let i = 1; i <= 6; i++) {
  console.log(`      ○ Test ${i}: [Pass/Fail]`);
}

console.log("\n" + "═".repeat(60));
console.log("%cDiagnostic Complete ✨", "color: green; font-weight: bold;");
console.log("═".repeat(60));
