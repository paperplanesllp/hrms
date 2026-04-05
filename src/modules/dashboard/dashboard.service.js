import { Attendance } from "../attendance/Attendance.model.js";
import { Leave } from "../leave/Leave.model.js";
import { User } from "../users/User.model.js";
import { Department } from "../department/Department.model.js";
import { Payroll } from "../payroll/Payroll.model.js";
import { LeaveType } from "../leaveType/LeaveType.model.js";

// Calculate leave balance for a user - supports multiple leave types
export async function getLeaveBalance(userId) {
  // Get all active leave types
  const leaveTypes = await LeaveType.find({ isActive: true }).lean();
  
  // Get all leaves for the user (across all types)
  const allLeaves = await Leave.find({ userId }).lean();
  
  // Calculate days from leave records
  const calculateDays = (fromDate, toDate) => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    // Add 1 to include the end date
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(days, 1); // At least 1 day
  };
  
  // Build leave balance by type
  const balanceByType = leaveTypes.map(leaveType => {
    // Get leaves for this specific type
    const typedLeaves = allLeaves.filter(leave => leave.leaveType === leaveType.name);
    
    // Calculate used days (approved leaves only)
    const usedDays = typedLeaves
      .filter(leave => leave.status === "APPROVED")
      .reduce((sum, leave) => sum + calculateDays(leave.fromDate, leave.toDate), 0);
    
    // Count pending leaves for this type
    const pendingDays = typedLeaves
      .filter(leave => leave.status === "PENDING")
      .reduce((sum, leave) => sum + calculateDays(leave.fromDate, leave.toDate), 0);
    
    const pendingRequests = typedLeaves.filter(leave => leave.status === "PENDING").length;
    
    // Calculate remaining days for this type
    const remainingDays = Math.max(leaveType.maxDaysPerYear - usedDays, 0);
    
    return {
      leaveTypeName: leaveType.name,
      maxDaysPerYear: leaveType.maxDaysPerYear,
      usedDays,
      pendingDays,
      pendingRequests,
      remainingDays,
      color: leaveType.color
    };
  });
  
  // Calculate totals across all leave types
  const totalMaxDays = leaveTypes.reduce((sum, type) => sum + type.maxDaysPerYear, 0);
  const totalUsedDays = balanceByType.reduce((sum, type) => sum + type.usedDays, 0);
  const totalPendingDays = balanceByType.reduce((sum, type) => sum + type.pendingDays, 0);
  const totalPendingRequests = balanceByType.reduce((sum, type) => sum + type.pendingRequests, 0);
  const totalRemainingDays = Math.max(totalMaxDays - totalUsedDays, 0);
  
  return {
    // Overall summary
    total: totalMaxDays,
    used: totalUsedDays,
    pending: totalPendingRequests,
    remaining: totalRemainingDays,
    
    // Detailed breakdown by leave type
    byType: balanceByType
  };
}

export async function getDashboardStats() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayDate = new Date(today);

  // Count attended today (includes full day, short hours, and half day)
  const presentToday = await Attendance.countDocuments({ 
    date: today, 
    status: { $in: ["PRESENT", "SHORT_HOURS", "HALF_DAY"] }
  });

  // Count short hours today (late check-ins)
  const shortHoursToday = await Attendance.countDocuments({ 
    date: today, 
    status: "SHORT_HOURS" 
  });

  // Count half-day today
  const halfDayToday = await Attendance.countDocuments({
    date: today,
    status: "HALF_DAY"
  });

  // Count absent today - employees with no check-in and no approved leave
  // Get all employees (role !== "ADMIN" to exclude admins from attendance)
  const totalEmployees = await User.countDocuments({ 
    role: { $in: ["HR", "USER"] }
  });

  // Get employees who have attendance records today (any status)
  const employeesWithAttendanceToday = await Attendance.distinct('userId', { 
    date: today 
  });

  // Get employees with approved leave for today
  const employeesWithLeaveToday = await Leave.find({
    status: "APPROVED",
    fromDate: { $lte: todayDate },
    toDate: { $gte: todayDate }
  }).distinct('userId');

  // Merge both arrays and get unique count
  const usersWithActivityToday = new Set([
    ...employeesWithAttendanceToday.map(id => id.toString()),
    ...employeesWithLeaveToday.map(id => id.toString())
  ]);

  // Absent = Total employees - (those with activity + those on leave)
  const absentToday = totalEmployees - usersWithActivityToday.size;

  // Count pending leaves
  const leavePending = await Leave.countDocuments({ 
    status: "PENDING" 
  });

  // Payroll pending - placeholder
  // TODO: Implement when Payroll model is set up
  const payrollPending = 0;

  return {
    presentToday,
    shortHoursToday,
    halfDayToday,
    absentToday: Math.max(0, absentToday),
    leavePending,
    payrollPending
  };
}

