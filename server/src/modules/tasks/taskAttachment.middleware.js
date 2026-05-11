import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import { ApiError } from "../../utils/apiError.js";
import {
  TASK_ATTACHMENT_LIMIT,
  TASK_ATTACHMENT_MAX_SIZE,
  isAllowedTaskFile,
  sanitizeFileName,
} from "./taskAttachment.service.js";

const taskUploadDir = path.join(os.tmpdir(), "hrms-task-attachments");

if (!fs.existsSync(taskUploadDir)) {
  fs.mkdirSync(taskUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, taskUploadDir),
  filename: (req, file, cb) => {
    const parsed = path.parse(sanitizeFileName(file.originalname));
    cb(null, `${parsed.name}-${Date.now()}-${Math.round(Math.random() * 1e9)}${parsed.ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!isAllowedTaskFile(file)) {
    return cb(new ApiError(400, "Unsupported attachment type. Allowed: JPG, PNG, WebP, GIF, PDF, Word, Excel, TXT, ZIP."));
  }

  cb(null, true);
};

export const uploadTaskAttachmentsMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: TASK_ATTACHMENT_MAX_SIZE,
    files: TASK_ATTACHMENT_LIMIT,
    fields: 60,
  },
});
