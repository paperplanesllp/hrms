import express from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  postWorksheet,
  getMyWorksheets,
  getWorksheetByDateHandler,
  patchWorksheet,
  deleteMyWorksheet,
  pauseWork,
  resumeWork,
  completeWork,
  requestExtension,
} from "./worksheet.controller.js";

const router = express.Router();

// User can create and list their own worksheets
router.post("/", requireAuth, postWorksheet);
router.get("/my", requireAuth, getMyWorksheets);

// Get worksheet by specific date
router.get("/by-date", requireAuth, getWorksheetByDateHandler);

// User can update/delete their own worksheets
router.patch("/:id", requireAuth, patchWorksheet);
router.delete("/:id", requireAuth, deleteMyWorksheet);

// NEW: Pause/Resume/Complete endpoints
router.post("/:id/pause", requireAuth, pauseWork);
router.post("/:id/resume", requireAuth, resumeWork);
router.post("/:id/complete", requireAuth, completeWork);
router.post("/:id/request-extension", requireAuth, requestExtension);

export default router;
