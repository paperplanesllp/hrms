import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createExtensionRequest,
  getAllExtensionRequests,
  getUserExtensionRequests,
  getExtensionRequest,
  approveExtensionRequest,
  rejectExtensionRequest,
  getPendingRequestCount,
} from "./extensionRequest.service.js";
import { ROLES } from "../../app/constants.js";

/**
 * User creates extension request
 */
export const createRequest = asyncHandler(async (req, res) => {
  const { worksheetId, originalHours, requestedHours, reason } = req.body;

  if (!worksheetId || !originalHours || !requestedHours || !reason) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  if (requestedHours <= originalHours) {
    return res.status(400).json({
      success: false,
      message: "Requested hours must be greater than original hours",
    });
  }

  const request = await createExtensionRequest(req.user.id, worksheetId, {
    originalHours,
    requestedHours,
    reason,
  });

  res.status(201).json({
    success: true,
    message: "Time extension request created",
    data: request,
  });
});

/**
 * Get all requests (HR/Admin only)
 */
export const getAllRequests = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    return res.status(403).json({
      success: false,
      message: "Only HR and Admin can view all requests",
    });
  }

  const { status, userId, workDate } = req.query;
  const requests = await getAllExtensionRequests({
    status,
    userId,
    workDate,
  });

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

/**
 * Get user's own requests
 */
export const getMyRequests = asyncHandler(async (req, res) => {
  const requests = await getUserExtensionRequests(req.user.id);

  res.json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

/**
 * Get single request details
 */
export const getRequest = asyncHandler(async (req, res) => {
  const request = await getExtensionRequest(req.params.id, req.user.id);

  res.json({
    success: true,
    data: request,
  });
});

/**
 * Approve request (HR/Admin only)
 */
export const approveRequest = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    return res.status(403).json({
      success: false,
      message: "Only HR and Admin can approve requests",
    });
  }

  const { approvalReason } = req.body;
  const request = await approveExtensionRequest(
    req.params.id,
    req.user.id,
    approvalReason
  );

  res.json({
    success: true,
    message: "Request approved successfully",
    data: request,
  });
});

/**
 * Reject request (HR/Admin only)
 */
export const rejectRequest = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    return res.status(403).json({
      success: false,
      message: "Only HR and Admin can reject requests",
    });
  }

  const { rejectionReason } = req.body;

  if (!rejectionReason) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason is required",
    });
  }

  const request = await rejectExtensionRequest(
    req.params.id,
    req.user.id,
    rejectionReason
  );

  res.json({
    success: true,
    message: "Request rejected successfully",
    data: request,
  });
});

/**
 * Get pending count (for badges)
 */
export const getPendingCount = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    return res.status(403).json({
      success: false,
      message: "Only HR and Admin can view pending count",
    });
  }

  const count = await getPendingRequestCount();

  res.json({
    success: true,
    pendingCount: count,
  });
});
