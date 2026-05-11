import { ApiError } from "../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../modules/users/User.model.js";
import { Company } from "../modules/companies/Company.model.js";

function getEmailDomain(email = "") {
  const parts = String(email || "").trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] ? parts[1] : "";
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new ApiError(StatusCodes.UNAUTHORIZED, "Missing access token");

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // { id, role, name }

    // Older live sessions may have been issued before companyId was included
    // in the JWT. Hydrate it from MongoDB so company-scoped APIs keep working
    // after deploy without forcing every user to log out immediately.
    if (req.user?.id && !req.user.companyId) {
      const user = await User.findById(req.user.id).select("companyId role name email").lean();
      if (user) {
        let companyId = user.companyId ? String(user.companyId) : null;

        if (!companyId) {
          const domain = getEmailDomain(user.email);
          const company = domain
            ? await Company.findOne({ domain, isActive: { $ne: false } }).select("_id").lean()
            : null;

          if (company?._id) {
            companyId = String(company._id);
            await User.updateOne(
              { _id: user._id, $or: [{ companyId: null }, { companyId: { $exists: false } }] },
              { $set: { companyId } }
            );
          }
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
