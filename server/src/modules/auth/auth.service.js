import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { User } from "../users/User.model.js";
import { ROLES } from "../../middleware/roles.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/tokens.js";
import { createActivityLog } from "../activity/activity.service.js";

export async function signup({ name, email, phone, password }) {
  console.log("🔄 SIGNUP SERVICE STARTED with:", { name, email, phone });
  
  const normalizedEmail = email.toLowerCase().trim();
  console.log("📧 Normalized email:", normalizedEmail);

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    console.log("🔍 Checking existing user...");
    
    if (existing) {
      console.error("⚠️ Email already exists:", normalizedEmail);
      throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
    }

    console.log("✅ Email is unique, creating user...");
    // ✅ Hash password before creating user
    const passwordHash = await bcrypt.hash(password, 10);
    
    // ✅ Create user (force role=USER for public signup)
    const user = await User.create({
      name,
      email: normalizedEmail,
      phone: phone || "",
      passwordHash,
      role: ROLES.USER,
    });
    console.log("✅ User created:", user._id);

    const payload = { id: String(user._id), role: user.role, name: user.name };

    console.log("🔑 Generating tokens...");
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    console.log("✅ Tokens generated");

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();
    console.log("✅ Refresh token hash saved");

    console.log("✅ SIGNUP COMPLETED SUCCESSFULLY");
    return {
      accessToken,
      refreshToken,
      user: {
        id: String(user._id),
        name: user.name,
        role: user.role,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
      },
    };
  } catch (error) {
    console.error("❌ SIGNUP ERROR:", error.message);
    throw error;
  }
}

export async function login(email, password) {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");

  // Check if account is locked
  if (user.accountLocked && user.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(StatusCodes.LOCKED, "Account temporarily locked due to failed login attempts");
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    // Increment failed attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    
    if (user.failedLoginAttempts >= 5) {
      user.accountLocked = true;
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    
    await user.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
  }

  // Reset failed attempts on successful login
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.accountLocked = false;
    user.lockUntil = undefined;
  }

  // Mark user as active on login
  user.isActive = true;
  await user.save();

  const payload = { id: String(user._id), role: user.role, name: user.name };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  await user.save();

  // Log the login activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "LOGIN",
    module: "AUTH",
    description: `${user.role} ${user.name} logged in`,
    metadata: { email: user.email },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: String(user._id),
      name: user.name,
      role: user.role,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
    },
  };
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
  }

  const user = await User.findById(payload.id);
  if (!user || !user.refreshTokenHash)
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Session expired");

  const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!match) throw new ApiError(StatusCodes.UNAUTHORIZED, "Session expired");

  const newPayload = { id: String(user._id), role: user.role, name: user.name };
  const newAccess = signAccessToken(newPayload);
  return { 
    accessToken: newAccess,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  };
}

export async function logout(userId) {
  // Get user details for activity logging
  const user = await User.findById(userId);
  
  // Clear refresh token and mark user as inactive
  await User.findByIdAndUpdate(userId, { 
    $set: { 
      refreshTokenHash: "",
      isActive: false,
      lastLocationUpdate: new Date()
    } 
  });

  // Log the logout activity
  if (user) {
    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "LOGOUT",
      module: "AUTH",
      description: `${user.role} ${user.name} logged out`,
      metadata: { email: user.email },
    });
  }
}

export async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Email not found in our system");
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  // In production, send email with resetToken
  console.log(`Reset token for ${email}: ${resetToken}`);
  
  return { message: "Reset link sent to your email", resetToken }; // Remove resetToken in production
}

export async function resetPassword(token, newPassword) {
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid or expired reset token");
  }

  // Additional security: Check if token was used recently
  const tokenAge = Date.now() - (user.resetPasswordExpires.getTime() - 10 * 60 * 1000);
  if (tokenAge < 60000) { // 1 minute minimum between requests
    throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, "Please wait before requesting another reset");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12); // Increased salt rounds
  user.resetPasswordToken = "";
  user.resetPasswordExpires = undefined;
  user.refreshTokenHash = ""; // Invalidate all sessions
  await user.save();

  return { message: "Password reset successful" };
}