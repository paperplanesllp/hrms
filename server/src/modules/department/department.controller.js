import { asyncHandler } from "../../utils/asyncHandler.js";
import { departmentSchema, designationSchema, designationUpdateSchema } from "./department.schemas.js";
import {
  listDepartments,
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listDesignations,
  getDesignationsByDepartment,
  getDesignationById,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  deleteDesignationsByDepartment
} from "./department.service.js";

// ============ Department Controllers ============
export const getAllDepartmentsCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const departments = await getAllDepartments(req.user.companyId);
  res.json(departments);
});

export const getActiveDepartmentsCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const departments = await listDepartments(req.user.companyId);
  res.json(departments);
});

export const getDepartmentCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const department = await getDepartmentById(req.params.id, req.user.companyId);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json(department);
});

export const createDepartmentCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const data = departmentSchema.parse(req.body);
  const department = await createDepartment(data, req.user.companyId);
  res.status(201).json(department);
});

export const updateDepartmentCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const data = departmentSchema.parse(req.body);
  const department = await updateDepartment(req.params.id, data, req.user.companyId);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json(department);
});

export const deleteDepartmentCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  // Soft delete designations first
  await deleteDesignationsByDepartment(req.params.id, req.user.companyId);
  
  const department = await deleteDepartment(req.params.id, req.user.companyId);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json({ message: "Department deleted successfully", department });
});

// ============ Designation Controllers ============
export const getAllDesignationsCtrl = asyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const designations = await listDesignations(req.user.companyId, departmentId);
  res.json(designations);
});

export const getDesignationsByDeptCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const designations = await getDesignationsByDepartment(req.user.companyId, req.params.departmentId);
  res.json(designations);
});

export const getDesignationCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const designation = await getDesignationById(req.params.id, req.user.companyId);
  if (!designation) {
    return res.status(404).json({ error: "Designation not found" });
  }
  res.json(designation);
});

export const createDesignationCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const data = designationSchema.parse(req.body);
  const designation = await createDesignation(data, req.user.companyId);
  res.status(201).json(designation);
});

export const updateDesignationCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const data = designationUpdateSchema.parse({ id: req.params.id, ...req.body });
  const designation = await updateDesignation(req.params.id, data, req.user.companyId);
  if (!designation) {
    return res.status(404).json({ error: "Designation not found" });
  }
  res.json(designation);
});

export const deleteDesignationCtrl = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    return res.status(400).json({ error: "Company is required" });
  }
  const designation = await deleteDesignation(req.params.id, req.user.companyId);
  if (!designation) {
    return res.status(404).json({ error: "Designation not found" });
  }
  res.json({ message: "Designation deleted successfully", designation });
});
