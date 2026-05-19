import dotenv from "dotenv";
import mongoose from "mongoose";

import { Company } from "../src/modules/companies/Company.model.js";
import { User } from "../src/modules/users/User.model.js";
import { Department } from "../src/modules/department/Department.model.js";
import { Designation } from "../src/modules/department/Designation.model.js";
import { Task } from "../src/modules/tasks/Task.model.js";
import SubTask from "../src/modules/tasks/SubTask.model.js";
import TaskHistory from "../src/modules/tasks/TaskHistory.model.js";
import ExtensionRequest from "../src/modules/tasks/ExtensionRequest.model.js";
import EmployeeProductivity from "../src/modules/tasks/EmployeeProductivity.model.js";
import { Attendance } from "../src/modules/attendance/Attendance.model.js";
import { Leave } from "../src/modules/leave/Leave.model.js";
import { Payroll } from "../src/modules/payroll/Payroll.model.js";
import { Worksheet } from "../src/modules/worksheet/Worksheet.model.js";
import { ActivityLog } from "../src/modules/activity/ActivityLog.model.js";
import { AuditLog } from "../src/modules/audit/AuditLog.model.js";
import { Chat } from "../src/modules/chat/Chat.model.js";
import { Message } from "../src/modules/chat/Message.model.js";
import { CallLog } from "../src/modules/calls/CallLog.model.js";
import { DocumentType } from "../src/modules/documents/DocumentType.model.js";
import { EmployeeDocument } from "../src/modules/documents/EmployeeDocument.model.js";
import Notification from "../src/modules/notifications/Notification.model.js";
import { Event } from "../src/modules/calendar/Event.model.js";
import { Calendar } from "../src/modules/calendar/Calendar.model.js";
import { Complaint } from "../src/modules/complaints/Complaint.model.js";
import { Policies } from "../src/modules/policies/Policies.model.js";
import Policy from "../src/modules/policy/Policy.model.js";
import { News } from "../src/modules/news/News.model.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");
const COMPANY_NAMES = ["Paperplanes", "Royal Gold Algo", "Testings"];
const COMPANY_NAME_ALIASES = {
  paperplanes: "Paperplanes",
  qq: "Royal Gold Algo",
  testing: "Testings",
};
const missingCompany = { $or: [{ companyId: { $exists: false } }, { companyId: null }] };

const totals = {
  migrated: {},
  missing: {},
  unresolved: {},
  suspicious: [],
};

function id(value) {
  return value ? String(value) : null;
}

