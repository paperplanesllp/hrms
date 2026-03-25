import { Policies } from "./Policies.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

export const getAllPolicies = async (filters = {}) => {
  const query = { isActive: true };

  if (filters.category) {
    query.category = filters.category;
  }

  return await Policies.find(query)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });
};

export const getPolicyById = async (policyId) => {
  const policy = await Policies.findById(policyId)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found");
  }

  return policy;
};

export const createPolicy = async (userId, data) => {
  const policy = new Policies({
    ...data,
    createdBy: userId
  });

  return await policy.save();
};

export const updatePolicy = async (policyId, userId, data) => {
  const policy = await Policies.findById(policyId);

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found");
  }

  // Update fields
  if (data.title) policy.title = data.title;
  if (data.description) policy.description = data.description;
  if (data.content !== undefined) policy.content = data.content;
  if (data.category) policy.category = data.category;
  if (data.isActive !== undefined) policy.isActive = data.isActive;

  policy.updatedBy = userId;

  return await policy.save();
};

export const deletePolicy = async (policyId) => {
  const policy = await Policies.findById(policyId);

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found");
  }

  // Soft delete
  policy.isActive = false;
  return await policy.save();
};

export const hardDeletePolicy = async (policyId) => {
  const result = await Policies.findByIdAndDelete(policyId);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found");
  }

  return result;
};
