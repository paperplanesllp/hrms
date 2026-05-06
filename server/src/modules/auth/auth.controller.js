import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  temporaryRegisterSchema,
  temporaryOtpRequestSchema,
  temporaryOtpVerifySchema,
} from "./auth.schemas.js";
import {
  login,
  superadminLogin,
  refresh,
  logout,
  signup,
  forgotPassword,
  resetPassword,
  registerTemporaryUser,
  requestTemporaryOtp,
  verifyTemporaryOtp,
} from "./auth.service.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const cookieBase = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const postSignup = asyncHandler(async (req, res) => {
  console.log("📝 SIGNUP REQUEST RECEIVED:", req.body);
  
  try {
    const data = signupSchema.parse(req.body);
    const rememberMe = true;
    console.log("✅ VALIDATION PASSED:", data);

    const result = await signup({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      rememberMe: rememberMe || false,
    });

    console.log("✅ USER CREATED SUCCESSFULLY:", result.user);

    res.cookie("refreshToken", result.refreshToken, {
      ...cookieBase,
      maxAge: NINETY_DAYS_MS,
    });

    res.status(201).json({ accessToken: result.accessToken, user: result.user, rememberMe: result.rememberMe });
  } catch (error) {
    console.error("❌ SIGNUP ERROR CAUGHT:", error.message);
    throw error;
  }
});

export const postLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const rememberMe = true;
  const result = await login(data.email, data.password, rememberMe);

  // Handle 2FA requirement
  if (result.requiresTwoFactor) {
    // Don't set refresh token cookie for 2FA flow
    return res.json({
      requiresTwoFactor: true,
      message: result.message,
      tempToken: result.tempToken,
      userId: result.userId,
      userEmail: result.userEmail,
      expiresInSeconds: result.expiresInSeconds,
    });
  }

  // Normal login flow (no 2FA) - set refresh token cookie with expiry based on rememberMe preference
  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: NINETY_DAYS_MS,
  });

  res.json({ 
    requiresTwoFactor: false,
    accessToken: result.accessToken, 
    user: result.user, 
    rememberMe: result.rememberMe 
  });
});

export const postRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "No refresh token in cookies");
  }
  console.log("🔄 Refresh token received, validating...");
  const result = await refresh(token);
  console.log("✅ Refresh successful for user:", result.user.id);
  
  // ✅ REFRESH TOKEN ROTATION: Set the new refresh token in cookie
  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: NINETY_DAYS_MS,
  });

  res.json({ 
    accessToken: result.accessToken, 
    user: result.user,
    rememberMe: result.rememberMe 
  });
});

export const postLogout = asyncHandler(async (req, res) => {
  await logout(req.user.id);
  res.clearCookie("refreshToken", { ...cookieBase });
  res.json({ ok: true });
});

export const postForgotPassword = asyncHandler(async (req, res) => {
  const data = forgotPasswordSchema.parse(req.body);
  const result = await forgotPassword(data.email);
  res.json(result);
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const data = resetPasswordSchema.parse(req.body);
  const result = await resetPassword(data.token, data.password);
  res.json(result);
});

export const postTemporaryRegister = asyncHandler(async (req, res) => {
  const data = temporaryRegisterSchema.parse(req.body);
  const result = await registerTemporaryUser(data);
  res.status(201).json(result);
});

export const postTemporaryRequestOtp = asyncHandler(async (req, res) => {
  const data = temporaryOtpRequestSchema.parse(req.body);
  const result = await requestTemporaryOtp(data.email);
  res.json(result);
});

export const postTemporaryVerifyOtp = asyncHandler(async (req, res) => {
  const data = temporaryOtpVerifySchema.parse(req.body);
  const rememberMe = true;
  const result = await verifyTemporaryOtp(data.email, data.otp, rememberMe);

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: NINETY_DAYS_MS,
  });

  res.json({ accessToken: result.accessToken, user: result.user, rememberMe: result.rememberMe });
});

export const postSuperadminLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const rememberMe = true;
  const result = await superadminLogin(data.email, data.password, rememberMe);

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: NINETY_DAYS_MS,
  });

  res.json({
    requiresTwoFactor: false,
    accessToken: result.accessToken,
    user: result.user,
    rememberMe: result.rememberMe,
  });
});