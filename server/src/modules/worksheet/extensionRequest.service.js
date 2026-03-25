import { ExtensionRequest } from "./ExtensionRequest.model.js";
import { Worksheet } from "./Worksheet.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Create a time extension request
 */
export async function createExtensionRequest(userId, worksheetId, data) {
  // Verify worksheet exists and belongs to user
  const worksheet = await Worksheet.findById(worksheetId);
  if (!worksheet) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Worksheet not found");
  }
  if (worksheet.userId.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "This worksheet is not yours");
  }

  // Check if already requested
  const existingRequest = await ExtensionRequest.findOne({
    worksheetId,
    status: "pending",
  });
  if (existingRequest) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You already have a pending request for this task"
    );
  }

  const additionalHours = data.requestedHours - data.originalHours;

  const request = await ExtensionRequest.create({
    worksheetId,
    userId,
    taskName: worksheet.task,
    originalHours: data.originalHours,
    requestedHours: data.requestedHours,
    additionalHoursNeeded: additionalHours,
    reason: data.reason,
    workDate: worksheet.date,
    status: "pending",
  });

  return request;
}

/**
 * Get all pending extension requests (for HR/Admin)
 */
export async function getAllExtensionRequests(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.userId) {
    query.userId = filters.userId; // Filter by specific user
  }

  if (filters.workDate) {
    query.workDate = filters.workDate;
  }

  const requests = await ExtensionRequest.find(query)
    .populate("userId", "name email")
    .populate("worksheetId", "task date hours")
    .populate("approvedBy", "name")
    .sort({ createdAt: -1 });

  return requests;
}

/**
 * Get user's own extension requests
 */
export async function getUserExtensionRequests(userId) {
  const requests = await ExtensionRequest.find({ userId })
    .populate("worksheetId", "task date hours")
    .sort({ createdAt: -1 });

  return requests;
}

/**
 * Get single extension request
 */
export async function getExtensionRequest(requestId, userId) {
  const request = await ExtensionRequest.findById(requestId)
    .populate("userId", "name email")
    .populate("worksheetId", "task date hours")
    .populate("approvedBy", "name");

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Request not found");
  }

  return request;
}

/**
 * Approve extension request (HR/Admin only)
 */
export async function approveExtensionRequest(requestId, adminId, approvalReason = "") {
  const request = await ExtensionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Request not found");
  }

  if (request.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Request is already ${request.status}`
    );
  }

  // Update request status
  request.status = "approved";
  request.approvedBy = adminId;
  request.approvalReason = approvalReason || "Approved";
  request.approvedAt = new Date();
  await request.save();

  // Update the worksheet hours
  const worksheet = await Worksheet.findById(request.worksheetId);
  if (worksheet) {
    worksheet.hours = request.requestedHours;
    await worksheet.save();
  }

  return request;
}

/**
 * Reject extension request (HR/Admin only)
 */
export async function rejectExtensionRequest(requestId, adminId, rejectionReason) {
  const request = await ExtensionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Request not found");
  }

  if (request.status !== "pending") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Request is already ${request.status}`
    );
  }

  request.status = "rejected";
  request.approvedBy = adminId;
  request.approvalReason = rejectionReason || "Rejected";
  request.approvedAt = new Date();
  await request.save();

  return request;
}

/**
 * Get pending request count (for dashboard badge)
 */
export async function getPendingRequestCount() {
  return await ExtensionRequest.countDocuments({ status: "pending" });
}
