import mongoose from "mongoose";
import { Company } from "./Company.model.js";
import { User } from "../users/User.model.js";
import { Attendance } from "../attendance/Attendance.model.js";
import { Leave } from "../leave/Leave.model.js";
import { Payroll } from "../payroll/Payroll.model.js";
import { Task } from "../tasks/Task.model.js";
import { EmployeeDocument } from "../documents/EmployeeDocument.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Find all orphan records - users whose companyId no longer exists in companies collection
 */
export async function detectOrphanUsers() {
  // Get all company IDs that still exist
  const existingCompanies = await Company.find({}).select("_id").lean();
  const existingCompanyIds = new Set(existingCompanies.map((c) => String(c._id)));

  // Find all users
  const allUsers = await User.find({}).select("_id email companyId name role createdAt").lean();

  // Filter for orphan users (companyId doesn't exist)
  const orphanUsers = allUsers.filter((user) => {
    if (!user.companyId) return false; // Skip users without companyId
    return !existingCompanyIds.has(String(user.companyId));
  });

  return orphanUsers;
}

/**
 * Detect all orphan data (users, attendance, payroll, tasks, documents, etc.)
 * that reference non-existent companies
 */
export async function detectOrphanData() {
  const existingCompanies = await Company.find({}).select("_id").lean();
  const existingCompanyIds = existingCompanies.map((c) => String(c._id));

  const orphanData = {
    users: [],
    attendance: [],
    leaves: [],
    payroll: [],
    tasks: [],
    documents: [],
  };

  // Find orphan users
  orphanData.users = await User.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  })
    .select("_id email companyId name role createdAt")
    .lean();

  // Find orphan attendance records
  orphanData.attendance = await Attendance.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  })
    .select("_id userId companyId createdAt")
    .countDocuments();

  // Find orphan leave records
  orphanData.leaves = await Leave.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  })
    .select("_id userId companyId createdAt")
    .countDocuments();

  // Find orphan payroll records
  orphanData.payroll = await Payroll.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  })
    .select("_id userId companyId createdAt")
    .countDocuments();

  // Find orphan tasks
  orphanData.tasks = await Task.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  })
    .select("_id companyId createdAt")
    .countDocuments();

  // Find orphan documents
  orphanData.documents = await EmployeeDocument.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  })
    .select("_id userId companyId createdAt")
    .countDocuments();

  return orphanData;
}

/**
 * Clean up orphan users - optionally delete them or soft-delete if flag exists
 * @param {boolean} dryRun - If true, only show what would be deleted
 * @param {boolean} verbose - If true, show detailed logging
 * @returns {Object} Cleanup report
 */
export async function cleanupOrphanUsers(dryRun = true, verbose = false) {
  const existingCompanies = await Company.find({}).select("_id").lean();
  const existingCompanyIds = existingCompanies.map((c) => String(c._id));

  const orphanUsers = await User.find({
    companyId: { $nin: existingCompanyIds, $ne: null },
  }).lean();

  if (verbose) {
    console.log(`[ORPHAN_CLEANUP] Found ${orphanUsers.length} orphan users to clean up`);
    if (orphanUsers.length > 0 && orphanUsers.length <= 20) {
      console.log("[ORPHAN_CLEANUP] Orphan users:", orphanUsers);
    }
  }

  if (dryRun) {
    return {
      mode: "DRY_RUN",
      orphanCount: orphanUsers.length,
      orphanUsers: orphanUsers.map((u) => ({
        id: String(u._id),
        email: u.email,
        name: u.name,
        role: u.role,
        companyId: String(u.companyId),
      })),
    };
  }

  // Actually delete orphan users
  const result = await User.deleteMany({
    companyId: { $nin: existingCompanyIds, $ne: null },
  });

  return {
    mode: "DELETED",
    deletedCount: result.deletedCount,
    deletedUsers: orphanUsers.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name,
      role: u.role,
      companyId: String(u.companyId),
    })),
  };
}

/**
 * Check if an email belongs to an orphan user
 */
export async function isOrphanEmailConflict(email) {
  const existingCompanies = await Company.find({}).select("_id").lean();
  const existingCompanyIds = existingCompanies.map((c) => String(c._id));

  const orphanUser = await User.findOne({
    email: String(email).toLowerCase(),
    companyId: { $nin: existingCompanyIds, $ne: null },
  });

  return orphanUser || null;
}

/**
 * Safe delete of orphan email - checks if user belongs to non-existent company
 */
export async function safeDeleteOrphanUser(email, verbose = false) {
  const orphanUser = await isOrphanEmailConflict(email);

  if (!orphanUser) {
    if (verbose) {
      console.log(`[ORPHAN_DELETE] Email ${email} does not belong to orphan user`);
    }
    return null;
  }

  // Verify the company really doesn't exist
  const company = await Company.findById(orphanUser.companyId);
  if (company) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `User belongs to an existing company. Cannot delete. Company: ${company.name}`
    );
  }

  // Delete the orphan user
  const result = await User.deleteOne({ _id: orphanUser._id });

  if (verbose) {
    console.log(`[ORPHAN_DELETE] Deleted orphan user: ${email} (id: ${orphanUser._id})`);
  }

  return {
    deleted: true,
    user: {
      id: String(orphanUser._id),
      email: orphanUser.email,
      name: orphanUser.name,
      companyId: String(orphanUser.companyId),
    },
  };
}

/**
 * Complete orphan data cleanup - delete all orphan records from all collections
 * @param {boolean} dryRun - If true, only show what would be deleted
 * @returns {Object} Cleanup report
 */
export async function cleanupAllOrphanData(dryRun = true) {
  const existingCompanies = await Company.find({}).select("_id").lean();
  const existingCompanyIds = existingCompanies.map((c) => String(c._id));

  const filter = {
    companyId: { $nin: existingCompanyIds, $ne: null },
  };

  const counts = {};

  // Count orphan records
  counts.users = await User.countDocuments(filter);
  counts.attendance = await Attendance.countDocuments(filter);
  counts.leaves = await Leave.countDocuments(filter);
  counts.payroll = await Payroll.countDocuments(filter);
  counts.tasks = await Task.countDocuments(filter);
  counts.documents = await EmployeeDocument.countDocuments(filter);

  if (dryRun) {
    return {
      mode: "DRY_RUN",
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    };
  }

  // Actually delete orphan records
  const deleteResults = {};

  deleteResults.users = (await User.deleteMany(filter)).deletedCount;
  deleteResults.attendance = (await Attendance.deleteMany(filter)).deletedCount;
  deleteResults.leaves = (await Leave.deleteMany(filter)).deletedCount;
  deleteResults.payroll = (await Payroll.deleteMany(filter)).deletedCount;
  deleteResults.tasks = (await Task.deleteMany(filter)).deletedCount;
  deleteResults.documents = (await EmployeeDocument.deleteMany(filter)).deletedCount;

  return {
    mode: "DELETED",
    counts: deleteResults,
    total: Object.values(deleteResults).reduce((a, b) => a + b, 0),
  };
}
