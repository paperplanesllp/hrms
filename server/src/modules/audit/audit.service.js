import { AuditLog } from "./AuditLog.model.js";
import { User } from "../users/User.model.js";

export async function logAudit(data) {
  const {
    action,
    entity,
    entityName,
    changes,
    oldValue,
    newValue,
    userId,
    companyId,
    userName,
    userRole,
    ipAddress,
    userAgent
  } = data;

  let effectiveCompanyId = companyId;
  if (!effectiveCompanyId && userId) {
    const user = await User.findById(userId).select("companyId").lean();
    effectiveCompanyId = user?.companyId || null;
  }

  const auditLog = await AuditLog.create({
    action,
    entity,
    entityName,
    changes,
    oldValue,
    newValue,
    userId,
    companyId: effectiveCompanyId,
    userName,
    userRole,
    ipAddress,
    userAgent,
    createdAt: new Date()
  });

  return auditLog;
}

export async function getAuditLogs(options = {}) {
  const {
    limit = 50,
    skip = 0,
    entity,
    action,
    userId,
    startDate,
    endDate,
    companyId
  } = options;

  const query = companyId ? { companyId } : {};

  if (entity) query.entity = entity;
  if (action) query.action = action;
  if (userId) query.userId = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await AuditLog.find(query)
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await AuditLog.countDocuments(query);

  return {
    logs,
    total,
    limit,
    skip,
    pages: Math.ceil(total / limit)
  };
}

export async function getRecentLogs(limit = 10, companyId = null) {
  return AuditLog.find(companyId ? { companyId } : {})
    .populate("userId", "name email role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
