#!/usr/bin/env node
/**
 * Orphan Cleanup Script - Clean up orphan users and data from deleted companies
 * 
 * Usage:
 *   npm run orphan:cleanup                    # Dry run (preview what will be deleted)
 *   npm run orphan:cleanup -- --apply        # Actually delete orphan data
 * 
 * Safety:
 *   - Always runs in dry-run mode by default
 *   - Shows what will be deleted before actual deletion
 *   - Requires --apply flag to actually delete
 *   - Validates that companies truly don't exist before deletion
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  detectOrphanUsers,
  cleanupOrphanUsers,
  cleanupAllOrphanData,
} from "../src/modules/companies/orphan.service.js";

dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isApplyMode = args.includes("--apply");
const isSilent = args.includes("--silent");

async function main() {
  try {
    const mode = isApplyMode ? "APPLY" : "DRY_RUN";

    console.log("\n" + "═".repeat(60));
    console.log(`🧹 [ORPHAN_CLEANUP] Starting cleanup in ${mode} mode`);
    console.log("═".repeat(60) + "\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/erp";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Step 1: Detect orphan users
    console.log("📍 Step 1: Detecting orphan users...");
    const orphanUsers = await detectOrphanUsers();
    console.log(`✓ Found ${orphanUsers.length} orphan users\n`);

    if (orphanUsers.length > 0 && !isSilent) {
      console.log("👥 Orphan Users Details:");
      console.table(
        orphanUsers.slice(0, 20).map((u) => ({
          Email: u.email,
          Name: u.name,
          Role: u.role,
          CompanyID: String(u.companyId).substring(0, 12) + "...",
        }))
      );
      if (orphanUsers.length > 20) {
        console.log(`... and ${orphanUsers.length - 20} more users`);
      }
      console.log("");
    }

    // Step 2: Cleanup all orphan data
    console.log("📍 Step 2: Cleaning up orphan data...");
    const cleanupResults = await cleanupAllOrphanData(mode === "DRY_RUN");

    console.log(`✓ Cleanup Summary (${mode}):`);
    console.table({
      "Orphan Users": cleanupResults.counts.users || 0,
      "Orphan Attendance": cleanupResults.counts.attendance || 0,
      "Orphan Leaves": cleanupResults.counts.leaves || 0,
      "Orphan Payroll": cleanupResults.counts.payroll || 0,
      "Orphan Tasks": cleanupResults.counts.tasks || 0,
      "Orphan Documents": cleanupResults.counts.documents || 0,
    });
    console.log(`Total records: ${cleanupResults.total}\n`);

    // Step 3: Final report
    console.log("═".repeat(60));
    console.log("📊 CLEANUP REPORT:");
    console.log("═".repeat(60));
    console.log(`Mode: ${mode}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Total orphan records affected: ${cleanupResults.total}`);

    if (mode === "DRY_RUN") {
      console.log("\n⚠️  DRY_RUN MODE - Nothing was actually deleted");
      console.log("To apply cleanup, run: npm run orphan:cleanup -- --apply\n");
    } else {
      console.log("\n✅ Cleanup completed! All orphan data has been deleted.");
      console.log("You can now create admins with previously conflicting emails.\n");
    }

    console.log("═".repeat(60));

    // Return appropriate exit code
    if (mode === "DRY_RUN" && orphanUsers.length === 0) {
      console.log("\n✅ No orphan data to clean up!");
      process.exit(0);
    } else if (mode === "APPLY") {
      console.log("\n✅ Cleanup applied successfully!");
      process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during orphan cleanup:", error.message);
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
