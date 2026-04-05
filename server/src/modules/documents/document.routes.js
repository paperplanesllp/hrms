import express from "express";
// Document routes with file upload support
import {
  createDocType,
  getDocTypes,
  getDocTypeById,
  updateDocType,
  deleteDocType,
  getMyDocuments,
  getMyPendingDocuments,
  uploadEmployeeDocument,
  getSubmissionStatus,
  approveDocumentSubmission,
  rejectDocumentSubmission,
  getDashboardStats
} from "./document.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import { uploadDocuments } from "../../middleware/upload.js";

const router = express.Router();


// ==================== EMPLOYEE ROUTES ====================
// These must come BEFORE the generic routes so they don't match :id
router.get("/my-documents", requireAuth, getMyDocuments);
router.get("/pending", requireAuth, getMyPendingDocuments);
router.post("/upload", requireAuth, uploadDocuments.single("file"), uploadEmployeeDocument);


// ==================== HR ROUTES ====================
// Get all document types
router.get("/", requireAuth, getDocTypes);

// Get submission status
router.get("/status/all", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getSubmissionStatus);

// Get dashboard stats
router.get("/stats/dashboard", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), getDashboardStats);

// Create document type
router.post("/", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), createDocType);

// Get document type by ID
router.get("/:id", requireAuth, getDocTypeById);

// Update document type
router.put("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), updateDocType);

// Delete document type
router.delete("/:id", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), deleteDocType);

// Approve document
router.post("/:documentId/approve", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), approveDocumentSubmission);

// Reject document
router.post("/:documentId/reject", requireAuth, requireRole(ROLES.ADMIN, ROLES.HR), rejectDocumentSubmission);

export default router;
