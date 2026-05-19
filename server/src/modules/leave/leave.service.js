import { Leave } from "./Leave.model.js";
import { User } from "../users/User.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { ROLES } from "../../middleware/roles.js";

async function getCompanyUserIds(companyId) {
  if (!companyId) return [];
  const users = await User.find({ companyId }).select("_id").lean();
  return users.map((u) => u._id);
}

export async function createLeave(userId, data, companyId) {
  if (!companyId) throw new ApiError(StatusCodes.FORBIDDEN, "Company context is required");
  return Leave.create({ userId, companyId, ...data, status: "PENDING" });
}

export async function listMyLeaves(userId, companyId) {
  return Leave.find({ userId, ...(companyId ? { companyId } : {}) })
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 });
}

export async function listAllLeaves(userRole, userId, searchTerm = '', department = '', companyId) {
  let query = companyId ? { companyId } : {};
  
  // Filter by company users
  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.userId = { $in: companyUserIds };
  }
  
  // HR can see all company leaves except Admin leaves
  // Admin can see all company leaves
  if (userRole === ROLES.HR) {
    const adminUsers = await User.find({ role: ROLES.ADMIN, companyId }).select('_id');
    const adminIds = adminUsers.map(u => u._id);
    query.userId = { ...query.userId, $nin: adminIds };
  }
  
  const leaves = await Leave.find(query)
    .populate("userId", "name email role profileImageUrl")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 });
  
  // Apply search and filter
  let filteredLeaves = leaves;
  
  if (searchTerm) {
    filteredLeaves = filteredLeaves.filter(leave => 
      leave.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  if (department) {
    filteredLeaves = filteredLeaves.filter(leave => 
      leave.userId?.role === department
    );
  }
  
  return filteredLeaves;
}

export async function listHRLeaves(companyId) {
  // Get all leaves from HR staff only (for admin approval) within company
  let query = companyId ? { companyId } : {};
  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.userId = { $in: companyUserIds };
  }
  
  const hrLeaves = await Leave.find(query)
    .populate("userId", "name email role")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
  
  // Filter only HR staff leaves
  return hrLeaves.filter(leave => leave.userId?.role === "HR");
}

export async function listUserLeaves(companyId) {
  // Get all leaves from regular users only (for HR approval) within company
  let query = companyId ? { companyId } : {};
  if (companyId) {
    const companyUserIds = await getCompanyUserIds(companyId);
    query.userId = { $in: companyUserIds };
  }
  
  const userLeaves = await Leave.find(query)
    .populate("userId", "name email role")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
  
  // Filter only USER role leaves
  return userLeaves.filter(leave => leave.userId?.role === "USER");
}

export async function updateLeave(id, patch, companyId) {
  const doc = await Leave.findOneAndUpdate({ _id: id, ...(companyId ? { companyId } : {}) }, { $set: patch }, { returnDocument: "after" });
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Leave not found");
  return doc;
}

export async function deleteLeave(id, userId, companyId) {
  const doc = await Leave.findOneAndDelete({ _id: id, userId, ...(companyId ? { companyId } : {}) });
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Leave not found");
  return doc;
}
