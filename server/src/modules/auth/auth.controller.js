import { asyncHandler } from "../../utils/asyncHandler.js";
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schemas.js";
import { login, refresh, logout, signup, forgotPassword, resetPassword } from "./auth.service.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

const cookieBase = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};

export const postSignup = asyncHandler(async (req, res) => {
  console.log("📝 SIGNUP REQUEST RECEIVED:", req.body);
  
  try {
    const data = signupSchema.parse(req.body);
    console.log("✅ VALIDATION PASSED:", data);

    const result = await signup({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });

    console.log("✅ USER CREATED SUCCESSFULLY:", result.user);

    res.cookie("refreshToken", result.refreshToken, {
      ...cookieBase,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (error) {
    console.error("❌ SIGNUP ERROR CAUGHT:", error.message);
    throw error;
  }
});

export const postLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await login(data.email, data.password);

  res.cookie("refreshToken", result.refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken: result.accessToken, user: result.user });
});

export const postRefresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "No refresh token in cookies");
  }
  console.log("🔄 Refresh token received, validating...");
  const result = await refresh(token);
  console.log("✅ Refresh successful for user:", result.user.id);
  res.json(result);
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