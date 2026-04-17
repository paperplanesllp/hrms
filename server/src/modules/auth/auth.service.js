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
import { sendTemporaryOtpEmail } from "../../utils/otpEmailService.js";
import { env } from "../../config/env.js";

function normalizePhone(phone = "") {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function signup({ name, email, phone, password, rememberMe = false }) {
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
      accountType: "EMPLOYEE",
      approvalStatus: "APPROVED",
    });
    console.log("✅ User created:", user._id);

    const payload = { id: String(user._id), role: user.role, name: user.name };

    console.log("🔑 Generating tokens...");
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload, rememberMe);
    console.log("✅ Tokens generated");

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.rememberMeEnabled = rememberMe || false;
    await user.save();
    console.log("✅ Refresh token hash saved");

    console.log("✅ SIGNUP COMPLETED SUCCESSFULLY");
    return {
      accessToken,
      refreshToken,
      rememberMe,
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

export async function login(email, password, rememberMe = false) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");

  if (user.accountType === "TEMPORARY") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Temporary account must sign in with email OTP"
    );
  }

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
  const refreshToken = signRefreshToken(payload, rememberMe);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  user.rememberMeEnabled = rememberMe || false;
  await user.save();

  // Log the login activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "LOGIN",
    module: "AUTH",
    description: `${user.role} ${user.name} logged in${rememberMe ? ' (Remember Me enabled)' : ''}`,
    metadata: { email: user.email, rememberMe },
  });

  return {
    accessToken,
    refreshToken,
    rememberMe,
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
  
  // ✅ REFRESH TOKEN ROTATION: Generate new refresh token on each refresh
  const newRefreshToken = signRefreshToken(newPayload, user.rememberMeEnabled);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
  await user.save();

  return { 
    accessToken: newAccess,
    refreshToken: newRefreshToken,
    rememberMe: user.rememberMeEnabled,
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

export async function registerTemporaryUser({ name, email, phone = "" }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
  }

  const normalizedPhone = normalizePhone(phone);

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    throw new ApiError(StatusCodes.CONFLICT, "Email already exists");
  }

  if (normalizedPhone) {
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "This phone number is already registered"
      );
    }
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone: normalizedPhone,
    role: ROLES.USER,
    passwordHash,
    accountType: "TEMPORARY",
    approvalStatus: "PENDING",
  });

  try {
    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "TEMP_REGISTRATION",
      module: "AUTH",
      description: `Temporary user ${user.name} registered and is awaiting HR approval`,
      metadata: { phone: user.phone, email: user.email },
    });
  } catch (logError) {
    console.error("Failed to log temp registration activity:", logError.message);
  }

  return {
    message: "Registration submitted. HR approval is required before login.",
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      approvalStatus: user.approvalStatus,
      accountType: user.accountType,
    },
  };
}

export async function requestTemporaryOtp(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
  }

  const user = await User.findOne({ email: normalizedEmail, accountType: "TEMPORARY" });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Temporary account not found");
  }

  if (user.approvalStatus === "PENDING") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Your registration is pending HR approval"
    );
  }

  if (user.approvalStatus === "REJECTED") {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Your registration was rejected. Please contact HR"
    );
  }

  if (user.otpLastSentAt && Date.now() - new Date(user.otpLastSentAt).getTime() < 30_000) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Please wait 30 seconds before requesting another OTP"
    );
  }

  const otp = generateOtpCode();
  user.otpCodeHash = hashOtp(otp);
  user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();

  const emailResult = await sendTemporaryOtpEmail({
    toEmail: user.email,
    otp,
    name: user.name,
  });

  const payload = {
    message: "OTP sent successfully",
    expiresInSeconds: 300,
    provider: emailResult.provider,
    delivered: emailResult.delivered,
  };

  if (env.NODE_ENV !== "production") {
    payload.debugOtp = otp;
  }

  return payload;
}

export async function verifyTemporaryOtp(email, otp, rememberMe = false) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await User.findOne({
    email: normalizedEmail,
    accountType: "TEMPORARY",
    approvalStatus: "APPROVED",
  });

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid login request");
  }

  if (!user.otpCodeHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP expired. Please request a new OTP");
  }

  if ((user.otpAttempts || 0) >= 5) {
    throw new ApiError(StatusCodes.LOCKED, "Too many invalid OTP attempts. Request a new OTP");
  }

  const submittedHash = hashOtp(otp);
  if (submittedHash !== user.otpCodeHash) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid OTP");
  }

  user.otpCodeHash = "";
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.isActive = true;

  const payload = { id: String(user._id), role: user.role, name: user.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload, rememberMe);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  user.rememberMeEnabled = rememberMe || false;
  await user.save();

  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "LOGIN",
    module: "AUTH",
    description: `${user.name} logged in with email OTP${rememberMe ? ' (Remember Me enabled)' : ''}`,
    metadata: { email: user.email, method: "OTP", rememberMe },
  });

  return {
    accessToken,
    refreshToken,
    rememberMe,
    user: {
      id: String(user._id),
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
      accountType: user.accountType,
      profileImageUrl: user.profileImageUrl,
    },
  };
}