import { asyncHandler } from "../../utils/asyncHandler.js";
import { 
  upsertPayrollSchema, 
  updatePaymentStatusSchema 
} from "./payroll.schemas.js";
import { 
  getMyPayroll, 
  upsertPayroll, 
  listPayrollAll, 
  deletePayroll,
  getPayrollById,
  getPayrollByEmployeeAndMonth,
  updatePaymentStatus,
  getPayrollStats
} from "./payroll.service.js";
import { ROLES } from "../../middleware/roles.js";

// Get current user's payroll
export const getMinePayroll = asyncHandler(async (req, res) => {
  const rows = await getMyPayroll(req.user.id);
  res.json(rows);
});

// Get all payroll records (with role-based hierarchy)
export const getAllPayroll = asyncHandler(async (req, res) => {
  const { paymentStatus, month, year } = req.query;
  const filters = {};
  
  if (paymentStatus) filters.paymentStatus = paymentStatus;
  if (month) filters.month = month;
  if (year) filters.year = parseInt(year);
  
  // Only Admin and HR can access payroll management
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.HR) {
    return res.status(403).json({ 
      message: "Only Admin and HR can view payroll records" 
    });
  }
  
  const rows = await listPayrollAll(req.user.role, req.user.id, filters);
  res.json(rows);
});

// Get single payroll by ID
export const getPayrollRecord = asyncHandler(async (req, res) => {
  const payroll = await getPayrollById(req.params.id);
  
  if (!payroll) {
    return res.status(404).json({ message: "Payroll record not found" });
  }
  
  res.json(payroll);
});

// Get payroll for specific employee and month
export const getEmployeePayroll = asyncHandler(async (req, res) => {
  const { employeeId, month, year } = req.query;
  
  if (!employeeId || !month || !year) {
    return res.status(400).json({ 
      message: "employeeId, month, and year are required" 
    });
  }
  
  const payroll = await getPayrollByEmployeeAndMonth(employeeId, month, parseInt(year));
  
  if (!payroll) {
    return res.status(404).json({ message: "Payroll record not found" });
  }
  
  res.json(payroll);
});

// Create or update payroll
export const putPayroll = asyncHandler(async (req, res) => {
  const data = upsertPayrollSchema.parse(req.body);
  
  const doc = await upsertPayroll(data, req.user.id);
  res.json({ payroll: doc });
});

// Update payment status
export const updatePaymentStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updatePaymentStatusSchema.parse(req.body);
  
  const payroll = await updatePaymentStatus(id, data, req.user.id);
  
  if (!payroll) {
    return res.status(404).json({ message: "Payroll record not found" });
  }
  
  res.json({ 
    message: "Payment status updated successfully",
    payroll 
  });
});

// Delete payroll record
export const removePayroll = asyncHandler(async (req, res) => {
  const payroll = await deletePayroll(req.params.id);
  
  if (!payroll) {
    return res.status(404).json({ message: "Payroll record not found" });
  }
  
  res.json({ message: "Payroll deleted successfully" });
});

// Get payroll statistics
export const getPayrollStatsHandler = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  
  if (!year) {
    return res.status(400).json({ message: "year parameter is required" });
  }
  
  const stats = await getPayrollStats(req.user.role, req.user.id, parseInt(year), month);
  res.json(stats);
});
