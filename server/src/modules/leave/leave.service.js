import { Leave } from "./Leave.model.js";
import { User } from "../users/User.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { ROLES } from "../../middleware/roles.js";

export async function createLeave(userId, data) {
  return Leave.create({ userId, ...data, status: "PENDING" });
}

export async function listMyLeaves(userId) {
  return Leave.find({ userId })
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 });
}

export async function listAllLeaves(userRole, userId, searchTerm = '', department = '') {
  let query = {};
  
  // HR can see all leaves except Admin leaves
  // Admin can see all leaves
  if (userRole === ROLES.HR) {
    const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
    const adminIds = adminUsers.map(u => u._id);
    query.userId = { $nin: adminIds };
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

export async function listHRLeaves() {
  // Get all leaves from HR staff only (for admin approval)
  const hrLeaves = await Leave.find()
    .populate("userId", "name email role")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
  
  // Filter only HR staff leaves
  return hrLeaves.filter(leave => leave.userId?.role === "HR");
}

export async function listUserLeaves() {
  // Get all leaves from regular users only (for HR approval)
  const userLeaves = await Leave.find()
    .populate("userId", "name email role")
    .populate("approvedBy", "name")
    .populate("rejectedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
  
  // Filter only USER role leaves
  return userLeaves.filter(leave => leave.userId?.role === "USER");
}

export async function updateLeave(id, patch) {
  const doc = await Leave.findByIdAndUpdate(id, { $set: patch }, { new: true });
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Leave not found");
  return doc;
}

export async function deleteLeave(id, userId) {
  const doc = await Leave.findOneAndDelete({ _id: id, userId });
  if (!doc) throw new ApiError(StatusCodes.NOT_FOUND, "Leave not found");
  return doc;
}