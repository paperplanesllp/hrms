import { Policies } from "./Policies.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

export const getAllPolicies = async (filters = {}, companyId = null) => {
  if (!companyId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID is required");
  }

  const query = { isActive: true, companyId };

  if (filters.category) {
    query.category = filters.category;
  }

  return await Policies.find(query)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });
};

export const getPolicyById = async (policyId, companyId = null) => {
  const query = { _id: policyId };
  if (companyId) {
    query.companyId = companyId;
  }

  const policy = await Policies.findOne(query)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found or access denied");
  }

  return policy;
};

export const createPolicy = async (userId, data, companyId) => {
  if (!companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company ID is required");
  }

  const policy = new Policies({
    ...data,
    createdBy: userId,
    companyId
  });

  return await policy.save();
};

export const updatePolicy = async (policyId, userId, data, companyId) => {
  if (!companyId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID is required");
  }

  const policy = await Policies.findOne({ _id: policyId, companyId });

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found or access denied");
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

export const deletePolicy = async (policyId, companyId) => {
  if (!companyId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID is required");
  }

  const policy = await Policies.findOne({ _id: policyId, companyId });

  if (!policy) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found or access denied");
  }

  // Soft delete
  policy.isActive = false;
  return await policy.save();
};

export const hardDeletePolicy = async (policyId, companyId) => {
  if (!companyId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Company ID is required");
  }

  const result = await Policies.findOneAndDelete({ _id: policyId, companyId });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Policy not found or access denied");
  }

  return result;
};
