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
  const departments = await getAllDepartments();
  res.json(departments);
});

export const getActiveDepartmentsCtrl = asyncHandler(async (req, res) => {
  const departments = await listDepartments();
  res.json(departments);
});

export const getDepartmentCtrl = asyncHandler(async (req, res) => {
  const department = await getDepartmentById(req.params.id);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json(department);
});

export const createDepartmentCtrl = asyncHandler(async (req, res) => {
  const data = departmentSchema.parse(req.body);
  const department = await createDepartment(data);
  res.status(201).json(department);
});

export const updateDepartmentCtrl = asyncHandler(async (req, res) => {
  const data = departmentSchema.parse(req.body);
  const department = await updateDepartment(req.params.id, data);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json(department);
});

export const deleteDepartmentCtrl = asyncHandler(async (req, res) => {
  // Soft delete designations first
  await deleteDesignationsByDepartment(req.params.id);
  
  const department = await deleteDepartment(req.params.id);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json({ message: "Department deleted successfully", department });
});

// ============ Designation Controllers ============
export const getAllDesignationsCtrl = asyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  const designations = await listDesignations(departmentId);
  res.json(designations);
});

export const getDesignationsByDeptCtrl = asyncHandler(async (req, res) => {
  const designations = await getDesignationsByDepartment(req.params.departmentId);
  res.json(designations);
});

export const getDesignationCtrl = asyncHandler(async (req, res) => {
  const designation = await getDesignationById(req.params.id);
  if (!designation) {
    return res.status(404).json({ error: "Designation not found" });
  }
  res.json(designation);
});

export const createDesignationCtrl = asyncHandler(async (req, res) => {
  const data = designationSchema.parse(req.body);
  const designation = await createDesignation(data);
  res.status(201).json(designation);
});

export const updateDesignationCtrl = asyncHandler(async (req, res) => {
  const data = designationUpdateSchema.parse({ id: req.params.id, ...req.body });
  const designation = await updateDesignation(req.params.id, data);
  if (!designation) {
    return res.status(404).json({ error: "Designation not found" });
  }
  res.json(designation);
});

export const deleteDesignationCtrl = asyncHandler(async (req, res) => {
  const designation = await deleteDesignation(req.params.id);
  if (!designation) {
    return res.status(404).json({ error: "Designation not found" });
  }
  res.json({ message: "Designation deleted successfully", designation });
});
