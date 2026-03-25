#!/usr/bin/env node

/**
 * Test Check-In/Check-Out Workflow
 * 
 * This script tests the complete attendance checkin workflow:
 * 1. Login
 * 2. Check-in
 * 3. Check-out
 * 4. Verify both are recorded
 */

import axios from "axios";
import { exec } from "child_process";

const BASE_URL = process.env.API_URL || "http://localhost:5000/api";
const TEST_EMAIL = "admin@gmail.com";
const TEST_PASSWORD = "password";

const api = axios.create({ 
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true // Don't throw on any status
});

let authToken = null;
let cookies = {};

console.log("🧪 ATTENDANCE CHECK-IN/OUT WORKFLOW TEST\n");
console.log(`📍 API Base URL: ${BASE_URL}`);
console.log(`👤 Test User: ${TEST_EMAIL}\n`);

// Helper to print results
function printResult(step, status, message, details = null) {
  const icon = status === "✅" ? "✅" : status === "⚠️" ? "⚠️" : "❌";
  console.log(`${icon} ${step}`);
  console.log(`   ${message}`);
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }
  console.log();
}

async function testLogin() {
  console.log("\n═══════════════════════════════════════");
  console.log("STEP 1: LOGIN");
  console.log("═══════════════════════════════════════\n");

  try {
    const res = await api.post("/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (res.status !== 200 || !res.data?.accessToken) {
      printResult("Login", "❌", `Failed with status ${res.status}`, res.data);
      return false;
    }

    authToken = res.data.accessToken;
    cookies = res.headers['set-cookie'] || [];
    
    printResult(
      "Login", 
      "✅", 
      `Successfully logged in as ${res.data.user.name}`,
      { 
        userId: res.data.user.id,
        role: res.data.user.role,
        tokenLength: authToken.length 
      }
    );
    return true;
  } catch (err) {
    printResult("Login", "❌", `Error: ${err.message}`);
    return false;
  }
}

async function testCheckIn() {
  console.log("═══════════════════════════════════════");
  console.log("STEP 2: CHECK-IN");
  console.log("═══════════════════════════════════════\n");

  if (!authToken) {
    printResult("Check-in", "❌", "No auth token available from login step");
    return false;
  }

  try {
    const res = await api.post(
      "/attendance/checkin",
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (res.status !== 200 || !res.data?.attendance) {
      printResult(
        "Check-in",
        res.status === 401 ? "❌" : "⚠️",
        `Response status ${res.status}`,
        res.data
      );
      return false;
    }

    printResult(
      "Check-in",
      "✅",
      "Successfully checked in",
      {
        date: res.data.attendance.date,
        checkIn: res.data.attendance.checkIn,
        status: res.data.attendance.status
      }
    );
    return true;
  } catch (err) {
    printResult("Check-in", "❌", `Error: ${err.message}`);
    return false;
  }
}

async function testCheckOut() {
  console.log("═══════════════════════════════════════");
  console.log("STEP 3: CHECK-OUT");
  console.log("═══════════════════════════════════════\n");

  if (!authToken) {
    printResult("Check-out", "❌", "No auth token available from login step");
    return false;
  }

  try {
    const res = await api.post(
      "/attendance/checkout",
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (res.status !== 200 || !res.data?.attendance) {
      printResult(
        "Check-out",
        res.status === 401 ? "❌" : "⚠️",
        `Response status ${res.status}`,
        res.data
      );
      return false;
    }

    printResult(
      "Check-out",
      "✅",
      "Successfully checked out",
      {
        date: res.data.attendance.date,
        checkIn: res.data.attendance.checkIn,
        checkOut: res.data.attendance.checkOut,
        totalHours: res.data.attendance.totalHours,
        status: res.data.attendance.status
      }
    );
    return true;
  } catch (err) {
    printResult("Check-out", "❌", `Error: ${err.message}`);
    return false;
  }
}

async function testGetAttendance() {
  console.log("═══════════════════════════════════════");
  console.log("STEP 4: VERIFY RECORDS");
  console.log("═══════════════════════════════════════\n");

  if (!authToken) {
    printResult("Verify", "❌", "No auth token available");
    return false;
  }

  try {
    const res = await api.get(
      "/attendance",
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (res.status !== 200 || !Array.isArray(res.data)) {
      printResult("Verify", "❌", `Failed to get attendance records`, res.data);
      return false;
    }

    const today = new Date().toISOString().split("T")[0];
    const todayRecord = res.data.find(r => r.date === today);

    if (!todayRecord) {
      printResult("Verify", "⚠️", `No record found for today (${today})`);
      return false;
    }

    printResult(
      "Verify",
      "✅",
      `Found today's attendance record`,
      {
        date: todayRecord.date,
        checkIn: todayRecord.checkIn,
        checkOut: todayRecord.checkOut,
        totalHours: todayRecord.totalHours,
        status: todayRecord.status
      }
    );
    return true;
  } catch (err) {
    printResult("Verify", "❌", `Error: ${err.message}`);
    return false;
  }
}

async function testMultipleOperations() {
  console.log("═══════════════════════════════════════");
  console.log("STEP 5: SECOND CHECK-IN (AFTER LOGOUT)");
  console.log("═══════════════════════════════════════\n");
  
  console.log("⏸️  Waiting 2 seconds before second attempt...\n");
  await new Promise(r => setTimeout(r, 2000));

  if (!authToken) {
    printResult("Second Check-in", "❌", "No auth token available");
    return false;
  }

  try {
    const res = await api.post(
      "/attendance/checkin",
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (res.status === 401) {
      printResult(
        "Second Check-in",
        "⚠️",
        "Got 401 - Token likely expired or invalid. This means token refresh is needed.",
        res.data
      );
      return false;
    }

    if (res.status !== 200) {
      printResult(
        "Second Check-in",
        "❌",
        `Failed with status ${res.status}`,
        res.data
      );
      return false;
    }

    printResult(
      "Second Check-in",
      "✅",
      "Second check-in successful (same day, same user)"
    );
    return true;
  } catch (err) {
    printResult("Second Check-in", "❌", `Error: ${err.message}`);
    return false;
  }
}

async function main() {
  const results = {};

  results.login = await testLogin();
  if (!results.login) {
    console.log("\n❌ Login failed. Cannot continue tests.");
    process.exit(1);
  }

  results.checkIn = await testCheckIn();
  results.checkOut = await testCheckOut();
  results.verify = await testGetAttendance();
  results.secondCheckIn = await testMultipleOperations();

  // Summary
  console.log("\n═══════════════════════════════════════");
  console.log("TEST SUMMARY");
  console.log("═══════════════════════════════════════\n");

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log();

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`  ${passed ? "✅" : "❌"} ${test}`);
  });

  console.log("\n═══════════════════════════════════════");
  
  if (passed === total) {
    console.log("🎉 ALL TESTS PASSED!\n");
    console.log("Check-in/out workflow is working correctly.");
  } else {
    console.log("⚠️ SOME TESTS FAILED\n");
    console.log("See details above for troubleshooting.\n");
    console.log("Common issues:");
    console.log("• 401 errors = Token refresh not working properly");
    console.log("• Connection refused = Backend server not running");
    console.log("• 403 errors = User lacks permissions\n");
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
