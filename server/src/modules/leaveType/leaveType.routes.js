import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import {
  createLeaveTypeController,
  getLeaveTypesController,
  getLeaveTypeController,
  updateLeaveTypeController,
  deleteLeaveTypeController
} from "./leaveType.controller.js";

const router = express.Router();

// Public - Get all leave types (for dropdown in leave request form)
router.get("/", requireAuth, getLeaveTypesController);

// Get specific leave type
router.get("/:id", requireAuth, getLeaveTypeController);

// Admin only - Create leave type
router.post("/", requireAuth, requireRole(ROLES.ADMIN), createLeaveTypeController);

// Admin only - Update leave type
router.patch("/:id", requireAuth, requireRole(ROLES.ADMIN), updateLeaveTypeController);

// Admin only - Delete leave type
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), deleteLeaveTypeController);

export default router;