function normalizeName(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function canonicalCompanyName(value = "") {
  const normalized = normalizeName(value);
  return COMPANY_NAME_ALIASES[normalized] || value;
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function addCount(bucket, name, count) {
  bucket[name] = (bucket[name] || 0) + count;
}

function recordUnresolved(label, doc, reason, category = "needsManual", metadata = {}) {
  addCount(totals.missing, label, 1);
  if (!totals.unresolved[label]) {
    totals.unresolved[label] = {
      orphanUnknown: 0,
      needsManual: 0,
      reasons: {},
      samples: [],
    };
  }
  const bucket = category === "orphanUnknown" ? "orphanUnknown" : "needsManual";
  totals.unresolved[label][bucket] += 1;
  totals.unresolved[label].reasons[reason] = (totals.unresolved[label].reasons[reason] || 0) + 1;
  if (totals.unresolved[label].samples.length < 10) {
    totals.unresolved[label].samples.push({
      id: id(doc?._id),
      reason,
      category: bucket,
      ...metadata,
    });
  }
}

async function updateOne(Model, doc, companyId, label, unresolvedReason = "no safe company inference", unresolvedCategory = "orphanUnknown", metadata = {}) {
  if (!companyId) {
    recordUnresolved(label, doc, unresolvedReason, unresolvedCategory, metadata);
    return;
  }

  addCount(totals.migrated, label, 1);
  if (APPLY) {
    await Model.updateOne(
      { _id: doc._id, ...missingCompany },
      { $set: { companyId } }
    );
  }
}

async function companyIdForUser(userId, usersById) {
  if (!userId) return null;
  const user = usersById.get(id(userId));
  return user?.companyId ? id(user.companyId) : null;
}

async function uniqueCompanyIdsForUsers(userIds, usersById) {
  const ids = new Set();
  for (const userId of userIds.filter(Boolean)) {
    const companyId = await companyIdForUser(userId, usersById);
    if (companyId) ids.add(companyId);
  }
  return [...ids];
}

async function companyIdForTask(taskId, tasksById = null) {
  if (!taskId) return null;
  const fromMap = tasksById?.get(id(taskId));
  if (fromMap?.companyId) return id(fromMap.companyId);
  const task = await Task.findOne({ _id: taskId, companyId: { $ne: null } }).select("companyId").lean();
  return task?.companyId ? id(task.companyId) : null;
}

async function loadCompanyTasksById() {
  const tasks = await Task.find({ companyId: { $ne: null } }).select("_id companyId").lean();
  return new Map(tasks.map((task) => [id(task._id), task]));
}

function logSuspicious(label, doc, reason, companies = []) {
  totals.suspicious.push({
    collection: label,
    id: id(doc._id),
    reason,
    companyIds: companies,
  });
}

async function loadUsersById() {
  const users = await User.find({}).select("_id email companyId departmentId designationId role name").lean();
  return new Map(users.map((user) => [id(user._id), user]));
}

function domainFromEmail(email = "") {
  return String(email).split("@")[1]?.toLowerCase() || "";
}

function companyForEmail(user, companies) {
  const domain = domainFromEmail(user.email);
  if (!domain) return null;

  return companies.find((company) => {
    const values = [company.domain, company.contactEmail, company.website, company.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return values.some((value) => value.includes(domain) || domain.includes(value));
  })?._id || null;
}

async function backfillUsers(companies) {
  const departments = await Department.find({ companyId: { $ne: null } }).select("_id companyId").lean();
  const designations = await Designation.find({ companyId: { $ne: null } }).select("_id companyId").lean();
  const deptCompany = new Map(departments.map((d) => [id(d._id), id(d.companyId)]));
  const designationCompany = new Map(designations.map((d) => [id(d._id), id(d.companyId)]));

  const users = await User.find({ ...missingCompany, role: { $ne: "SUPERADMIN" } })
    .select("_id email departmentId designationId")
    .lean();

  for (const user of users) {
    const candidates = [
      companyForEmail(user, companies),
      deptCompany.get(id(user.departmentId)),
      designationCompany.get(id(user.designationId)),
    ].filter(Boolean);

    const unique = [...new Set(candidates.map(String))];
    if (unique.length === 1) {
      await updateOne(User, user, unique[0], "User");
    } else if (unique.length > 1) {
      logSuspicious("User", user, "conflicting company inference", unique);
      recordUnresolved("User", user, "conflicting company inference", "needsManual", { companyIds: unique });
    } else {
      recordUnresolved("User", user, "no email-domain/department/designation company match", "orphanUnknown");
    }
  }
}

async function backfillByUser(Model, label, userField, usersById, extra = {}) {
  const docs = await Model.find({ ...missingCompany, ...extra }).select(`_id ${userField}`).lean();
  for (const doc of docs) {
    await updateOne(Model, doc, await companyIdForUser(doc[userField], usersById), label, `${userField} missing or belongs to deleted/unlinked user`, "orphanUnknown", { [userField]: id(doc[userField]) });
  }
}

async function backfillTasks(usersById) {
  const tasks = await Task.find(missingCompany).select("_id assignedBy assignedTo department").lean();
  const departments = await Department.find({ companyId: { $ne: null } }).select("_id companyId").lean();
  const deptCompany = new Map(departments.map((d) => [id(d._id), id(d.companyId)]));

  for (const task of tasks) {
    const companies = await uniqueCompanyIdsForUsers([task.assignedBy, ...asArray(task.assignedTo)], usersById);
    if (task.department && deptCompany.has(id(task.department))) companies.push(deptCompany.get(id(task.department)));
    const unique = [...new Set(companies)];

    if (unique.length === 1) await updateOne(Task, task, unique[0], "Task");
    else if (unique.length > 1) {
      logSuspicious("Task", task, "assigned users/department point to multiple companies", unique);
      recordUnresolved("Task", task, "assigned users/department point to multiple companies", "needsManual", { companyIds: unique });
    } else {
      recordUnresolved("Task", task, "no assignedBy/assignedTo/department company reference", "orphanUnknown", {
        assignedBy: id(task.assignedBy),
        assignedToCount: asArray(task.assignedTo).length,
        department: id(task.department),
      });
    }
  }
}

async function backfillFromTask(Model, label, taskField = "taskId") {
  const docs = await Model.find(missingCompany).select(`_id ${taskField}`).lean();
  const taskIds = docs.map((doc) => doc[taskField]).filter(Boolean);
  const tasks = await Task.find({ _id: { $in: taskIds }, companyId: { $ne: null } }).select("_id companyId").lean();
  const taskCompany = new Map(tasks.map((task) => [id(task._id), id(task.companyId)]));

  for (const doc of docs) {
    await updateOne(Model, doc, taskCompany.get(id(doc[taskField])), label, `${taskField} missing or task has no companyId`, "orphanUnknown", { [taskField]: id(doc[taskField]) });
  }
}

async function backfillChats(usersById) {
  const chats = await Chat.find(missingCompany).select("_id participants createdBy groupAdmin").lean();
  for (const chat of chats) {
    const companies = await uniqueCompanyIdsForUsers(
      [...(chat.participants || []), chat.createdBy, chat.groupAdmin],
      usersById
    );
    if (companies.length === 1) await updateOne(Chat, chat, companies[0], "Chat");
    else if (companies.length > 1) {
      logSuspicious("Chat", chat, "participants span multiple companies", companies);
      recordUnresolved("Chat", chat, "participants span multiple companies", "needsManual", { companyIds: companies });
    } else recordUnresolved("Chat", chat, "no participant/admin company reference", "orphanUnknown");
  }
}

async function backfillMessages(usersById) {
  const messages = await Message.find(missingCompany).select("_id chatId sender readBy").lean();
  const chats = await Chat.find({ _id: { $in: messages.map((m) => m.chatId).filter(Boolean) }, companyId: { $ne: null } })
    .select("_id companyId")
    .lean();
  const chatCompany = new Map(chats.map((chat) => [id(chat._id), id(chat.companyId)]));

  for (const message of messages) {
    const companies = [
      chatCompany.get(id(message.chatId)),
      ...(await uniqueCompanyIdsForUsers([message.sender, ...asArray(message.readBy)], usersById)),
    ].filter(Boolean);
    const unique = [...new Set(companies)];
    if (unique.length === 1) await updateOne(Message, message, unique[0], "Message");
    else if (unique.length > 1) recordUnresolved("Message", message, "chat/sender/readBy point to multiple companies", "needsManual", { companyIds: unique });
    else recordUnresolved("Message", message, "chat missing companyId and sender/readBy user references unresolved", "orphanUnknown", { chatId: id(message.chatId), sender: id(message.sender) });
  }
}

async function backfillCallLogs(usersById) {
  const calls = await CallLog.find(missingCompany).select("_id caller receiver initiatedBy endedBy conversationId").lean();
  const chatIds = calls.map((call) => call.conversationId).filter(Boolean);
  const chats = await Chat.find({ _id: { $in: chatIds }, companyId: { $ne: null } }).select("_id companyId").lean();
  const chatCompany = new Map(chats.map((chat) => [id(chat._id), id(chat.companyId)]));

  for (const call of calls) {
    const companies = [
      ...(await uniqueCompanyIdsForUsers([call.caller, call.receiver, call.initiatedBy, call.endedBy], usersById)),
      chatCompany.get(id(call.conversationId)),
    ].filter(Boolean);
    const unique = [...new Set(companies)];

    if (unique.length === 1) await updateOne(CallLog, call, unique[0], "CallLog");
    else if (unique.length > 1) {
      logSuspicious("CallLog", call, "participants/chat point to multiple companies", unique);
      recordUnresolved("CallLog", call, "participants/chat point to multiple companies", "needsManual", { companyIds: unique });
    } else recordUnresolved("CallLog", call, "no caller/receiver/chat company reference", "orphanUnknown");
  }
}

async function backfillActivityLogs(usersById, tasksById) {
  const logs = await ActivityLog.find(missingCompany).select("_id actorId targetUserId metadata").lean();
  for (const log of logs) {
    const metadata = log.metadata || {};
    const companies = [
      ...(await uniqueCompanyIdsForUsers([log.actorId, log.targetUserId, metadata.userId, metadata.employeeId], usersById)),
      await companyIdForTask(metadata.taskId || metadata.task?._id || metadata.task, tasksById),
    ].filter(Boolean);
    const unique = [...new Set(companies)];
    if (unique.length === 1) await updateOne(ActivityLog, log, unique[0], "ActivityLog");
    else if (unique.length > 1) recordUnresolved("ActivityLog", log, "actor/target/metadata point to multiple companies", "needsManual", { companyIds: unique });
    else recordUnresolved("ActivityLog", log, "actor/target users deleted or metadata has no company-bearing reference", "orphanUnknown", { actorId: id(log.actorId), targetUserId: id(log.targetUserId) });
  }
}

async function backfillNotifications(usersById, tasksById) {
  const notifications = await Notification.find(missingCompany).select("_id userId triggeredBy taskId").lean();
  for (const notification of notifications) {
    const companies = [
      ...(await uniqueCompanyIdsForUsers([notification.userId, notification.triggeredBy], usersById)),
      await companyIdForTask(notification.taskId, tasksById),
    ].filter(Boolean);
    const unique = [...new Set(companies)];
    if (unique.length === 1) await updateOne(Notification, notification, unique[0], "Notification");
    else if (unique.length > 1) recordUnresolved("Notification", notification, "recipient/trigger/task point to multiple companies", "needsManual", { companyIds: unique });
    else recordUnresolved("Notification", notification, "recipient/trigger users deleted and task missing/no companyId", "orphanUnknown", { userId: id(notification.userId), taskId: id(notification.taskId) });
  }
}

async function backfillDocumentTypes(usersById) {
  const docs = await DocumentType.find(missingCompany).select("_id createdBy departmentIds").lean();
  const departments = await Department.find({ companyId: { $ne: null } }).select("_id companyId").lean();
  const deptCompany = new Map(departments.map((d) => [id(d._id), id(d.companyId)]));

  for (const doc of docs) {
    const companies = [
      await companyIdForUser(doc.createdBy, usersById),
      ...(doc.departmentIds || []).map((deptId) => deptCompany.get(id(deptId))),
    ].filter(Boolean);
    const unique = [...new Set(companies)];
    if (unique.length === 1) await updateOne(DocumentType, doc, unique[0], "DocumentType");
    else if (unique.length > 1) {
      logSuspicious("DocumentType", doc, "creator/departments point to multiple companies", unique);
      recordUnresolved("DocumentType", doc, "creator/departments point to multiple companies", "needsManual", { companyIds: unique });
    } else recordUnresolved("DocumentType", doc, "creator deleted/unlinked and departments unresolved", "orphanUnknown");
  }
}

async function backfillEmployeeDocuments(usersById) {
  const docs = await EmployeeDocument.find(missingCompany).select("_id employeeId documentTypeId reviewedBy").lean();
  const docTypes = await DocumentType.find({ _id: { $in: docs.map((d) => d.documentTypeId).filter(Boolean) }, companyId: { $ne: null } })
    .select("_id companyId")
    .lean();
  const typeCompany = new Map(docTypes.map((type) => [id(type._id), id(type.companyId)]));

  for (const doc of docs) {
    const companies = [
      await companyIdForUser(doc.employeeId, usersById),
      await companyIdForUser(doc.reviewedBy, usersById),
      typeCompany.get(id(doc.documentTypeId)),
    ].filter(Boolean);
    const unique = [...new Set(companies)];
    if (unique.length === 1) await updateOne(EmployeeDocument, doc, unique[0], "EmployeeDocument");
    else if (unique.length > 1) {
      logSuspicious("EmployeeDocument", doc, "employee/reviewer/type point to multiple companies", unique);
      recordUnresolved("EmployeeDocument", doc, "employee/reviewer/type point to multiple companies", "needsManual", { companyIds: unique });
    } else recordUnresolved("EmployeeDocument", doc, "employee/reviewer deleted and document type unresolved", "orphanUnknown");
  }
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`[tenant-backfill] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const allCompanies = await Company.find({}).lean();
  const requiredNames = new Set(COMPANY_NAMES.map(normalizeName));
  const companies = allCompanies
    .map((company) => ({ ...company, canonicalName: canonicalCompanyName(company.name) }))
    .filter((company) => requiredNames.has(normalizeName(company.canonicalName)));
  const foundNames = new Set(companies.map((company) => normalizeName(company.canonicalName)));
  const missingCompanies = COMPANY_NAMES.filter((name) => !foundNames.has(normalizeName(name)));
  if (missingCompanies.length) {
    const availableNames = allCompanies.map((company) => company.name).join(", ");
    throw new Error(`Required companies not found: ${missingCompanies.join(", ")}. Available companies: ${availableNames}`);
  }

  console.log("[tenant-backfill] companies", companies.map((c) => `${c.name}->${c.canonicalName}:${c._id}`).join(", "));

  await backfillUsers(companies);
  let usersById = await loadUsersById();

  await backfillTasks(usersById);
  const tasksById = await loadCompanyTasksById();
  await backfillByUser(Attendance, "Attendance", "userId", usersById);
  await backfillByUser(Leave, "Leave", "userId", usersById);
  await backfillByUser(Payroll, "Payroll", "userId", usersById);
  await backfillByUser(Worksheet, "Worksheet", "userId", usersById);
  await backfillActivityLogs(usersById, tasksById);
  await backfillByUser(AuditLog, "AuditLog", "userId", usersById);
  await backfillNotifications(usersById, tasksById);
  await backfillByUser(EmployeeProductivity, "EmployeeProductivity", "employeeId", usersById);

  await backfillFromTask(SubTask, "SubTask");
  await backfillFromTask(TaskHistory, "TaskHistory");
  await backfillFromTask(ExtensionRequest, "ExtensionRequest");
  await backfillChats(usersById);
  await backfillMessages(usersById);
  await backfillCallLogs(usersById);
  await backfillDocumentTypes(usersById);
  await backfillEmployeeDocuments(usersById);
  await backfillByUser(Event, "Event", "userId", usersById);
  await backfillByUser(Complaint, "Complaint", "userId", usersById);
  await backfillByUser(Policies, "Policies", "createdBy", usersById);
  await backfillByUser(Policy, "Policy", "createdBy", usersById);
  await backfillByUser(News, "News", "createdBy", usersById);

  const designationDocs = await Designation.find(missingCompany).select("_id departmentId").lean();
  const departments = await Department.find({ companyId: { $ne: null } }).select("_id companyId").lean();
  const deptCompany = new Map(departments.map((d) => [id(d._id), id(d.companyId)]));
  for (const designation of designationDocs) {
    await updateOne(Designation, designation, deptCompany.get(id(designation.departmentId)), "Designation");
  }

  const calendarDocs = await Calendar.find(missingCompany).select("_id").lean().catch(() => []);
  if (calendarDocs.length) {
    for (const calendar of calendarDocs) {
      recordUnresolved("Calendar", calendar, "Calendar model is global by date and has no user/task/company reference", "needsManual");
    }
  }

  console.log("[tenant-backfill] safely-migratable", JSON.stringify(totals.migrated, null, 2));
  console.log("[tenant-backfill] orphan-or-unknown", JSON.stringify(
    Object.fromEntries(Object.entries(totals.unresolved).map(([label, value]) => [label, value.orphanUnknown])),
    null,
    2
  ));
  console.log("[tenant-backfill] needs-manual-decision", JSON.stringify(
    Object.fromEntries(Object.entries(totals.unresolved).map(([label, value]) => [label, value.needsManual])),
    null,
    2
  ));
  console.log("[tenant-backfill] unresolved-details", JSON.stringify(totals.unresolved, null, 2));
  console.log("[tenant-backfill] records-still-missing-companyId", JSON.stringify(totals.missing, null, 2));
  console.log("[tenant-backfill] suspicious-cross-company-records", JSON.stringify(totals.suspicious, null, 2));
  console.log(APPLY ? "[tenant-backfill] completed with writes" : "[tenant-backfill] dry run only; rerun with --apply to write");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("[tenant-backfill] failed", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
