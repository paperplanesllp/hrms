import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { getStats, getAnalytics, getLeaveBalanceInfo, getAbsentEmployeesList } from "./dashboard.controller.js";

const router = express.Router();

router.get("/stats", requireAuth, getStats);
router.get("/analytics", requireAuth, getAnalytics);
router.get("/leave-balance", requireAuth, getLeaveBalanceInfo);
router.get("/absent-employees", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getAbsentEmployeesList);

export default router;
