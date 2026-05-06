import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  getActivityLogs,
  getUserActivities,
  getHRTimeline,
  getAdminTimeline,
} from "./activity.service.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * GET /api/activity/my-activities
 * Get activity logs for the current user
 */
export const getMyActivities = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  const { limit = 20 } = req.query;
  const activities = await getUserActivities(req.user.id, parseInt(limit), req.user.companyId);

  res.json({
    data: activities,
    message: "User activities retrieved successfully",
  });
});

/**
 * GET /api/activity/hr-timeline
 * Get HR timeline - staff activities relevant for HR monitoring
 * Only HR and ADMIN can access this
 */
export const getHRTimelineController = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  if (!["HR", "ADMIN"].includes(req.user.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only HR and Admin can access this");
  }

  const { limit = 50, skip = 0, startDate, endDate } = req.query;

  const result = await getHRTimeline({
    limit: parseInt(limit),
    skip: parseInt(skip),
    startDate,
    endDate,
    companyId: req.user.companyId,
  });

  res.json({
    data: result.logs,
    total: result.total,
    limit: result.limit,
    skip: result.skip,
    pages: result.pages,
    message: "HR timeline retrieved successfully",
  });
});

/**
 * GET /api/activity/admin-timeline
 * Get Admin timeline - HR and system-level activities
 * Only ADMIN can access this
 */
export const getAdminTimelineController = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  if (req.user.role !== "ADMIN") {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only Admin can access this");
  }

  const { limit = 50, skip = 0, startDate, endDate } = req.query;

  const result = await getAdminTimeline({
    limit: parseInt(limit),
    skip: parseInt(skip),
    startDate,
    endDate,
    companyId: req.user.companyId,
  });

  res.json({
    data: result.logs,
    total: result.total,
    limit: result.limit,
    skip: result.skip,
    pages: result.pages,
    message: "Admin timeline retrieved successfully",
  });
});

/**
 * GET /api/activity/all
 * Get all activities with optional filters
 * Only ADMIN can access this
 */
export const getAllActivities = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User not authenticated");
  }

  if (req.user.role !== "ADMIN") {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only Admin can access this");
  }

  const {
    limit = 50,
    skip = 0,
    module,
    actionType,
    actorRole,
    startDate,
    endDate,
  } = req.query;

  const result = await getActivityLogs({
    limit: parseInt(limit),
    skip: parseInt(skip),
    module,
    actionType,
    actorRole,
    startDate,
    endDate,
    visibility: "ADMIN_ONLY",
    companyId: req.user.companyId,
  });

  res.json({
    data: result.logs,
    total: result.total,
    limit: result.limit,
    skip: result.skip,
    pages: result.pages,
    message: "All activities retrieved successfully",
  });
});
  