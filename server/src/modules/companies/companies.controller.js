import { asyncHandler } from "../../utils/asyncHandler.js";
import { companyAdminCreateSchema, companyCreateSchema, companyUpdateSchema } from "./companies.schemas.js";
import { createCompany, createCompanyAdmin, deleteCompany, listCompaniesWithAdmins, updateCompany } from "./companies.service.js";

export const listCompaniesCtrl = asyncHandler(async (req, res) => {
  const companies = await listCompaniesWithAdmins();
  res.json(companies);
});

export const createCompanyCtrl = asyncHandler(async (req, res) => {
  const data = companyCreateSchema.parse(req.body);
  const company = await createCompany(data, req.user?.id || null);
  res.status(201).json(company);
});

export const createCompanyAdminCtrl = asyncHandler(async (req, res) => {
  const data = companyAdminCreateSchema.parse(req.body);
  const admin = await createCompanyAdmin(req.params.companyId, data);
  res.status(201).json({ admin });
});

export const updateCompanyCtrl = asyncHandler(async (req, res) => {
  const data = companyUpdateSchema.parse(req.body);
  const company = await updateCompany(req.params.companyId, data);
  res.json(company);
});

export const deleteCompanyCtrl = asyncHandler(async (req, res) => {
  const company = await deleteCompany(req.params.companyId);
  res.json({ company });
});
