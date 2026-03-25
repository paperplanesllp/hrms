import * as leaveTypeService from "./leaveType.service.js";
import { createLeaveTypeSchema, updateLeaveTypeSchema } from "./leaveType.schemas.js";

export const createLeaveTypeController = async (req, res, next) => {
  try {
    const validated = createLeaveTypeSchema.parse(req.body);
    
    const leaveType = await leaveTypeService.createLeaveType({
      ...validated,
      createdBy: req.user.id
    });

    res.status(201).json({
      message: "Leave type created successfully",
      data: leaveType
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveTypesController = async (req, res, next) => {
  try {
    const leaveTypes = await leaveTypeService.getAllLeaveTypes();
    res.json({
      data: leaveTypes,
      count: leaveTypes.length
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveTypeController = async (req, res, next) => {
  try {
    const leaveType = await leaveTypeService.getLeaveTypeById(req.params.id);
    res.json({ data: leaveType });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveTypeController = async (req, res, next) => {
  try {
    const validated = updateLeaveTypeSchema.parse(req.body);
    
    const leaveType = await leaveTypeService.updateLeaveType(req.params.id, validated);

    res.json({
      message: "Leave type updated successfully",
      data: leaveType
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLeaveTypeController = async (req, res, next) => {
  try {
    const leaveType = await leaveTypeService.deleteLeaveType(req.params.id);

    res.json({
      message: "Leave type deleted successfully",
      data: leaveType
    });
  } catch (error) {
    next(error);
  }
};
