import { ApiError } from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  HR: "HR",
  USER: "USER",
};

export function normalizeRole(role) {
  const normalized = String(role || "").trim().toUpperCase();
  if (normalized === "SUPER_ADMIN") return ROLES.SUPERADMIN;
  if (normalized === ROLES.SUPERADMIN) return ROLES.SUPERADMIN;
  if (normalized === ROLES.ADMIN) return ROLES.ADMIN;
  if (normalized === ROLES.HR) return ROLES.HR;
  if (normalized === ROLES.USER) return ROLES.USER;
  return normalized;
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user?.role) throw new ApiError(StatusCodes.UNAUTHORIZED, "No role");
    
    // Flatten the allowed array in case an array was passed
    const flatAllowed = allowed.flat().map(normalizeRole);
    const requesterRole = normalizeRole(req.user.role);
    
    if (!flatAllowed.includes(requesterRole)) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Forbidden");
    }
    req.user.role = requesterRole;
    next();
  };
}
