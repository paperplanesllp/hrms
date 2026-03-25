import { ApiError } from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../utils/tokens.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new ApiError(StatusCodes.UNAUTHORIZED, "Missing access token");

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, role, name }
    next();
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid/expired access token");
  }
}
