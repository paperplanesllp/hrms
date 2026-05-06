import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { requireSuperadminSecurity } from "../../middleware/superadminGuard.js";
import { createCompanyAdminCtrl, createCompanyCtrl, deleteCompanyCtrl, listCompaniesCtrl, updateCompanyCtrl } from "./companies.controller.js";

const router = express.Router();

router.get("/", requireSuperadminSecurity, requireAuth, requireRole(ROLES.SUPERADMIN), listCompaniesCtrl);
router.post("/", requireSuperadminSecurity, requireAuth, requireRole(ROLES.SUPERADMIN), createCompanyCtrl);
router.patch("/:companyId", requireSuperadminSecurity, requireAuth, requireRole(ROLES.SUPERADMIN), updateCompanyCtrl);
router.delete("/:companyId", requireSuperadminSecurity, requireAuth, requireRole(ROLES.SUPERADMIN), deleteCompanyCtrl);
router.post("/:companyId/admin", requireSuperadminSecurity, requireAuth, requireRole(ROLES.SUPERADMIN), createCompanyAdminCtrl);

export default router;
