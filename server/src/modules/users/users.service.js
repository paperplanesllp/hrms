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

export async function listUsers(requestingUserRole = null, currentUserId = null) {
  // Exclude terminated users and ADMIN accounts from shared lists.
  // HR can see all active staff (USER + HR) so they can assign tasks to themselves and peers.
  const query = { role: { $nin: ["TERMINATED", "ADMIN"] } };

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