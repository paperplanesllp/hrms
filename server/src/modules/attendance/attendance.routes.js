import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import {
  postMarkMine,
  postCheckOut,
  getMine,
  getAll,
  patchAttendance,
  patchShiftAdmin,
  triggerAutoMarkAbsentees,
  getAttendanceSummary,
  getAttendanceByDate,
  triggerRecalculateAttendance
} from "./attendance.controller.js";

const router = express.Router();

// Frontend expects these non-prefixed routes
router.post("/checkin", requireAuth, postMarkMine);
router.post("/checkout", requireAuth, postCheckOut);
router.get("/", requireAuth, (req, res, next) => {
  // Route to both getMine (for regular users) and getAll (for admins)
  if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.HR) {
    return getAll(req, res, next);
  } else {
    return getMine(req, res, next);
  }
});

// Legacy routes for backward compatibility
router.post("/me/mark", requireAuth, postMarkMine);
router.get("/me", requireAuth, getMine);

// Get attendance for specific date
router.get("/by-date", requireAuth, getAttendanceByDate);

// HR & Admin can edit attendance
router.patch("/edit", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), patchAttendance);
router.put("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), patchAttendance);

// Only Admin can edit shift times (if needed)
router.patch("/shift", requireAuth, requireRole(ROLES.ADMIN), patchShiftAdmin);

// ============================================
// AUTO-MARK ABSENT ROUTES (ADMIN ONLY)
// ============================================
// Manually trigger auto-marking of absent staff
router.get("/admin/auto-mark", requireAuth, requireRole(ROLES.ADMIN), triggerAutoMarkAbsentees);

// Get today's attendance summary
router.get("/admin/summary", requireAuth, requireRole(ROLES.ADMIN), getAttendanceSummary);

// Recalculate all attendance records with fixed logic (admin can fix bad data)
router.post("/admin/recalculate", requireAuth, requireRole(ROLES.ADMIN), triggerRecalculateAttendance);

export default router;