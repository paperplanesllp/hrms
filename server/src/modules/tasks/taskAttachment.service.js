import fs from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../../utils/apiError.js";
import { isCloudinaryConfigured, deleteFromCloudinary, createSignedCloudinaryUrl } from "../../utils/cloudinary.js";

export const TASK_ATTACHMENT_LIMIT = 12;
export const TASK_ATTACHMENT_MAX_SIZE = 5 * 1024 * 1024;

export const TASK_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

const extensionMap = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".pdf", "application/pdf"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xls", "application/vnd.ms-excel"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".txt", "text/plain"],
  [".zip", "application/zip"],
]);

export function sanitizeFileName(fileName = "attachment") {
  const ext = path.extname(fileName).toLowerCase();
  const base = path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${base || "attachment"}${ext}`;
}

export function isAllowedTaskFile(file = {}) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const expectedMime = extensionMap.get(ext);
  return Boolean(expectedMime && TASK_ATTACHMENT_MIME_TYPES.has(file.mimetype) && TASK_ATTACHMENT_MIME_TYPES.has(expectedMime));
}

export function getTaskAttachmentFolder(mimeType = "") {
  if (mimeType.startsWith("image/")) return "hrms/tasks/images";
  if (mimeType.startsWith("video/")) return "hrms/tasks/videos";
  return "hrms/tasks/docs";
}

function getResourceType(mimeType = "") {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
}

export async function cleanupLocalFiles(files = []) {
  await Promise.allSettled(
    files
      .filter(file => file?.path)
      .map(file => fs.unlink(file.path))
  );
}

export async function uploadTaskAttachments(files = [], userId, options = {}) {
  if (!files.length) return [];
  if (!isCloudinaryConfigured()) {
    await cleanupLocalFiles(files);
    throw new ApiError(502, "Cloudinary is not configured for task attachments.");
  }

  const isPrivate = options.isPrivate === true || options.isPrivate === "true";

  try {
    const uploaded = [];

    for (const file of files) {
      const originalName = sanitizeFileName(file.originalname);
      const folder = getTaskAttachmentFolder(file.mimetype);
      const resourceType = getResourceType(file.mimetype);
      const publicId = `${userId}_${Date.now()}_${Math.round(Math.random() * 1e9)}`;

      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        type: isPrivate ? "authenticated" : "upload",
        use_filename: false,
        overwrite: false,
        access_mode: isPrivate ? "authenticated" : "public",
        ...(resourceType === "image"
          ? { transformation: [{ quality: "auto", fetch_format: "auto" }] }
          : {}),
      });

      uploaded.push({
        url: result.secure_url,
        public_id: result.public_id,
        originalName,
        format: result.format || path.extname(originalName).slice(1),
        resource_type: result.resource_type || resourceType,
        bytes: result.bytes || file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
        uploadedAt: new Date(),
        isPrivate,
      });
    }

    return uploaded;
  } finally {
    await cleanupLocalFiles(files);
  }
}

export async function deleteTaskAttachmentFile(attachment) {
  if (!attachment?.public_id) return null;
  return deleteFromCloudinary(attachment.public_id, attachment.resource_type || "auto");
}

export function createTaskAttachmentDownloadUrl(attachment) {
  if (!attachment?.url) return "";
  if (attachment.isPrivate && attachment.public_id) {
    return createSignedCloudinaryUrl(attachment.public_id, {
      resourceType: attachment.resource_type || "auto",
      deliveryType: "authenticated",
      download: true,
    });
  }

  return attachment.url.replace("/upload/", "/upload/fl_attachment/");
}

export function createTaskAttachmentAccessUrl(attachment) {
  if (!attachment?.url) return "";
  if (attachment.isPrivate && attachment.public_id) {
    return createSignedCloudinaryUrl(attachment.public_id, {
      resourceType: attachment.resource_type || "auto",
      deliveryType: "authenticated",
    });
  }

  return attachment.url;
}
