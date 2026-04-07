import { Department } from "./Department.model.js";
import { Designation } from "./Designation.model.js";

// ============ Department Services ============
export const listDepartments = async () => {
  return await Department.find({ isActive: true }).sort({ name: 1 });
};

export const getAllDepartments = async () => {
  return await Department.find().sort({ name: 1 });
};

export const getDepartmentById = async (id) => {
  return await Department.findById(id);
};

export const createDepartment = async (data) => {
  const department = new Department(data);
  return await department.save();
};

export const updateDepartment = async (id, data) => {
  return await Department.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true });
};

export const deleteDepartment = async (id) => {
  // Soft delete - mark as inactive
  return await Department.findByIdAndUpdate(id, { isActive: false }, { returnDocument: "after" });
};

// ============ Designation Services ============
export const listDesignations = async (departmentId = null) => {
  const query = { isActive: true };
  if (departmentId) query.departmentId = departmentId;
  
  return await Designation.find(query)
    .populate("departmentId", "name")
    .sort({ level: 1, name: 1 });
};

export const getDesignationsByDepartment = async (departmentId) => {
  return await Designation.find({ departmentId, isActive: true })
    .populate("departmentId", "name")
    .sort({ level: 1, name: 1 });
};

export const getDesignationById = async (id) => {
  return await Designation.findById(id).populate("departmentId", "name");
};

export const createDesignation = async (data) => {
  const designation = new Designation(data);
  return await designation.save();
};

export const updateDesignation = async (id, data) => {
  return await Designation.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true }).populate("departmentId", "name");
};

export const deleteDesignation = async (id) => {
  // Soft delete - mark as inactive
  return await Designation.findByIdAndUpdate(id, { isActive: false }, { returnDocument: "after" });
};

export const deleteDesignationsByDepartment = async (departmentId) => {
  return await Designation.updateMany({ departmentId }, { isActive: false });
};
