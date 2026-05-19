import { Company } from "./Company.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { createUser } from "../users/users.service.js";
import { ROLES } from "../../middleware/roles.js";
import { User } from "../users/User.model.js";
import mongoose from "mongoose";
import { Department } from "../department/Department.model.js";
import { Designation } from "../department/Designation.model.js";
import { Attendance } from "../attendance/Attendance.model.js";
import { Leave } from "../leave/Leave.model.js";
import { Payroll } from "../payroll/Payroll.model.js";
import Notification from "../notifications/Notification.model.js";
import { Policies } from "../policies/Policies.model.js";
import Policy from "../policy/Policy.model.js";
import { Event } from "../calendar/Event.model.js";
import { Complaint } from "../complaints/Complaint.model.js";
import { Worksheet } from "../worksheet/Worksheet.model.js";
import { EmployeeDocument } from "../documents/EmployeeDocument.model.js";
import { DocumentType } from "../documents/DocumentType.model.js";
import { Task } from "../tasks/Task.model.js";
import SubTask from "../tasks/SubTask.model.js";
import TaskHistory from "../tasks/TaskHistory.model.js";
import EmployeeProductivity from "../tasks/EmployeeProductivity.model.js";
import { ActivityLog } from "../activity/ActivityLog.model.js";
import { AuditLog } from "../audit/AuditLog.model.js";
import { Chat } from "../chat/Chat.model.js";
import { Message } from "../chat/Message.model.js";
import { CallLog } from "../calls/CallLog.model.js";
import { News } from "../news/News.model.js";
import { LeaveType } from "../leaveType/LeaveType.model.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCompanies() {
  return await Company.find().sort({ createdAt: -1 });
}

export async function listCompaniesWithAdmins() {
  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  const companyIds = companies.map((company) => company._id);

  const admins = await User.find({
    companyId: { $in: companyIds },
    role: ROLES.ADMIN,
    isDeleted: { $ne: true },
  })
    .select("name email companyId")
    .lean();

  const adminsByCompany = new Map();
  for (const admin of admins) {
    const key = String(admin.companyId || "");
    if (!adminsByCompany.has(key)) adminsByCompany.set(key, []);
    adminsByCompany.get(key).push({
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
    });
  }

  return companies.map((company) => ({
    ...company,
    admins: adminsByCompany.get(String(company._id)) || [],
  }));
}

export async function createCompany(data, actorId) {
  const name = String(data.name || "").trim();
  const domain = String(data.domain || "").trim().toLowerCase();

  if (!name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company name is required");
  }

  const existingByName = await Company.findOne({
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  });

  if (existingByName) {
    throw new ApiError(StatusCodes.CONFLICT, "Company name already exists");
  }

  if (domain) {
    const existingByDomain = await Company.findOne({ domain });
    if (existingByDomain) {
      throw new ApiError(StatusCodes.CONFLICT, "Company domain already exists");
    }
  }

  const company = new Company({
    name,
    domain: domain || undefined,
    contactEmail: String(data.contactEmail || "").trim().toLowerCase(),
    contactPhone: String(data.contactPhone || "").trim(),
    address: String(data.address || "").trim(),
    createdBy: actorId || null,
  });

  return await company.save();
}

export async function createCompanyAdmin(companyId, payload) {
  if (!companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company is required");
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Company not found");
  }

  const user = await createUser({
    name: payload.name,
    email: String(payload.email || "").trim().toLowerCase(),
    phone: payload.phone || "",
    role: ROLES.ADMIN,
    password: payload.password,
    companyId,
  });

  return user;
}

function isTransactionUnsupported(error) {
  const message = String(error?.message || "");
  return (
    error?.code === 20 ||
    error?.codeName === "IllegalOperation" ||
    message.includes("Transaction numbers are only allowed") ||
    message.includes("replica set member or mongos") ||
    message.includes("Transaction") && message.includes("not supported")
  );
}

async function deleteManyAndCount(model, filter, session) {
  const result = await model.deleteMany(filter, session ? { session } : undefined);
  return result.deletedCount || 0;
}

async function deleteCollectionManyAndCount(collectionName, filter, session) {
  const collection = mongoose.connection.collection(collectionName);
  const result = await collection.deleteMany(filter, session ? { session } : undefined);
  return result.deletedCount || 0;
}

