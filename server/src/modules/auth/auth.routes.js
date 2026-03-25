import express from "express";
import { authLimiter } from "../../middleware/rateLimit.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  postLogin,
  postRefresh,
  postLogout,
  postForgotPassword,
  postResetPassword,
} from "./auth.controller.js";

const router = express.Router();

// ✅ Public
router.post("/login", authLimiter, postLogin);
router.post("/refresh", postRefresh);
router.post("/forgot-password", authLimiter, postForgotPassword);
router.post("/reset-password", authLimiter, postResetPassword);

// ✅ Protected
router.post("/logout", requireAuth, postLogout);

export default router;