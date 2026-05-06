import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDashboardStats, getAnalyticsData, getLeaveBalance, getAbsentEmployees } from "./dashboard.service.js";

export const getStats = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ message: "Company is required" });
  }
  const stats = await getDashboardStats(req.user.companyId);
  res.json(stats);
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const { range = "month" } = req.query;
  if (!req.user.companyId) {
    return res.status(400).json({ message: "Company is required" });
  }
  const analytics = await getAnalyticsData(range, req.user.companyId);
  res.json(analytics);
});

export const getLeaveBalanceInfo = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const leaveBalance = await getLeaveBalance(userId);
  res.json(leaveBalance);
});

export const getAbsentEmployeesList = asyncHandler(async (req, res) => {
  // Allow callers to filter by role (e.g. HR passes ?roles=USER to exclude HR peers)
  const { roles } = req.query;
  const rolesFilter = roles ? roles.split(",").map(r => r.trim()).filter(Boolean) : null;
  if (!req.user.companyId) {
    return res.status(400).json({ message: "Company is required" });
  }
  const absentEmployees = await getAbsentEmployees(rolesFilter, req.user.companyId);
  res.json(absentEmployees);
});
