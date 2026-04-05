import { Router } from "express";
import * as adminController from "./admin.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";

const router = Router();

// All routes require authentication first, then ADMIN or HR role
router.use(requireAuth);
router.use(requireRole(ROLES.ADMIN, ROLES.HR));

// User management (HR can view/manage, but not Admin users)
router.get("/users", adminController.getUsers);
router.get("/users/:id", adminController.getUser);
router.delete("/users/:id", requireRole(ROLES.ADMIN), adminController.terminateUser); // Only Admin can terminate

// HR leave approval (Only Admin can approve HR leaves)
router.get("/hr-leaves", requireRole(ROLES.ADMIN), adminController.getHRLeaves);
router.put("/hr-leaves/:id", requireRole(ROLES.ADMIN), adminController.updateHRLeave);

// Attendance oversight
router.get("/attendance", adminController.getAttendance);
router.get("/late-arrivals", adminController.getLateArrivals);

// Payroll oversight (HR can view/manage, but not Admin payroll)
router.get("/payroll", adminController.getPayroll);

// Worksheet oversight
router.get("/worksheets", adminController.getWorksheets);

// System stats
router.get("/stats", adminController.getStats);

// HR Team Management (Premium)
router.get("/hr-team", adminController.getHRTeam);
router.get("/hr-team/discussions", adminController.getHRDiscussions);
router.get("/hr-team/meetings", adminController.getHRMeetings);
router.get("/hr-team/activity", adminController.getHRActivity);
router.post("/hr-team/meetings", adminController.createHRMeeting);
router.put("/hr-team/meetings/:id", adminController.updateHRMeeting);
router.delete("/hr-team/meetings/:id", adminController.deleteHRMeeting);
router.post("/hr-team/discussions/:id/reply", adminController.addHRDiscussionReply);

// Company/Office Location Management (Only Admin can set, but HR can view)
router.get("/company-location", adminController.getCompanyLocation);
router.post("/company-location", requireRole(ROLES.ADMIN), adminController.setCompanyLocation);

// Working Days Configuration (Only Admin can set, but HR can view)
router.get("/working-days", adminController.getWorkingDays);
router.post("/working-days", requireRole(ROLES.ADMIN), adminController.setWorkingDays);

// Company Timing Configuration (Only Admin can set, but HR can view)
router.get("/company-timing", adminController.getCompanyTiming);
router.post("/company-timing", requireRole(ROLES.ADMIN), adminController.setCompanyTiming);

export default router;
