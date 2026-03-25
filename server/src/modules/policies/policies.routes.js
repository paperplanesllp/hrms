import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, ROLES } from "../../middleware/roles.js";
import {
  listPolicies,
  getPolicy,
  createNewPolicy,
  updatePolicyHandler,
  deletePolicyHandler,
  hardDeletePolicyHandler
} from "./policies.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/policies directory exists
const uploadDir = path.join(__dirname, "../../uploads/policies");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only accept PDF files
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// Anyone can view policies
router.get("/", requireAuth, listPolicies);
router.get("/:id", requireAuth, getPolicy);

// HR/Admin only - with PDF upload
router.post("/", requireAuth, requireRole(ROLES.HR, ROLES.ADMIN), upload.single("pdf"), createNewPolicy);
router.put("/:id", requireAuth, requireRole(ROLES.HR, ROLES.ADMIN), upload.single("pdf"), updatePolicyHandler);

// Soft delete
router.delete("/:id", requireAuth, requireRole(ROLES.HR, ROLES.ADMIN), deletePolicyHandler);

// Hard delete (hard delete - removes from DB completely)
router.delete("/:id/hard", requireAuth, requireRole(ROLES.ADMIN), hardDeletePolicyHandler);

export default router;
