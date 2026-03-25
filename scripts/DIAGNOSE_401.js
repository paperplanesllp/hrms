// Diagnostic: Check why API calls are getting 401 errors

const diagnostics = {
  timestamp: new Date().toISOString(),
  servers: {
    backend: "http://localhost:5000",
    frontend: "http://localhost:5174", 
    status: "CHECKING..."
  },
  auth: {
    tokenInStorage: null,
    tokenIsValid: false,
    tokenExpired: false
  }
};

// Test 1: Check auth token in browser storage
console.log("=== AUTH TOKEN DIAGNOSTIC ===\n");
const authData = localStorage.getItem('erp_auth');
console.log("1. Auth data in localStorage:", authData ? "✅ FOUND" : "❌ MISSING");

if (authData) {
  try {
    const parsed = JSON.parse(authData);
    diagnostics.auth.tokenInStorage = true;
    console.log("   - Parsed successfully:", !!parsed);
    console.log("   - Has accessToken:", !!parsed.accessToken);
    console.log("   - Has user:", !!parsed.user);
    console.log("   - User email:", parsed.user?.email);
    console.log("   - User role:", parsed.user?.role);
    console.log("   - Token preview:", parsed.accessToken?.substring(0, 50) + "...");
  } catch (e) {
    console.error("   ❌ Failed to parse auth:", e.message);
  }
} else {
  console.log("   ❌ NO AUTH TOKEN - This is causing 401 errors!");
  console.log("   💡 Solution: You need to login first");
}

// Test 2: Check API connectivity
console.log("\n2. Testing API connectivity to backend:");
fetch("http://localhost:5000/api/health", {
  method: "GET",
  headers: { "Content-Type": "application/json" }
})
.then(r => {
  console.log(`   ✅ Backend responds (${r.status})`);
  return r.json();
})
.then(d => console.log("   Server message:", d?.message))
.catch(e => console.error("   ❌ Cannot reach backend:", e.message));

// Test 3: Try API call WITH auth token
setTimeout(() => {
  console.log("\n3. Testing API with auth token:");
  const auth = JSON.parse(localStorage.getItem('erp_auth') || '{}');
  const token = auth?.accessToken;
  
  if (!token) {
    console.error("   ❌ NO TOKEN AVAILABLE - 401 is expected!");
    console.log("   💡 Login first: /login");
    console.log("\n📋 ROOT CAUSE: You are not logged in");
    console.log("   - Auth token missing from localStorage");
    console.log("   - All API calls require: Authorization: Bearer <token>");
    console.log("   - 401 = Unauthorized (missing/invalid token)");
    return;
  }

  fetch("http://localhost:5000/api/news", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  })
  .then(r => {
    if (r.ok) {
      console.log("   ✅ API call successful (200)");
    } else if (r.status === 401) {
      console.error("   ❌ 401 Unauthorized - Token invalid/expired");
    } else if (r.status === 403) {
      console.log("   ⚠️ 403 Forbidden - User lacks permissions");
    }
    return r.json();
  })
  .then(d => console.log("   Response:", d))
  .catch(e => console.error("   Error:", e.message));
}, 100);

console.log("\n📖 UNDERSTANDING 401 vs OTHER ERRORS:");
console.log("   401 Unauthorized");
console.log("      ├─ Missing auth token in header");
console.log("      ├─ Token is invalid/malformed");
console.log("      ├─ Token is expired");
console.log("      └─ Solution: Login again to get new token");
console.log("");
console.log("   403 Forbidden");
console.log("      ├─ User is authenticated but lacks permission");
console.log("      ├─ User role doesn't have access to resource");
console.log("      └─ Solution: Contact admin for permissions");
console.log("");
console.log("   500 Server Error");
console.log("      ├─ Backend crashed or has bug");
console.log("      └─ Solution: Check backend logs");

console.log("\n🔍 NEXT STEPS:");
console.log("1. If auth token is MISSING → Login at /login");
console.log("2. If auth token EXISTS → Refresh page, logout, login again");
console.log("3. If just reloaded → F5 again (page might not have loaded token yet)");
console.log("4. Check browser Network tab to see actual response headers");