// Get list of all absent employees (not checked in and no approved leave)
export async function getAbsentEmployees() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayDate = new Date(today);

  // Get all employees (exclude ADMIN)
  const allEmployees = await User.find({ 
    role: { $in: ["HR", "USER"] }
  }).lean();

  // Get employees who have attendance records today
  const employeesWithAttendanceToday = await Attendance.distinct('userId', { 
    date: today 
  });

  // Get employees with approved leave for today
  const employeesWithLeaveToday = await Leave.find({
    status: "APPROVED",
    fromDate: { $lte: todayDate },
    toDate: { $gte: todayDate }
  }).distinct('userId');

  // Create set of IDs who have activity
  const usersWithActivityToday = new Set([
    ...employeesWithAttendanceToday.map(id => id.toString()),
    ...employeesWithLeaveToday.map(id => id.toString())
  ]);

  // Filter absent employees
  const absentEmployees = allEmployees.filter(emp => 
    !usersWithActivityToday.has(emp._id.toString())
  );

  // Sort by name and return with essential info
  return absentEmployees
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      departmentId: emp.departmentId,
      designationId: emp.designationId,
      phone: emp.phone,
      gender: emp.gender
    }));
}

function getDateRange(range) {
  const now = new Date();
  let startDate = new Date();

  switch (range) {
    case "daily":
      startDate.setDate(now.getDate());
      break;
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(now.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: now.toISOString().split("T")[0]
  };
}

function generateDatePoints(startDate, endDate, range) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const points = [];

  if (range === "daily") {
    // Generate hourly points for today (9am to 6pm)
    const hours = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm"];
    for (let i = 0; i < hours.length; i++) {
      points.push({
        date: hours[i],
        fullDate: startDate
      });
    }
  } else if (range === "week") {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      points.push({
        date: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
        fullDate: d.toISOString().split("T")[0]
      });
    }
  } else if (range === "month") {
    for (let i = 0; i < 30; i += 2) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d <= end) {
        points.push({
          date: `Day ${d.getDate()}`,
          fullDate: d.toISOString().split("T")[0]
        });
      }
    }
  } else if (range === "quarter") {
    for (let i = 0; i < 90; i += 7) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d <= end) {
        points.push({
          date: `Week ${Math.floor(i / 7) + 1}`,
          fullDate: d.toISOString().split("T")[0]
        });
      }
    }
  } else if (range === "year") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      if (d <= end) {
        points.push({
          date: months[d.getMonth()],
          fullDate: d.toISOString().split("T")[0]
        });
      }
    }
  }

  return points;
}

