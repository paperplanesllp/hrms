import { ApiError } from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";

function parseAllowedIps(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip;
}

export function requireSuperadminSecurity(req, res, next) {
  if (!env.SUPERADMIN_ENABLED) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Not found");
  }

  const allowed = parseAllowedIps(env.SUPERADMIN_ALLOWED_IPS);
  if (allowed.length > 0) {
    const ip = getRequestIp(req);
    if (!allowed.includes(ip)) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Forbidden");
    }
  }

  next();
}
