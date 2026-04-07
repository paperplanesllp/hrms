import { Payroll } from "./Payroll.model.js";
import { User } from "../users/User.model.js";
import { ROLES } from "../../middleware/roles.js";

// Get logged-in user's payroll records (only their own)
export async function getMyPayroll(userId) {
  return Payroll.find({ userId })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ month: -1 });
}

// Get payroll records based on role hierarchy:
// ADMIN → See & manage HR payroll
// HR → See & manage Employee payroll + their own payroll
// EMPLOYEE → See only their own payroll
export async function listPayrollAll(userRole, userId, filters = {}) {
  try {
    let query = {};
    
    if (userRole === ROLES.ADMIN) {
      // Admin sees only HR staff payroll
      const hrUsers = await User.find({ role: ROLES.HR }).select("_id");
      const hrIds = hrUsers.map(u => u._id);
      query.userId = { $in: hrIds };
    } else if (userRole === ROLES.HR) {
      // HR sees only Employee payroll (not admin, not other HR staff)
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select("_id");
      const adminIds = adminUsers.map(u => u._id);
      query.userId = { $nin: adminIds };
    }
    
    // Apply additional filters
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    if (filters.month) {
      query.month = filters.month;
    }
    if (filters.year) {
      query.year = filters.year;
    }
    
    return Payroll.find(query)
      .populate("userId", "name email role employeeId department designation")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ month: -1, createdAt: -1 });
  } catch (error) {
    console.error("Error in listPayrollAll:", error);
    throw error;
  }
}

// Get single payroll record
export async function getPayrollById(payrollId) {
  return Payroll.findById(payrollId)
    .populate("userId", "name email role employeeId department designation")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
}

// Get payroll for specific employee and month
export async function getPayrollByEmployeeAndMonth(userId, month, year) {
  return Payroll.findOne({ userId, month, year })
    .populate("userId", "name email role employeeId department designation");
}

// Create or update payroll record
export async function upsertPayroll(data, userId) {
  const { userId: employeeId, month, year } = data;
  
  const existingPayroll = await Payroll.findOne({ 
    userId: employeeId, 
    month, 
    year 
  });
  
  const payrollData = {
    ...data,
    updatedBy: userId,
    ...(existingPayroll ? {} : { createdBy: userId })
  };
  
  // Auto-delete old data if updating
  if (existingPayroll && data.paymentStatus === "PAID" && !data.paymentDate) {
    payrollData.paymentDate = new Date();
    payrollData.autoDeleteOn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  }
  
  return Payroll.findOneAndUpdate(
    { userId: employeeId, month, year },
    { $set: payrollData },
    { upsert: true, returnDocument: "after" }
  )
    .populate("userId", "name email role employeeId department designation")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
}

// Update payment status
export async function updatePaymentStatus(payrollId, statusData, userId) {
  const payrollData = {
    ...statusData,
    updatedBy: userId
  };
  
  // Set auto-delete date if payment is marked as PAID
  if (statusData.paymentStatus === "PAID" && !statusData.paymentDate) {
    payrollData.paymentDate = new Date();
    payrollData.autoDeleteOn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  return Payroll.findByIdAndUpdate(
    payrollId,
    { $set: payrollData },
    { returnDocument: "after" }
  )
    .populate("userId", "name email role employeeId department designation")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
}

// Delete payroll record
export async function deletePayroll(payrollId) {
  return Payroll.findByIdAndDelete(payrollId);
}

// Get payroll statistics for dashboard
export async function getPayrollStats(userRole, userId, year, month) {
  try {
    let query = { year };
    if (month) {
      query.month = month;
    }
    
    if (userRole === ROLES.ADMIN) {
      // Admin sees stats for HR staff payroll only
      const hrUsers = await User.find({ role: ROLES.HR }).select("_id");
      const hrIds = hrUsers.map(u => u._id);
      query.userId = { $in: hrIds };
    } else if (userRole === ROLES.HR) {
      // HR sees stats for Employee payroll only (not admin)
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select("_id");
      const adminIds = adminUsers.map(u => u._id);
      query.userId = { $nin: adminIds };
    }
    
    const payrolls = await Payroll.find(query);
    
    const stats = {
      totalEmployees: new Set(payrolls.map(p => p.userId.toString())).size,
      totalPayroll: payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0),
      paidEmployees: payrolls.filter(p => p.paymentStatus === "PAID").length,
      pendingPayroll: payrolls.filter(p => p.paymentStatus === "PENDING").length,
      totalRecords: payrolls.length
    };
    
    return stats;
  } catch (error) {
    console.error("Error in getPayrollStats:", error);
    throw error;
  }
}

// Auto-delete old payrolls (scheduled job)
export async function autoDeleteOldPayrolls() {
  const result = await Payroll.deleteMany({
    paymentStatus: "PAID",
    autoDeleteOn: { $lte: new Date() }
  });
  
  console.log(`🗑️ Auto-deleted ${result.deletedCount} old payroll records`);
  return result;
}

// Bulk create payroll for selected month
export async function bulkCreatePayroll(payrolls, userId) {
  const results = [];
  
  for (const payrollData of payrolls) {
    try {
      const result = await upsertPayroll(payrollData, userId);
      results.push(result);
    } catch (error) {
      console.error("Error creating payroll for employee:", error);
      results.push(null);
    }
  }
  
  return results.filter(r => r !== null);
}