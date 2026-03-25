import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getStats, getAnalytics, getLeaveBalanceInfo } from "./dashboard.controller.js";

const router = express.Router();

router.get("/stats", requireAuth, getStats);
router.get("/analytics", requireAuth, getAnalytics);
router.get("/leave-balance", requireAuth, getLeaveBalanceInfo);

export default router;
