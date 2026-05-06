import { ActivityLog } from "./ActivityLog.model.js";
import { User } from "../users/User.model.js";

async function getCompanyUserIds(companyId) {
  if (!companyId) return [];
  const users = await User.find({ companyId }).select("_id").lean();
  return users.map((u) => u._id);
}

/**
 * Create an activity log entry
 * Centralized utility to avoid duplicating logging logic
 */
export async function createActivityLog({
  actorId,
  actorName,
  actorRole,
  actionType,
  module,
  description,
  targetUserId = null,
  targetUserName = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
  visibility = "PUBLIC",
}) {
  try {
    const activityLog = await ActivityLog.create({
      actorId,
      actorName,
      actorRole,
      targetUserId,
      targetUserName,
      actionType,
      module,
      description,
      metadata,
      ipAddress,
      userAgent,
      visibility,
      createdAt: new Date(),
    });

    console.log(`✅ Activity logged: ${description}`);
    return activityLog;
  } catch (error) {
    console.error("❌ Error creating activity log:", error.message);
    // Don't throw - logging failures shouldn't break the main operation
    return null;
  }
}

/**
 * Get activity logs with filtering and pagination
 */
export async function getActivityLogs(options = {}) {
  const {
    limit = 50,
    skip = 0,
    module,
    actionType,
    actorRole,
    actorId,
    startDate,
    endDate,
    visibility = "PUBLIC",
    targetUserId,
    companyId,
  } = options;

  const query = {};

  if (module) query.module = module;
  if (actionType) query.actionType = actionType;
  if (actorRole) query.actorRole = actorRole;
  if (actorId) query.actorId = actorId;
  if (targetUserId) query.targetUserId = targetUserId;

  // For HR/Admin, show more visibility levels
  if (visibility) {
    query.visibility = { $in: [visibility, "PUBLIC"] };
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.$or = [
      { actorId: { $in: companyUserIds } },
      { targetUserId: { $in: companyUserIds } }
    ];
  }

  const logs = await ActivityLog.find(query)
    .populate("actorId", "name email role profileImageUrl")
    .populate("targetUserId", "name email role profileImageUrl")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await ActivityLog.countDocuments(query);

  return {
    logs,
    total,
    limit,
    skip,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Get recent activities for a user
 */
export async function getUserActivities(userId, limit = 20, companyId) {
  const query = { actorId: userId };
  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.actorId = { $in: companyUserIds, $eq: userId };
  }
  return ActivityLog.find(query)
    .populate("actorId", "name email role profileImageUrl")
    .populate("targetUserId", "name email role profileImageUrl")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get HR timeline - shows all staff activities that HR should monitor
 */
export async function getHRTimeline(options = {}) {
  const { limit = 50, skip = 0, startDate, endDate } = options;
  const { companyId } = options;

  const query = {
    $or: [
      { module: "AUTH" },
      { module: "PROFILE" },
      { module: "LEAVE" },
      { module: "ATTENDANCE" },
      { module: "DOCUMENT" },
      { module: "TASK" },
      { actionType: "EMPLOYEE_UPDATE" },
    ],
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.actorId = { $in: companyUserIds };
  }

  const logs = await ActivityLog.find(query)
    .populate("actorId", "name email role profileImageUrl")
    .populate("targetUserId", "name email role profileImageUrl")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await ActivityLog.countDocuments(query);

  return {
    logs,
    total,
    limit,
    skip,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Get Admin timeline - shows ALL activities (staff + HR for complete visibility)
 * Admin sees: All staff activities + All HR activities
 */
export async function getAdminTimeline(options = {}) {
  const { limit = 50, skip = 0, startDate, endDate } = options;
  const { companyId } = options;

  const query = {
    $or: [
      // All staff activities (from HR timeline)
      { module: "AUTH" },
      { module: "PROFILE" },
      { module: "LEAVE" },
      { module: "ATTENDANCE" },
      { module: "DOCUMENT" },
      { module: "TASK" },
      { actionType: "EMPLOYEE_UPDATE" },
      // All HR and Admin activities
      { actorRole: "HR", module: "EMPLOYEE" },
      { actorRole: "ADMIN" },
    ],
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.actorId = { $in: companyUserIds };
  }

  const logs = await ActivityLog.find(query)
    .populate("actorId", "name email role profileImageUrl")
    .populate("targetUserId", "name email role profileImageUrl")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await ActivityLog.countDocuments(query);

  return {
    logs,
    total,
    limit,
    skip,
    pages: Math.ceil(total / limit),
  };
}
