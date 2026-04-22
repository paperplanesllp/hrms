import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { User } from "./User.model.js";

export async function createUser(data) {
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new ApiError(StatusCodes.CONFLICT, "Email already exists");

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone || "",
    role: data.role,
    passwordHash,
    profileImageUrl: data.profileImageUrl || "",
    gender: data.gender || "",
    dateOfBirth: data.dateOfBirth || null,
    emergencyContact: data.emergencyContact || "",
    maritalStatus: data.maritalStatus || "",
    nationality: data.nationality || "",
    bloodGroup: data.bloodGroup || "",
    departmentId: data.departmentId || null,
    designationId: data.designationId || null,
    officeLatitude: data.officeLatitude || 0,
    officeLongitude: data.officeLongitude || 0
  });

  return user;
}

export async function listUsers(requestingUserRole = null, currentUserId = null, departmentId = null) {
  // Exclude terminated users from shared lists.
  // Everyone can assign tasks to ADMIN users as well.
  // HR can see all active staff (USER + HR + ADMIN) so they can assign tasks to themselves, peers, and admins.
  const query = {
    role: { $nin: ["TERMINATED"] },
    $or: [
      { accountType: { $ne: "TEMPORARY" } },
      { accountType: "TEMPORARY", approvalStatus: "APPROVED" },
    ],
  };
  
  // Filter by department if provided (for task reassignment to department members)
  if (departmentId) {
    query.departmentId = departmentId;
  }

  return User.find(query)
    .select("-passwordHash -refreshTokenHash")
    .sort({ createdAt: -1 });
}

export async function getUserById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID");
  }

  const user = await User.findById(id).select("-passwordHash -refreshTokenHash");
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  return user;
}

export async function updateUser(id, patch) {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: patch },
    { returnDocument: 'after' }
  ).select("-passwordHash -refreshTokenHash");

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new ApiError(StatusCodes.BAD_REQUEST, "Current password is incorrect");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
}

export async function listPendingTemporaryUsers() {
  return User.find({
    accountType: "TEMPORARY",
    approvalStatus: "PENDING",
  })
    .select("name email phone createdAt approvalStatus accountType")
    .sort({ createdAt: -1 });
}

export async function approveTemporaryUser(
  userId,
  approverId,
  approvalNote = "",
  officeLatitude = null,
  officeLongitude = null
) {
  const user = await User.findOne({ _id: userId, accountType: "TEMPORARY" });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "Temporary user not found");

  user.approvalStatus = "APPROVED";
  user.approvedBy = approverId;
  user.approvedAt = new Date();
  user.approvalNote = approvalNote || "Approved by HR";

  if (typeof officeLatitude === "number" && typeof officeLongitude === "number") {
    user.officeLatitude = officeLatitude;
    user.officeLongitude = officeLongitude;
  }

  await user.save();
  return user;
}

export async function rejectTemporaryUser(userId, approverId, approvalNote = "") {
  const user = await User.findOne({ _id: userId, accountType: "TEMPORARY" });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "Temporary user not found");

  user.approvalStatus = "REJECTED";
  user.approvedBy = approverId;
  user.approvedAt = new Date();
  user.approvalNote = approvalNote || "Rejected by HR";
  await user.save();
  return user;
}

export async function convertTemporaryToPermanent(userId, converterId, payload) {
  const user = await User.findOne({ _id: userId, accountType: "TEMPORARY" });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Temporary user not found");
  }

  if (user.approvalStatus !== "APPROVED") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only approved temporary users can be converted to permanent"
    );
  }

  const existingEmployeeId = await User.findOne({
    employeeId: payload.employeeId,
    _id: { $ne: userId },
  });

  if (existingEmployeeId) {
    throw new ApiError(StatusCodes.CONFLICT, "Employee ID already exists");
  }

  user.employeeId = payload.employeeId;
  user.departmentId = payload.departmentId || null;
  user.designationId = payload.designationId || null;
  user.salaryBand = payload.salaryBand;
  user.joiningDate = payload.joiningDate ? new Date(payload.joiningDate) : null;

  user.accountType = "EMPLOYEE";
  user.role = "USER";

  user.temporaryRecord = {
    wasTemporary: true,
    registeredAt: user.createdAt,
    approvedAt: user.approvedAt,
    approvedBy: user.approvedBy,
    approvalNote: user.approvalNote || "",
    convertedAt: new Date(),
    convertedBy: converterId,
  };

  await user.save();
  return user;
}