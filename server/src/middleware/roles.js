import { ApiError } from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

export const ROLES = {
  ADMIN: "ADMIN",
  HR: "HR",
  USER: "USER",
};

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user?.role) throw new ApiError(StatusCodes.UNAUTHORIZED, "No role");
    
    // Flatten the allowed array in case an array was passed
    const flatAllowed = allowed.flat();
    
    if (!flatAllowed.includes(req.user.role)) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Forbidden");
    }
    next();
  };
}