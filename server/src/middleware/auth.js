import { ApiError } from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../modules/users/User.model.js";
import { Company } from "../modules/companies/Company.model.js";
import { normalizeRole } from "./roles.js";

function getEmailDomain(email = "") {
  const parts = String(email || "").trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] ? parts[1] : "";
}

async function resolveCompanyIdForUser(user) {
  if (user.companyId) return String(user.companyId);

  const domain = getEmailDomain(user.email);
  if (!domain) return null;
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const company = await Company.findOne({
    isActive: { $ne: false },
    $or: [
      { domain },
      { domain: { $regex: `^${escapedDomain}$`, $options: "i" } },
      { contactEmail: { $regex: `@${escapedDomain}$`, $options: "i" } },
      { contactEmail: { $regex: escapedDomain, $options: "i" } },
      { website: { $regex: escapedDomain, $options: "i" } },
    ],
  })
    .select("_id")
    .lean();

  if (company?._id) return String(company._id);

  const sameDomainCompanyUser = await User.findOne({
    _id: { $ne: user._id },
    companyId: { $ne: null },
    email: { $regex: `@${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  })
    .select("companyId")
    .lean();

  return sameDomainCompanyUser?.companyId ? String(sameDomainCompanyUser.companyId) : null;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new ApiError(StatusCodes.UNAUTHORIZED, "Missing access token");

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, role, name }
    req.user.role = normalizeRole(req.user.role);

    // Older live sessions may have been issued before companyId was included
    // in the JWT. Hydrate it from MongoDB so company-scoped APIs keep working
    // after deploy without forcing every user to log out immediately.
    if (req.user?.id && !req.user.companyId) {
      const user = await User.findById(req.user.id).select("companyId role name email").lean();
      if (user) {
        const companyId = await resolveCompanyIdForUser(user);

        if (companyId && !user.companyId) {
          await User.updateOne(
            { _id: user._id, $or: [{ companyId: null }, { companyId: { $exists: false } }] },
            { $set: { companyId } }
          );
        }

        req.user.companyId = companyId;
        req.user.role = req.user.role || user.role;
        req.user.name = req.user.name || user.name;
        req.user.email = req.user.email || user.email;
      }
    }

    next();
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid/expired access token");
  }
}
