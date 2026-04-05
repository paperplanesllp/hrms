import { asyncHandler } from "../../utils/asyncHandler.js";
import { worksheetCreateSchema, worksheetUpdateSchema } from "./worksheet.schemas.js";
import {
  createWorksheet,
  listUserWorksheets,
  updateWorksheet,
  deleteWorksheet,
  getWorksheetByDate,
  pauseWorksheet,
  resumeWorksheet,
  completeWorksheet,
  requestTimeExtension,
} from "./worksheet.service.js";

export const postWorksheet = asyncHandler(async (req, res) => {
  const data = worksheetCreateSchema.parse(req.body);
  const doc = await createWorksheet(req.user.id, data);
  res.status(201).json(doc);
});

export const getMyWorksheets = asyncHandler(async (req, res) => {
  const rows = await listUserWorksheets(req.user.id);
  res.json(rows);
});

export const getWorksheetByDateHandler = asyncHandler(async (req, res) => {
  const { date } = req.query;
  // Admin can query other users' worksheets via userId param
  const userId = req.query.userId && (req.user.role === "admin" || req.user.role === "manager") 
    ? req.query.userId 
    : req.user.id;
  
  const doc = await getWorksheetByDate(userId, date);
  res.json({
    success: true,
    data: doc,
    message: doc ? undefined : "No worksheet found for this date",
  });
});

export const patchWorksheet = asyncHandler(async (req, res) => {
  const data = worksheetUpdateSchema.parse(req.body);
  const doc = await updateWorksheet(req.params.id, req.user.id, data);
  res.json(doc);
});

export const deleteMyWorksheet = asyncHandler(async (req, res) => {
  await deleteWorksheet(req.params.id, req.user.id);
  res.json({ ok: true });
});

// NEW: Pause work
export const pauseWork = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const doc = await pauseWorksheet(req.params.id, req.user.id, reason);
  res.json({
    success: true,
    message: "Work paused successfully",
    data: doc,
  });
});

// NEW: Resume work
export const resumeWork = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const doc = await resumeWorksheet(req.params.id, req.user.id, reason);
  res.json({
    success: true,
    message: "Work resumed successfully",
    data: doc,
  });
});

// NEW: Complete work
export const completeWork = asyncHandler(async (req, res) => {
  const doc = await completeWorksheet(req.params.id, req.user.id);
  res.json({
    success: true,
    message: "Work completed successfully",
    data: doc,
  });
});

// NEW: Request time extension
export const requestExtension = asyncHandler(async (req, res) => {
  const { requestedTime, reason } = req.body;
  
  if (!requestedTime || !reason) {
    throw new Error("requestedTime and reason are required");
  }

  const doc = await requestTimeExtension(req.params.id, req.user.id, requestedTime, reason);
  res.json({
    success: true,
    message: "Time extension request sent successfully",
    data: doc,
  });
});
