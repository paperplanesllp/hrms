import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  hardDeletePolicy
} from "./policies.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const policiesUploadDir = path.resolve(__dirname, "../../uploads/policies");
const legacyPoliciesUploadDir = path.resolve(__dirname, "../../../uploads/policies");

function normalizePolicyFileName(value = "") {
  return decodeURIComponent(String(value || ""))
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/^\d+-/, "")
    .trim()
    .toLowerCase();
}

function getExistingPolicyPdfPath(policy) {
  const candidateDirs = [policiesUploadDir, legacyPoliciesUploadDir];
  const storedFileName = policy.pdfUrl
    ? decodeURIComponent(path.basename(policy.pdfUrl))
    : "";
  const originalFileName = policy.pdfFileName || normalizePolicyFileName(storedFileName);
  const normalizedOriginal = normalizePolicyFileName(originalFileName || storedFileName);

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;

    if (storedFileName) {
      const directPath = path.join(dir, storedFileName);
      if (fs.existsSync(directPath)) return directPath;
    }

    const fallback = fs
      .readdirSync(dir)
      .find((fileName) => normalizePolicyFileName(fileName) === normalizedOriginal);

    if (fallback) return path.join(dir, fallback);
  }

  return null;
}

export const listPolicies = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.category) {
    filters.category = req.query.category;
  }

  const policies = await getAllPolicies(filters, req.user.companyId);
  res.json(policies);
});

export const getPolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const policy = await getPolicyById(id, req.user.companyId);
  res.json(policy);
});

export const downloadPolicyPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const policy = await getPolicyById(id, req.user.companyId);

  if (!policy.pdfUrl && !policy.pdfFileName) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No PDF is attached to this policy");
  }

  const filePath = getExistingPolicyPdfPath(policy);
  if (!filePath) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "The PDF file is missing on the server. Please re-upload the policy PDF."
    );
  }

  const downloadName = policy.pdfFileName || path.basename(filePath).replace(/^\d+-/, "");
  res.download(filePath, downloadName);
});

export const createNewPolicy = asyncHandler(async (req, res) => {
  const { title, description, content, category } = req.body;

  const policyData = {
    title,
    description,
    content: content || "",
    category: category || "Other"
  };

  // Handle PDF upload if file is present
  if (req.file) {
    policyData.pdfFileName = req.file.originalname;
    policyData.pdfUrl = `/uploads/policies/${req.file.filename}`;
  }

  const policy = await createPolicy(req.user.id, policyData, req.user.companyId);

  res.status(201).json({
    message: "Policy created successfully",
    policy
  });
});

export const updatePolicyHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, content, category, isActive } = req.body;

  const updateData = {
    title,
    description,
    content,
    category,
    isActive
  };

  // Handle PDF upload if file is present
  if (req.file) {
    updateData.pdfFileName = req.file.originalname;
    updateData.pdfUrl = `/uploads/policies/${req.file.filename}`;
  }

  const policy = await updatePolicy(id, req.user.id, updateData, req.user.companyId);

  res.json({
    message: "Policy updated successfully",
    policy
  });
});

export const deletePolicyHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Soft delete by default
  const policy = await deletePolicy(id, req.user.companyId);

  res.json({
    message: "Policy deleted successfully",
    policy
  });
});

export const hardDeletePolicyHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await hardDeletePolicy(id, req.user.companyId);

  res.json({
    message: "Policy permanently deleted",
    policy
  });
});
