import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getAllPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  hardDeletePolicy
} from "./policies.service.js";

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
