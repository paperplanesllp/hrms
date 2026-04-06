import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { 
  getMinePayroll, 
  putPayroll, 
  getAllPayroll, 
  removePayroll,
  getPayrollRecord,
  getEmployeePayroll,
  updatePaymentStatusHandler,
  getPayrollStatsHandler
} from "./payroll.controller.js";

const router = express.Router();

// User: Get own payroll
router.get("/me", requireAuth, getMinePayroll);
router.get("/my", requireAuth, getMinePayroll);

// HR + Admin: Get all payroll records
router.get("/", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getAllPayroll);

// HR + Admin: Get payroll statistics
router.get("/stats/dashboard", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getPayrollStatsHandler);

// HR + Admin: Get payroll for specific employee
router.get("/employee/record", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getEmployeePayroll);

// HR + Admin: Get single payroll record
router.get("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getPayrollRecord);

// HR + Admin: Create/Update payroll
router.put("/", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), putPayroll);

// HR + Admin: Update payment status
router.patch("/:id/payment-status", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), updatePaymentStatusHandler);

// HR + Admin: Delete payroll
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), removePayroll);

export default router;
