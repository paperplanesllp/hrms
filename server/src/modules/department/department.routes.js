import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import {
  getAllDepartmentsCtrl,
  getActiveDepartmentsCtrl,
  getDepartmentCtrl,
  createDepartmentCtrl,
  updateDepartmentCtrl,
  deleteDepartmentCtrl,
  getAllDesignationsCtrl,
  getDesignationsByDeptCtrl,
  getDesignationCtrl,
  createDesignationCtrl,
  updateDesignationCtrl,
  deleteDesignationCtrl
} from "./department.controller.js";

const router = express.Router();

// ============ Department Routes ============
// Get all active departments (public for all authenticated users)
router.get("/", requireAuth, getActiveDepartmentsCtrl);

// Get all departments including inactive (admin/hr only)
router.get("/all", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getAllDepartmentsCtrl);

// Get specific department
router.get("/details/:id", requireAuth, getDepartmentCtrl);

// Create department (admin/hr only)
router.post("/", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), createDepartmentCtrl);

// Update department (admin/hr only)
router.put("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), updateDepartmentCtrl);

// Delete department (admin only)
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN), deleteDepartmentCtrl);

// ============ Designation Routes ============
// Get all designations (with optional department filter)
router.get("/designation/all", requireAuth, getAllDesignationsCtrl);

// Get designations by department
router.get("/designation/department/:departmentId", requireAuth, getDesignationsByDeptCtrl);

// Get specific designation
router.get("/designation/details/:id", requireAuth, getDesignationCtrl);

// Create designation (admin/hr only)
router.post("/designation", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), createDesignationCtrl);

// Update designation (admin/hr only)
router.put("/designation/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), updateDesignationCtrl);

// Delete designation (admin only)
router.delete("/designation/:id", requireAuth, requireRole(ROLES.ADMIN), deleteDesignationCtrl);

export default router;
