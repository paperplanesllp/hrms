#!/usr/bin/env node
/**
 * Orphan Users Fix Verification Script
 * 
 * Tests the complete workflow:
 * 1. Create a test company
 * 2. Create a test admin for that company
 * 3. Delete the company (should delete the admin)
 * 4. Try to create a new admin with the same email (should succeed now)
 * 5. Verify the new admin exists
 * 
 * This demonstrates that the orphan user issue is fixed.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Company } from "../src/modules/companies/Company.model.js";
import { User } from "../src/modules/users/User.model.js";
import { createCompany, deleteCompany, createCompanyAdmin } from "../src/modules/companies/companies.service.js";
import { detectOrphanUsers } from "../src/modules/companies/orphan.service.js";

dotenv.config({ path: ".env" });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  try {
    console.log("\n" + "═".repeat(70));
    console.log("🧪 [VERIFICATION] Orphan Users Fix - Complete Workflow Test");
    console.log("═".repeat(70) + "\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/erp";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Test configuration
    const testCompanyName = `Test_Company_${Date.now()}`;
    const testAdminEmail = `testadmin_${Date.now()}@example.com`;
    const testPassword = "TestPassword123";

    console.log("📋 TEST CONFIGURATION:");
    console.log(`  Company Name: ${testCompanyName}`);
    console.log(`  Admin Email: ${testAdminEmail}`);
    console.log("");

    // Step 1: Create a test company
    console.log("📍 STEP 1: Creating test company...");
    const company = await createCompany(
      {
        name: testCompanyName,
        domain: testCompanyName.toLowerCase().replace(/_/g, "-"),
        contactEmail: `contact@${testCompanyName.toLowerCase().replace(/_/g, "-")}.com`,
        contactPhone: "1234567890",
        address: "Test Address",
      },
      null
    );
    console.log(`✓ Company created: ${company._id} (${company.name})\n`);

    // Step 2: Create admin for that company
    console.log("📍 STEP 2: Creating admin for test company...");
    const adminBefore = await createCompanyAdmin(company._id, {
      name: "Test Admin",
      email: testAdminEmail,
      phone: "9876543210",
      password: testPassword,
    });
    console.log(`✓ Admin created: ${adminBefore._id} (${adminBefore.email})\n`);

    // Verify admin exists
    let adminCheck = await User.findOne({ email: testAdminEmail });
    console.log(`✓ Admin verified in database: ${adminCheck._id}\n`);

    // Step 3: Delete the company
    console.log("📍 STEP 3: Deleting test company...");
    const deleteResult = await deleteCompany(company._id);
    console.log(`✓ Company deleted: ${deleteResult.company.name}`);
    console.table({
      "Users Deleted": deleteResult.counts.users || 0,
      "Attendance Deleted": deleteResult.counts.attendance || 0,
      "Leaves Deleted": deleteResult.counts.leaves || 0,
      "Tasks Deleted": deleteResult.counts.tasks || 0,
    });
    console.log("");

    // Wait a moment for the deletion to complete
    await sleep(500);

    // Step 4: Verify the company is deleted
    console.log("📍 STEP 4: Verifying company is deleted...");
    const companyAfterDelete = await Company.findById(company._id);
    if (!companyAfterDelete) {
      console.log("✓ Company successfully deleted from database\n");
    } else {
      console.log("❌ ERROR: Company still exists!\n");
      process.exit(1);
    }

    // Step 5: Verify admin was deleted
    console.log("📍 STEP 5: Verifying admin was deleted...");
    const adminAfterDelete = await User.findById(adminBefore._id);
    if (!adminAfterDelete) {
      console.log("✓ Admin successfully deleted from database\n");
    } else {
      console.log("❌ ERROR: Admin still exists in database!\n");
      console.log("   This means the orphan user issue is NOT fixed\n");
      process.exit(1);
    }

    // Step 6: Check for orphan users
    console.log("📍 STEP 6: Checking for orphan users...");
    const orphans = await detectOrphanUsers();
    if (orphans.length === 0) {
      console.log("✓ No orphan users found\n");
    } else {
      console.log(`⚠️  Found ${orphans.length} orphan users:\n`);
      console.table(orphans.map((u) => ({ Email: u.email, Name: u.name, Role: u.role })));
      console.log("");
    }

    // Step 7: Create a NEW company with the SAME admin email
    console.log("📍 STEP 7: Creating NEW company with SAME admin email...");
    const newCompany = await createCompany(
      {
        name: `New_${testCompanyName}`,
        domain: `new${testCompanyName.toLowerCase().replace(/_/g, "-")}`,
        contactEmail: `contact2@${testCompanyName.toLowerCase().replace(/_/g, "-")}.com`,
        contactPhone: "1234567890",
        address: "Test Address",
      },
      null
    );
    console.log(`✓ New company created: ${newCompany._id} (${newCompany.name})\n`);

    // Step 8: Create admin with SAME email in NEW company (THIS SHOULD NOW WORK!)
    console.log("📍 STEP 8: Creating admin with SAME email in NEW company...");
    console.log("   (This would previously fail with 409 Conflict)");
    try {
      const adminAfter = await createCompanyAdmin(newCompany._id, {
        name: "Test Admin New",
        email: testAdminEmail, // SAME EMAIL!
        phone: "9876543210",
        password: testPassword,
      });
      console.log(`✓ SUCCESS! Admin created: ${adminAfter._id} (${adminAfter.email})`);
      console.log(`  CompanyId: ${adminAfter.companyId}\n`);

      // Verify the new admin
      const newAdmin = await User.findById(adminAfter._id);
      if (newAdmin && newAdmin.email === testAdminEmail && String(newAdmin.companyId) === String(newCompany._id)) {
        console.log("✓ New admin verified in database\n");
      }
    } catch (error) {
      console.log(`❌ ERROR: Failed to create admin with same email!\n`);
      console.log(`   Error: ${error.message}\n`);
      process.exit(1);
    }

    // Final Summary
    console.log("═".repeat(70));
    console.log("✅ VERIFICATION SUCCESSFUL!");
    console.log("═".repeat(70));
    console.log("\n✅ The orphan users issue has been FIXED!");
    console.log("✅ You can now create admins with previously conflicting emails!");
    console.log("\nKey improvements made:");
    console.log("  1. Enhanced deleteCompany() to ensure all users are deleted");
    console.log("  2. Added orphan detection service (orphan.service.js)");
    console.log("  3. Auto-cleanup of orphan users during admin creation");
    console.log("  4. npm run orphan:check - detect orphan records");
    console.log("  5. npm run orphan:cleanup - clean up orphan data\n");

    // Cleanup: Delete the test companies
    console.log("📍 Cleaning up test data...");
    await Company.deleteMany({ name: { $regex: "^Test_Company_|^New_Test_Company_" } });
    await User.deleteMany({ email: testAdminEmail });
    console.log("✓ Test data cleaned up\n");

    console.log("═".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB\n");
  }
}

main();
