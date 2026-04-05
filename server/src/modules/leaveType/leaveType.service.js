import { LeaveType } from "./LeaveType.model.js";

export const createLeaveType = async (data) => {
  const leaveType = new LeaveType(data);
  return leaveType.save();
};

export const getAllLeaveTypes = async () => {
  return LeaveType.find({ isActive: true }).select("_id name description color icon maxDaysPerYear requiresApproval");
};

export const getLeaveTypeById = async (id) => {
  return LeaveType.findById(id);
};

export const updateLeaveType = async (id, data) => {
  return LeaveType.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteLeaveType = async (id) => {
  // Soft delete - set isActive to false
  return LeaveType.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

export const getLeaveTypeByName = async (name) => {
  return LeaveType.findOne({ name, isActive: true });
};
