import { Department } from "./Department.model.js";
import { Designation } from "./Designation.model.js";

// ============ Department Services ============
export const listDepartments = async (companyId) => {
  return await Department.find({ companyId, isActive: true }).sort({ name: 1 });
};

export const getAllDepartments = async (companyId) => {
  return await Department.find({ companyId }).sort({ name: 1 });
};

export const getDepartmentById = async (id, companyId) => {
  return await Department.findOne({ _id: id, companyId });
};

export const createDepartment = async (data, companyId) => {
  const department = new Department({ ...data, companyId });
  return await department.save();
};

export const updateDepartment = async (id, data, companyId) => {
  return await Department.findOneAndUpdate(
    { _id: id, companyId },
    data,
    { returnDocument: "after", runValidators: true }
  );
};

export const deleteDepartment = async (id, companyId) => {
  // Soft delete - mark as inactive
  return await Department.findOneAndUpdate(
    { _id: id, companyId },
    { isActive: false },
    { returnDocument: "after" }
  );
};

// ============ Designation Services ============
export const listDesignations = async (companyId, departmentId = null) => {
  const query = { companyId, isActive: true };
  if (departmentId) query.departmentId = departmentId;
  
  return await Designation.find(query)
    .populate("departmentId", "name")
    .sort({ level: 1, name: 1 });
};

export const getDesignationsByDepartment = async (companyId, departmentId) => {
  return await Designation.find({ companyId, departmentId, isActive: true })
    .populate("departmentId", "name")
    .sort({ level: 1, name: 1 });
};

export const getDesignationById = async (id, companyId) => {
  return await Designation.findOne({ _id: id, companyId }).populate("departmentId", "name");
};

export const createDesignation = async (data, companyId) => {
  const designation = new Designation({ ...data, companyId });
  return await designation.save();
};

export const updateDesignation = async (id, data, companyId) => {
  return await Designation.findOneAndUpdate(
    { _id: id, companyId },
    data,
    { returnDocument: "after", runValidators: true }
  ).populate("departmentId", "name");
};

export const deleteDesignation = async (id, companyId) => {
  // Soft delete - mark as inactive
  return await Designation.findOneAndUpdate(
    { _id: id, companyId },
    { isActive: false },
    { returnDocument: "after" }
  );
};

export const deleteDesignationsByDepartment = async (departmentId, companyId) => {
  return await Designation.updateMany({ departmentId, companyId }, { isActive: false });
};