async function runCompanyDelete(companyId, session = null) {
  const company = await Company.findById(companyId).session(session);
  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Company not found");
  }

  const companyObjectId = company._id;
  const userIds = await User.find({ companyId: companyObjectId })
    .session(session)
    .distinct("_id");
  const taskIds = await Task.find({ companyId: companyObjectId })
    .session(session)
    .distinct("_id");
  const worksheetIds = userIds.length
    ? await Worksheet.find({ userId: { $in: userIds } }).session(session).distinct("_id")
    : [];
  const chatIds = userIds.length
    ? await Chat.find({ participants: { $in: userIds } }).session(session).distinct("_id")
    : [];

  const counts = {};
  const record = async (name, countPromise) => {
    counts[name] = await countPromise;
  };

  const userScoped = userIds.length ? { $in: userIds } : { $in: [] };
  const taskScoped = taskIds.length ? { $in: taskIds } : { $in: [] };
  const worksheetScoped = worksheetIds.length ? { $in: worksheetIds } : { $in: [] };
  const chatScoped = chatIds.length ? { $in: chatIds } : { $in: [] };

  await record("notifications", deleteManyAndCount(Notification, {
    $or: [
      { userId: userScoped },
      { triggeredBy: userScoped },
      { taskId: taskScoped },
    ],
  }, session));
  await record("messages", deleteManyAndCount(Message, {
    $or: [
      { chatId: chatScoped },
      { sender: userScoped },
      { readBy: userScoped },
    ],
  }, session));
  await record("callLogs", deleteManyAndCount(CallLog, {
    $or: [
      { caller: userScoped },
      { receiver: userScoped },
      { initiatedBy: userScoped },
      { endedBy: userScoped },
      { conversationId: chatScoped },
    ],
  }, session));
  await record("chats", deleteManyAndCount(Chat, { _id: chatScoped }, session));
  await record("taskHistory", deleteManyAndCount(TaskHistory, {
    $or: [
      { taskId: taskScoped },
      { performedBy: userScoped },
      { fromUser: userScoped },
      { toUser: userScoped },
    ],
  }, session));
  await record("subTasks", deleteManyAndCount(SubTask, {
    $or: [
      { taskId: taskScoped },
      { assignedTo: userScoped },
    ],
  }, session));
  await record("taskExtensionRequests", deleteCollectionManyAndCount("extensionrequests", {
    $or: [
      { taskId: taskScoped },
      { requestedBy: userScoped },
      { requestedFrom: userScoped },
      { approvedBy: userScoped },
      { worksheetId: worksheetScoped },
      { userId: userScoped },
    ],
  }, session));
  await record("employeeProductivity", deleteManyAndCount(EmployeeProductivity, {
    employeeId: userScoped,
  }, session));
  await record("tasks", deleteManyAndCount(Task, { companyId: companyObjectId }, session));
  await record("attendance", deleteManyAndCount(Attendance, { userId: userScoped }, session));
  await record("leaves", deleteManyAndCount(Leave, {
    $or: [
      { userId: userScoped },
      { approvedBy: userScoped },
      { rejectedBy: userScoped },
    ],
  }, session));
  await record("payroll", deleteManyAndCount(Payroll, {
    $or: [
      { userId: userScoped },
      { createdBy: userScoped },
      { updatedBy: userScoped },
    ],
  }, session));
  await record("worksheets", deleteManyAndCount(Worksheet, { userId: userScoped }, session));
  await record("employeeDocuments", deleteManyAndCount(EmployeeDocument, {
    $or: [
      { employeeId: userScoped },
      { reviewedBy: userScoped },
    ],
  }, session));
  await record("documentTypes", deleteManyAndCount(DocumentType, {
    $or: [
      { createdBy: userScoped },
      { departmentIds: { $in: await Department.find({ companyId: companyObjectId }).session(session).distinct("_id") } },
    ],
  }, session));
  await record("complaints", deleteManyAndCount(Complaint, {
    $or: [
      { companyId: companyObjectId },
      { userId: userScoped },
      { repliedBy: userScoped },
    ],
  }, session));
  await record("events", deleteManyAndCount(Event, {
    $or: [
      { companyId: companyObjectId },
      { userId: userScoped },
    ],
  }, session));
  await record("policies", deleteManyAndCount(Policies, {
    $or: [
      { companyId: companyObjectId },
      { createdBy: userScoped },
      { updatedBy: userScoped },
    ],
  }, session));
  await record("policy", deleteManyAndCount(Policy, {
    $or: [
      { companyId: companyObjectId },
      { createdBy: userScoped },
      { updatedBy: userScoped },
    ],
  }, session));
  await record("news", deleteManyAndCount(News, { createdBy: userScoped }, session));
  await record("leaveTypes", deleteManyAndCount(LeaveType, { createdBy: userScoped }, session));
  await record("auditLogs", deleteManyAndCount(AuditLog, { userId: userScoped }, session));
  await record("activityLogs", deleteManyAndCount(ActivityLog, {
    $or: [
      { actorId: userScoped },
      { targetUserId: userScoped },
    ],
  }, session));
  await record("designations", deleteManyAndCount(Designation, { companyId: companyObjectId }, session));
  await record("departments", deleteManyAndCount(Department, { companyId: companyObjectId }, session));
  await record("users", deleteManyAndCount(User, { companyId: companyObjectId }, session));
  await record("companies", deleteManyAndCount(Company, { _id: companyObjectId }, session));

  console.info("[COMPANY_DELETE] Deleted company data", {
    companyId: String(companyObjectId),
    companyName: company.name,
    counts,
  });

  return { company, counts };
}

export async function updateCompany(companyId, data) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Company not found");
  }

  const name = data.name !== undefined ? String(data.name || "").trim() : undefined;
  const domain = data.domain !== undefined ? String(data.domain || "").trim().toLowerCase() : undefined;

  if (name) {
    const existingByName = await Company.findOne({
      _id: { $ne: companyId },
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    if (existingByName) {
      throw new ApiError(StatusCodes.CONFLICT, "Company name already exists");
    }
  }

  if (domain) {
    const existingByDomain = await Company.findOne({ _id: { $ne: companyId }, domain });
    if (existingByDomain) {
      throw new ApiError(StatusCodes.CONFLICT, "Company domain already exists");
    }
  }

  if (data.name !== undefined) company.name = name;
  if (data.domain !== undefined) company.domain = domain || undefined;
  if (data.contactEmail !== undefined) company.contactEmail = String(data.contactEmail || "").trim().toLowerCase();
  if (data.contactPhone !== undefined) company.contactPhone = String(data.contactPhone || "").trim();
  if (data.address !== undefined) company.address = String(data.address || "").trim();
  if (data.isActive !== undefined) company.isActive = data.isActive;

  await company.save();
  return company;
}

export async function deleteCompany(companyId) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid company ID");
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await runCompanyDelete(companyId, session);
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      console.warn("[COMPANY_DELETE] MongoDB transactions are unavailable; running scoped cleanup without a transaction", {
        companyId,
        reason: error.message,
      });
      return await runCompanyDelete(companyId);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
