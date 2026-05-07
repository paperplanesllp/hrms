import { StatusCodes } from "http-status-codes";
import { ROLES } from "../../middleware/roles.js";
import { ApiError } from "../../utils/apiError.js";
import { User } from "../users/User.model.js";

async function getCompanyAdminUser(companyId, adminId = null) {
  if (adminId) {
    const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN });
    if (admin) return admin;
  }

  if (companyId) {
    const admin = await User.findOne({ role: ROLES.ADMIN, companyId });
    if (admin) return admin;
  }

  throw new ApiError(StatusCodes.NOT_FOUND, "No admin user found for this company");
}

export async function getSpotifySettings(companyId, adminId = null) {
  const admin = await getCompanyAdminUser(companyId, adminId);

  return {
    spotifyWellnessEnabled: Boolean(admin.experimentalFeatures?.spotifyWellnessEnabled),
  };
}

export async function updateSpotifySettings(companyId, adminId, payload = {}) {
  const admin = await getCompanyAdminUser(companyId, adminId);

  admin.experimentalFeatures = {
    ...(admin.experimentalFeatures || {}),
    spotifyWellnessEnabled: Boolean(payload.spotifyWellnessEnabled),
  };

  await admin.save();

  return getSpotifySettings(companyId, adminId);
}
