import mongoose from "mongoose";
import { ApiError } from "./apiError.js";
import { StatusCodes } from "http-status-codes";
import { ROLES, normalizeRole } from "../middleware/roles.js";

export function isSuperadmin(user = {}) {
  return normalizeRole(user.role) === ROLES.SUPERADMIN;
}

export function getCompanyIdFromRequest(req) {
  return req?.user?.companyId ? String(req.user.companyId) : null;
}

export function requireCompanyId(req) {
  if (isSuperadmin(req.user)) return null;
  const companyId = getCompanyIdFromRequest(req);
  if (!companyId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Company context is required");
  }
  return companyId;
}

export function requireTenantContext(req, _res, next) {
  requireCompanyId(req);
  next();
}

export function tenantFilter(req, base = {}) {
  if (isSuperadmin(req.user)) return { ...base };
  return { ...base, companyId: requireCompanyId(req) };
}

export function tenantScope(req) {
  if (isSuperadmin(req.user)) {
    return { isSuperadmin: true, companyId: null, filter: {} };
  }
  const companyId = requireCompanyId(req);
  return { isSuperadmin: false, companyId, filter: { companyId } };
}

export function applyTenantFilter(query = {}, req) {
  return tenantFilter(req, query);
}

export function assertSameCompany(record, req) {
  if (isSuperadmin(req.user)) return true;
  const companyId = requireCompanyId(req);
  const recordCompanyId = record?.companyId?._id || record?.companyId;
  if (!recordCompanyId || String(recordCompanyId) !== String(companyId)) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Record not found");
  }
  return true;
}

export function companyFilter(companyId, base = {}) {
  if (!companyId) return { ...base };
  return { ...base, companyId };
}

export function asObjectId(id) {
  if (!id) return null;
  return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id);
}

export function missingCompanyFilter(extra = {}) {
  return {
    ...extra,
    $or: [{ companyId: { $exists: false } }, { companyId: null }],
  };
}
