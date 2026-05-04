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

/**
 * Login function - with 2FA support
 * 
 * If 2FA is disabled: Returns access token immediately (normal flow)
 * If 2FA is enabled: Returns response indicating OTP verification needed
 */
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

  // Verify password
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

  // Reset failed attempts on successful password verification
  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.accountLocked = false;
    user.lockUntil = undefined;
    await user.save();
  }

  // ===== 2FA FLOW =====
  // If 2FA is enabled, don't issue tokens yet - require OTP verification
  if (user.twoFactorEnabled) {
    console.log(`🔐 2FA enabled for user ${user.email}, requesting OTP...`);
    
    // Store user ID in a temporary session-like response
    // The frontend will use this to identify the user during OTP verification
    // We use a temporary token that's only valid for OTP verification
    const tempPayload = { id: String(user._id), email: user.email };
    const tempToken = crypto
      .createHash("sha256")
      .update(JSON.stringify(tempPayload) + Date.now() + Math.random())
      .digest("hex");

    // Save temp token to identify user during OTP flow (expires in 10 minutes)
    user.temp2FAToken = tempToken;
    user.temp2FATokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return {
      requiresTwoFactor: true,
      message: "Please verify with OTP sent to your email",
      tempToken, // Frontend will send this back with OTP
      userId: String(user._id),
      userEmail: user.email,
      expiresInSeconds: 600, // 10 minutes
    };
  }

  // ===== NORMAL LOGIN FLOW (no 2FA) =====
  console.log(`✅ Password verified, issuing tokens for user ${user.email}`);

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
    requiresTwoFactor: false,
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

/**
 * Request OTP for 2FA login (after email/password verification)
 * User must provide valid tempToken from initial login attempt
 */
export async function request2FALoginOTP(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled for this user");
  }

  // Check rate limiting - only allow OTP request after 30 seconds
  if (user.otpLastSentAt && Date.now() - new Date(user.otpLastSentAt).getTime() < 30_000) {
    const remainingSeconds = Math.ceil(
      (30_000 - (Date.now() - new Date(user.otpLastSentAt).getTime())) / 1000
    );
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Please wait ${remainingSeconds} seconds before requesting another OTP`
    );
  }

  // Generate new OTP
  const otp = generateOtpCode();
  const otpHash = hashOtp(otp);

  // Save OTP to database
  user.otpCodeHash = otpHash;
  user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
  user.otpAttempts = 0; // Reset attempts for new OTP
  user.otpLastSentAt = new Date();
  await user.save();

  // Send OTP via email
  await sendTemporaryOtpEmail({
    toEmail: user.email,
    otp,
    name: user.name,
  });

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "OTP_SENT",
    module: "SECURITY",
    description: `OTP sent to ${user.email} for 2FA login`,
    metadata: { email: user.email },
  });

  // Return success response
  const payload = {
    message: "OTP sent to your email",
    expiresInSeconds: 300,
  };

  if (env.NODE_ENV !== "production") {
    payload.debugOtp = otp;
  }

  return payload;
}

/**
 * Verify 2FA OTP and issue login tokens
 * This is called after user enters OTP
 */
export async function verify2FALoginOTP(userId, otp, rememberMe = false) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.twoFactorEnabled) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "2FA is not enabled for this user");
  }

  // Check if OTP exists and hasn't expired
  if (!user.otpCodeHash || !user.otpExpiresAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No OTP request found. Please request a new OTP");
  }

  if (user.otpExpiresAt < new Date()) {
    // Clear expired OTP
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "OTP_FAILED",
      module: "SECURITY",
      description: `OTP verification failed - OTP expired`,
      metadata: { email: user.email, reason: "expired" },
    });

    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired. Please request a new OTP");
  }

  // Check attempt limit (5 attempts max)
  if ((user.otpAttempts || 0) >= 5) {
    // Clear OTP after max attempts
    user.otpCodeHash = "";
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "OTP_FAILED",
      module: "SECURITY",
      description: `OTP verification failed - Too many attempts`,
      metadata: { email: user.email, reason: "too_many_attempts", attempts: 5 },
    });

    throw new ApiError(
      StatusCodes.LOCKED,
      "Too many invalid OTP attempts. Please request a new OTP"
    );
  }

  // Verify OTP
  const submittedHash = hashOtp(otp);
  if (submittedHash !== user.otpCodeHash) {
    // Increment failed attempts
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    await user.save();

    await createActivityLog({
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      actionType: "OTP_FAILED",
      module: "SECURITY",
      description: `OTP verification failed - Invalid OTP (Attempt ${user.otpAttempts}/5)`,
      metadata: { email: user.email, reason: "invalid", attempts: user.otpAttempts },
    });

    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      `Invalid OTP. ${5 - user.otpAttempts} attempts remaining`
    );
  }

  // OTP is valid - clear OTP data and issue login tokens
  user.otpCodeHash = "";
  user.otpExpiresAt = null;
  user.otpAttempts = 0;
  user.otpLastSentAt = null;
  user.isActive = true;
  user.temp2FAToken = undefined; // Clear temp token
  user.temp2FATokenExpires = undefined;
  await user.save();

  // Generate tokens
  const payload = { id: String(user._id), role: user.role, name: user.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload, rememberMe);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  user.rememberMeEnabled = rememberMe || false;
  await user.save();

  // Log the activity
  await createActivityLog({
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    actionType: "OTP_VERIFIED",
    module: "SECURITY",
    description: `${user.name} logged in successfully via 2FA${rememberMe ? ' (Remember Me enabled)' : ''}`,
    metadata: { email: user.email, method: "2FA_OTP", rememberMe },
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