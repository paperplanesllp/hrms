import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDashboardStats, getAnalyticsData, getLeaveBalance } from "./dashboard.service.js";

export const getStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  res.json(stats);
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const { range = "month" } = req.query;
  const analytics = await getAnalyticsData(range);
  res.json(analytics);
});

export const getLeaveBalanceInfo = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const leaveBalance = await getLeaveBalance(userId);
  res.json(leaveBalance);
});
