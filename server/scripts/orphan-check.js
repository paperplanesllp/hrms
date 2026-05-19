#!/usr/bin/env node
/**
 * Orphan Detection Script - Check for users and data orphaned by deleted companies
 * 
 * Usage:
 *   npm run orphan:check
 *   node scripts/orphan-check.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  detectOrphanUsers,
  detectOrphanData,
  cleanupAllOrphanData,
} from "../src/modules/companies/orphan.service.js";

dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log("🔍 [ORPHAN_CHECK] Starting orphan data detection...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/erp";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Detect orphan users
    console.log("📍 Scanning for orphan users...");
    const orphanUsers = await detectOrphanUsers();
    console.log(`Found ${orphanUsers.length} orphan users\n`);

    if (orphanUsers.length > 0) {
      console.log("📋 Orphan Users:");
      console.table(
        orphanUsers.map((u) => ({
          ID: String(u._id).substring(0, 8) + "...",
          Email: u.email,
          Name: u.name,
          Role: u.role,
          CompanyID: String(u.companyId).substring(0, 8) + "...",
          Created: new Date(u.createdAt).toLocaleDateString(),
        }))
      );
    }

    console.log("\n");

    // Detect all orphan data
    console.log("📍 Scanning for all orphan data...");
    const dryRunResults = await cleanupAllOrphanData(true);
    console.log("📊 Orphan Data Counts (DRY_RUN):");
    console.table(dryRunResults.counts);
    console.log(`\n📊 Total orphan records: ${dryRunResults.total}\n`);

    // Summary and recommendations
    console.log("═".repeat(60));
    console.log("📋 SUMMARY:");
    console.log("═".repeat(60));
    console.log(`Orphan users: ${orphanUsers.length}`);
    console.log(`Total orphan records: ${dryRunResults.total}`);

    if (orphanUsers.length > 0) {
      console.log("\n⚠️  RECOMMENDATIONS:");
      console.log("1. Run cleanup with: npm run orphan:cleanup");
      console.log("2. This will delete all orphan users and associated records");
      console.log("3. After cleanup, you can create admins with conflicting emails\n");
    } else {
      console.log("\n✅ No orphan data found! Your database is clean.\n");
    }

    console.log("═".repeat(60));
  } catch (error) {
    console.error("❌ Error during orphan detection:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

main();
