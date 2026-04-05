import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAuditLogs, getRecentLogs } from "./audit.service.js";

export const getLogs = asyncHandler(async (req, res) => {
  const {
    limit = 50,
    skip = 0,
    entity,
    action,
    startDate,
    endDate
  } = req.query;

  const logs = await getAuditLogs({
    limit: parseInt(limit),
    skip: parseInt(skip),
    entity,
    action,
    startDate,
    endDate
  });

  res.json(logs);
});

export const getRecentUpdates = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const logs = await getRecentLogs(parseInt(limit));
  res.json({ logs });
});
