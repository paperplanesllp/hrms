import { Company } from "./Company.model.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { createUser } from "../users/users.service.js";
import { ROLES } from "../../middleware/roles.js";
import { User } from "../users/User.model.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listCompanies() {
  return await Company.find().sort({ createdAt: -1 });
}

export async function listCompaniesWithAdmins() {
  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  const companyIds = companies.map((company) => company._id);

  const admins = await User.find({
    companyId: { $in: companyIds },
    role: ROLES.ADMIN,
  })
    .select("name email companyId")
    .lean();

  const adminsByCompany = new Map();
  for (const admin of admins) {
    const key = String(admin.companyId || "");
    if (!adminsByCompany.has(key)) adminsByCompany.set(key, []);
    adminsByCompany.get(key).push({
      id: String(admin._id),
      name: admin.name,
      email: admin.email,
    });
  }

  return companies.map((company) => ({
    ...company,
    admins: adminsByCompany.get(String(company._id)) || [],
  }));
}

export async function createCompany(data, actorId) {
  const name = String(data.name || "").trim();
  const domain = String(data.domain || "").trim().toLowerCase();

  if (!name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company name is required");
  }

  const existingByName = await Company.findOne({
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  });

  if (existingByName) {
    throw new ApiError(StatusCodes.CONFLICT, "Company name already exists");
  }

  if (domain) {
    const existingByDomain = await Company.findOne({ domain });
    if (existingByDomain) {
      throw new ApiError(StatusCodes.CONFLICT, "Company domain already exists");
    }
  }

  const company = new Company({
    name,
    domain: domain || undefined,
    contactEmail: String(data.contactEmail || "").trim().toLowerCase(),
    contactPhone: String(data.contactPhone || "").trim(),
    address: String(data.address || "").trim(),
    createdBy: actorId || null,
  });

  return await company.save();
}

export async function createCompanyAdmin(companyId, payload) {
  if (!companyId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Company is required");
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Company not found");
  }

  const user = await createUser({
    name: payload.name,
    email: String(payload.email || "").trim().toLowerCase(),
    phone: payload.phone || "",
    role: ROLES.ADMIN,
    password: payload.password,
    companyId,
  });

  return user;
}

export async function updateCompany(companyId, data) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Company not found");
  }

  const name = data.name !== undefined ? String(data.name || "").trim() : undefined;
  const domain = data.domain !== undefined ? String(data.domain || "").trim().toLowerCase() : undefined;

  if (name) {
    const existingByName = await Company.findOne({
      _id: { $ne: companyId },
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    if (existingByName) {
      throw new ApiError(StatusCodes.CONFLICT, "Company name already exists");
    }
  }

  if (domain) {
    const existingByDomain = await Company.findOne({ _id: { $ne: companyId }, domain });
    if (existingByDomain) {
      throw new ApiError(StatusCodes.CONFLICT, "Company domain already exists");
    }
  }

  if (data.name !== undefined) company.name = name;
  if (data.domain !== undefined) company.domain = domain || undefined;
  if (data.contactEmail !== undefined) company.contactEmail = String(data.contactEmail || "").trim().toLowerCase();
  if (data.contactPhone !== undefined) company.contactPhone = String(data.contactPhone || "").trim();
  if (data.address !== undefined) company.address = String(data.address || "").trim();
  if (data.isActive !== undefined) company.isActive = data.isActive;

  await company.save();
  return company;
}

export async function deleteCompany(companyId) {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Company not found");
  }

  await Company.deleteOne({ _id: companyId });
  return company;
}