export async function getAnalyticsData(range = "month") {
  const { startDate, endDate } = getDateRange(range);
  const datePoints = generateDatePoints(startDate, endDate, range);

  // Get all attendance records for the period
  const attendanceRecords = await Attendance.find({
    date: { $gte: startDate, $lte: endDate }
  }).lean();

  // Get total employees
  const totalEmployees = await User.countDocuments({ role: "USER" });

  // Calculate KPIs
  const totalPresent = attendanceRecords.filter(a => a.status === "PRESENT").length;
  const totalAbsent = attendanceRecords.filter(a => a.status === "ABSENT").length;
  const totalLate = attendanceRecords.filter(a => a.status === "SHORT_HOURS").length;
  const totalHalfDay = attendanceRecords.filter(a => a.status === "HALF_DAY").length;
  
  const attendanceRate = totalEmployees > 0 
    ? (((totalPresent + totalLate + totalHalfDay) / (totalPresent + totalAbsent + totalLate + totalHalfDay)) * 100).toFixed(1)
    : 0;
  
  const onTimeRate = totalEmployees > 0 && (totalPresent + totalLate + totalHalfDay) > 0
    ? ((totalPresent / (totalPresent + totalLate + totalHalfDay)) * 100).toFixed(1)
    : 0;

  // Get leave requests
  const leaveRecords = await Leave.find({
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).lean();

  const leavePending = leaveRecords.filter(l => l.status === "PENDING").length;

  // Get leave analytics data
  const leaveByStatus = {
    approved: leaveRecords.filter(l => l.status === "APPROVED").length,
    pending: leaveRecords.filter(l => l.status === "PENDING").length,
    rejected: leaveRecords.filter(l => l.status === "REJECTED").length
  };

  // Generate attendance trend chart data
  const attendanceTrendData = datePoints.map(point => {
    const dayAttendance = attendanceRecords.filter(a => a.date === point.fullDate);
    return {
      date: point.date,
      present: dayAttendance.filter(a => a.status === "PRESENT").length,
      halfDay: dayAttendance.filter(a => a.status === "HALF_DAY").length,
      absent: dayAttendance.filter(a => a.status === "ABSENT").length,
      late: dayAttendance.filter(a => a.status === "SHORT_HOURS").length
    };
  });

  // Department comparison - REAL DATA
  const departments = await Department.find({ isActive: true }).lean();
  
  const departmentData = await Promise.all(
    departments.map(async (dept) => {
      const deptEmployees = await User.find({ department: dept._id }).lean();
      const deptEmployeeIds = deptEmployees.map(e => e._id.toString());
      
      if (deptEmployeeIds.length === 0) {
        return {
          department: dept.name,
          efficiency: 0,
          attendance: 0,
          productivity: 0
        };
      }
      
      const deptAttendance = attendanceRecords.filter(a => 
        a.userId && deptEmployeeIds.includes(a.userId.toString())
      );
      
      const deptDaysPresent = deptAttendance.filter(a => a.status === "PRESENT").length;
      const deptDaysAbsent = deptAttendance.filter(a => a.status === "ABSENT").length;
      const deptDaysLate = deptAttendance.filter(a => a.status === "SHORT_HOURS").length;
      const deptDaysHalfDay = deptAttendance.filter(a => a.status === "HALF_DAY").length;
      
      const totalDepts = deptDaysPresent + deptDaysAbsent + deptDaysLate + deptDaysHalfDay;
      const attendance = totalDepts > 0
        ? Math.round(((deptDaysPresent + deptDaysLate + deptDaysHalfDay) / totalDepts) * 100)
        : 0;
      
      // Calculate efficiency based on actual on-time arrivals
      const onTimePercentage = (deptDaysPresent + deptDaysLate + deptDaysHalfDay) > 0
        ? Math.round((deptDaysPresent / (deptDaysPresent + deptDaysLate + deptDaysHalfDay)) * 100)
        : 0;
      
      // Calculate productivity based on attendance rate
      const productivity = attendance;
      
      return {
        department: dept.name,
        efficiency: Math.max(0, onTimePercentage),
        attendance: Math.max(0, attendance),
        productivity: Math.max(0, productivity)
      };
    })
  );
  
  // Filter out departments with no data
  const validDepartmentData = departmentData.filter(d => 
    d.efficiency > 0 || d.attendance > 0 || d.productivity > 0 || 
    departments.find(dept => dept.name === d.department)
  );

  // Payroll distribution - REAL DATA
  const payrollRecords = await Payroll.find({
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).lean();
  
  const processedPayroll = payrollRecords.filter(p => p.status === "PROCESSED").length;
  const pendingPayroll = payrollRecords.filter(p => p.status === "PENDING").length;
  const totalPayrollAmount = payrollRecords.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const payrollData = [
    { 
      name: "Processed", 
      value: processedPayroll || 1,
      color: "#10B981" 
    },
    { 
      name: "Pending", 
      value: pendingPayroll || 1,
      color: "#F59E0B" 
    },
  ];
  
  if (processedPayroll === 0 && pendingPayroll === 0) {
    payrollData.push({ name: "No Data", value: 1, color: "#E5E7EB" });
  }

  // Leave analytics - REAL TIME-SERIES DATA
  const leaveAnalyticsData = datePoints.map(point => {
    const pointLeaves = leaveRecords.filter(l => {
      const leaveDate = new Date(l.createdAt).toISOString().split("T")[0];
      return leaveDate === point.fullDate;
    });
    
    return {
      fullDate: point.fullDate,
      date: point.date,
      approved: pointLeaves.filter(l => l.status === "APPROVED").length,
      pending: pointLeaves.filter(l => l.status === "PENDING").length,
      rejected: pointLeaves.filter(l => l.status === "REJECTED").length,
      day: point.date
    };
  }).filter(d => d.approved > 0 || d.pending > 0 || d.rejected > 0)
    .slice(-30); // Show last 30 data points only

  return {
    kpis: {
      attendanceRate: parseFloat(attendanceRate),
      onTimeRate: parseFloat(onTimeRate),
      totalLeaveRequests: leaveRecords.length,
      hoursProcessed: Math.floor(totalPresent * 8 + totalLate * 4 + totalHalfDay * 4),
      pendingLeaves: leavePending,
      activeEmployees: totalEmployees,
      processedPayroll,
      totalPayrollAmount
    },
    charts: {
      attendanceTrend: attendanceTrendData,
      departmentComparison: validDepartmentData.length > 0 ? validDepartmentData : departmentData,
      payrollDistribution: payrollData,
      leaveAnalytics: leaveAnalyticsData.length > 0 ? leaveAnalyticsData : [
        {
          day: "No Data",
          date: "No Data",
          approved: 0,
          pending: 0,
          rejected: 0
        }
      ]
    },
    summary: {
      period: range,
      startDate,
      endDate,
      totalDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)),
      totalPresent,
      totalAbsent,
      totalLate,
      totalHalfDay,
      totalEmployees,
      payrollSummary: {
        processed: processedPayroll,
        pending: pendingPayroll,
        totalAmount: totalPayrollAmount
      }
    }
  };
}
