import multer from "multer";
import { ApiError } from "../utils/apiError.js";

const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const fileMimeTypes = [
  ...imageMimeTypes,
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
];

const createFileFilter = (allowedMimeTypes) => (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new ApiError(400, "Unsupported file type for upload."));
  }
  cb(null, true);
};

const createMemoryUploader = ({ maxFileSizeMB, allowedMimeTypes }) => {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeMB * 1024 * 1024,
      files: 1,
      fields: 20,
    },
    fileFilter: createFileFilter(allowedMimeTypes),
  });
};

export const uploadCloudinaryImage = createMemoryUploader({
  maxFileSizeMB: 5,
  allowedMimeTypes: imageMimeTypes,
});

export const uploadCloudinaryFile = createMemoryUploader({
  maxFileSizeMB: 15,
  allowedMimeTypes: fileMimeTypes,
});
