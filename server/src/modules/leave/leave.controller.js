import { asyncHandler } from "../../utils/asyncHandler.js";
import { createLeaveSchema, updateLeaveSchema } from "./leave.schemas.js";
import { createLeave, listMyLeaves, listAllLeaves, listHRLeaves, listUserLeaves, updateLeave, deleteLeave } from "./leave.service.js";
import { createBulkNotifications } from "../notifications/notification.service.js";
import { User } from "../users/User.model.js";
import { Leave } from "./Leave.model.js";
import { ROLES } from "../../middleware/roles.js";
import { notifyHRNewLeaveRequest, notifyUserLeaveStatus, getIO } from "../../utils/socket.js";

export const postLeave = asyncHandler(async (req, res) => {
  const data = createLeaveSchema.parse(req.body);
  const doc = await createLeave(req.user.id, data);
  
  // Real-time notification to HR/Admin
  const startDate = new Date(data.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate = new Date(data.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  notifyHRNewLeaveRequest(
    req.user.name,
    doc._id.toString(),
    startDate,
    endDate,
    data.reason || data.leaveType
  );
  
  // Notify user to refresh their leave balance
  const io = getIO();
  if (io) {
    io.to(`user_${req.user.id}`).emit("new_leave_request", {
      type: "leave_created",
      message: "Your leave request has been submitted",
      timestamp: new Date().toISOString()
    });
  }
  
  // Database notification for persistence
  const hrUsers = await User.find({ 
    role: { $in: [ROLES.HR, ROLES.ADMIN] },
    _id: { $ne: req.user.id }
  }).select('_id');
  
  if (hrUsers.length > 0) {
    await createBulkNotifications({
      userIds: hrUsers.map(u => u._id),
      type: "system",
      title: "New Leave Request",
      message: `Leave Request from ${req.user.name}: ${startDate} to ${endDate} (${data.reason || data.leaveType})`,
      targetUrl: `/leave/manage?highlight=${doc._id}`
    });
  }
  
  res.status(201).json({ leave: doc });
});

export const getMyLeaves = asyncHandler(async (req, res) => {
  const rows = await listMyLeaves(req.user.id);
  // Frontend expects the array directly in response.data
  res.json(rows);
});

export const getAllLeaves = asyncHandler(async (req, res) => {
  const { search = '', department = '' } = req.query;
  const rows = await listAllLeaves(req.user.role, req.user.id, search, department);
  res.json(rows);
});

export const getHRLeaves = asyncHandler(async (req, res) => {
  // Admin only - get all HR staff leaves for approval
  const rows = await listHRLeaves();
  res.json(rows);
});

export const getUserLeaves = asyncHandler(async (req, res) => {
  // HR only - get all user leaves for approval
  const rows = await listUserLeaves();
  res.json(rows);
});

export const patchLeave = asyncHandler(async (req, res) => {
  const patch = updateLeaveSchema.parse(req.body);
  
  // Get the leave to check user's role
  const leaveDoc = await Leave.findById(req.params.id).populate('userId', 'role');
  if (!leaveDoc) {
    return res.status(404).json({ message: 'Leave not found' });
  }
  
  // Role-based approval validation
  const userRole = leaveDoc.userId.role;
  const approverRole = req.user.role;
  
  // HR can only approve USER leaves
  if (approverRole === ROLES.HR && userRole !== ROLES.USER) {
    return res.status(403).json({ message: 'HR can only approve USER leave requests' });
  }
  
  // Admin can only approve HR leaves
  if (approverRole === ROLES.ADMIN && userRole !== ROLES.HR) {
    return res.status(403).json({ message: 'Admin can only approve HR leave requests' });
  }
  
  // Add approver/rejector info
  if (patch.status === 'APPROVED') {
    patch.approvedBy = req.user.id;
  } else if (patch.status === 'REJECTED') {
    patch.rejectedBy = req.user.id;
  }
  
  const doc = await updateLeave(req.params.id, patch);
  
  // Get leave details for notifications
  const leave = await Leave.findById(req.params.id).populate('userId', 'name');
  if (leave && leave.userId._id.toString() !== req.user.id) {
    const isApproved = patch.status === 'APPROVED';
    const startDate = new Date(leave.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(leave.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Real-time notification to user
    notifyUserLeaveStatus(
      leave.userId._id.toString(),
      patch.status,
      startDate,
      endDate,
      patch.rejectionReason
    );
    
    // Database notification for persistence
    const message = isApproved 
      ? `Your leave for ${startDate} to ${endDate} is Approved. Enjoy your break!`
      : `Your leave for ${startDate} to ${endDate} was Rejected. Reason: ${patch.rejectionReason || 'No reason provided'}.`;
    
    await createBulkNotifications({
      userIds: [leave.userId._id],
      type: "system",
      title: isApproved ? "Leave Approved ✅" : "Leave Rejected ❌",
      message,
      targetUrl: "/leave"
    });
  }
  
  res.json({ leave: doc });
});

export const deleteMyLeave = asyncHandler(async (req, res) => {
  const doc = await deleteLeave(req.params.id, req.user.id);
  
  // Notify user to refresh their leave balance
  const io = getIO();
  if (io) {
    io.to(`user_${req.user.id}`).emit("leave_deleted", {
      type: "leave_deleted",
      message: "Your leave request has been deleted",
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({ ok: true, leave: doc });
});