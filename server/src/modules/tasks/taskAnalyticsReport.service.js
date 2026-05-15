import mongoose from "mongoose";
import { Task } from "./Task.model.js";
import { User } from "../users/User.model.js";
import { Company } from "../companies/Company.model.js";
import { calculateTaskMetrics } from "./taskDeadline.utils.js";
import {
  clampNumber,
  normalizeReportPeriod,
  toHoursFromMs,
} from "./taskAnalyticsPdf.utils.js";

const COMPLETED_STATUSES = new Set(["completed"]);
const CLOSED_STATUSES = new Set(["completed", "rejected", "cancelled"]);
const IN_PROGRESS_STATUSES = new Set(["in-progress", "in_progress", "paused", "on-hold", "due-soon", "extended", "under-review"]);
const ACTIVE_STATUSES = new Set(["new", "pending", "in-progress", "in_progress", "paused", "on-hold", "due-soon", "under-review", "extension_requested", "overdue", "extended"]);
const RISK_STATUSES = new Set(["overdue", "extension_requested"]);

// PDF Export Configuration
const MAX_TASKS_PER_EMPLOYEE_IN_PDF = 100;

// Status category mappings
const STATUS_CATEGORIES = {
  "completed": "completed",
  "pending": "pending",
  "new": "pending",
  "in-progress": "in_progress",
  "in_progress": "in_progress",
  "paused": "paused",
  "on-hold": "on_hold",
  "hold": "on_hold",
  "due-soon": "in_progress",
  "extended": "in_progress",
  "under-review": "in_progress",
  "extension_requested": "extension_requested",
  "overdue": "overdue",
  "rejected": "closed",
  "cancelled": "closed",
};

function getId(value) {
  return value?._id?.toString?.() || value?.toString?.() || "";
}

function getDepartmentName(task, assignee) {
  return (
    task.department?.name ||
    assignee?.departmentId?.name ||
    "Unassigned"
  );
}

function getReportTypeLabel(dateRange) {
  switch (dateRange) {
    case "week":
      return "Weekly";
    case "quarter":
      return "Quarterly";
    case "year":
      return "Yearly";
    case "custom":
      return "Custom";
    case "daily":
      return "Daily";
    case "month":
    default:
      return "Monthly";
  }
}

function getTimeStatusLabel(task, metrics) {
  if (metrics.isOverdue) return "Overdue";
  if (metrics.isOnHold || metrics.isPaused) return "Hold/Paused";
  if (task.status === "pending" || task.status === "new") return "Pending";
  if (metrics.completedOnTime === false && COMPLETED_STATUSES.has(task.status)) return "Time Exceeded";
  return "On Track";
}

function getCompletionResultLabel(task, metrics, lateByMinutes) {
  if (!COMPLETED_STATUSES.has(task.status)) return "Not Completed";
  if (metrics.completedOnTime) return "Completed On Time";
  if (lateByMinutes > 0) return `Completed Late by ${lateByMinutes}m`;
  return "Completed Late";
}

function getEstimatedTotalMinutes(task) {
  const hours = Number(task?.estimatedHours) || 0;
  const minutes = Number(task?.estimatedMinutes) || 0;
  if (hours > 0 && minutes < 60) return Math.max(0, Math.round(hours * 60 + minutes));
  return Math.max(0, Math.round(minutes || hours * 60));
}

function hasApprovedExtension(task) {
  return Array.isArray(task?.extensionRequests)
    ? task.extensionRequests.some((request) => request?.approvalStatus === "approved")
    : false;
}

function buildTaskQuery({ companyId, fromDate, toDate, departmentId }) {
  const activeStatuses = [
    "new",
    "pending",
    "in-progress",
    "in_progress",
    "paused",
    "on-hold",
    "due-soon",
    "under-review",
    "extension_requested",
    "overdue",
    "extended",
  ];

  const query = {
    companyId,
    isDeleted: false,
    $and: [{
      $or: [
        { dueDate: { $gte: fromDate, $lte: toDate } },
        { dueAt: { $gte: fromDate, $lte: toDate } },
        { startedAt: { $gte: fromDate, $lte: toDate } },
        { completedAt: { $gte: fromDate, $lte: toDate } },
        { updatedAt: { $gte: fromDate, $lte: toDate } },
        { createdAt: { $gte: fromDate, $lte: toDate } },
        {
          status: { $in: activeStatuses },
          createdAt: { $lte: toDate },
          $or: [
            { completedAt: null },
            { completedAt: { $exists: false } },
            { completedAt: { $gte: fromDate } },
          ],
        },
      ],
    }],
  };

  if (departmentId) query.department = departmentId;
  return query;
}

function buildLegacySafeTaskQuery({ companyId, companyUserIds, fromDate, toDate, departmentId }) {
  const baseQuery = buildTaskQuery({ companyId, fromDate, toDate, departmentId });
  if (!companyUserIds.length) return baseQuery;

  const { companyId: scopedCompanyId, ...rest } = baseQuery;
  return {
    ...rest,
    $and: [
      ...(rest.$and || []),
      {
        $or: [
          { companyId: scopedCompanyId },
          {
            $and: [
              { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
              {
                $or: [
                  { assignedBy: { $in: companyUserIds } },
                  {
                    $and: [
                      { $or: [{ assignedBy: { $exists: false } }, { assignedBy: null }] },
                      { assignedTo: { $in: companyUserIds } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function createEmptyEmployeeRow(user) {
  const department = user?.departmentId?.name || "Unassigned";
  return {
    employeeId: getId(user),
    employeeName: user?.name || user?.email || "Unknown Employee",
    department,
    totalTasks: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    inProgress: 0,
    paused: 0,
    completedOnTime: 0,
    completedLate: 0,
    extensionRequested: 0,
    totalPausedHours: 0,
    workedHours: 0,
    productivity: 0,
    initials: getInitials(user?.name || user?.email || "HR"),
  };
}

function createEmptyDepartmentRow(name) {
  return {
    department: name || "Unassigned",
    totalTasks: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    workedHours: 0,
    productivity: 0,
  };
}

function buildInsights({ summary, employees, departments }) {
  const bestPerformer = employees
    .filter((row) => row.totalTasks > 0)
    .sort((a, b) => b.productivity - a.productivity || b.completed - a.completed)[0];
  const riskiestDepartment = departments
    .filter((row) => row.totalTasks > 0)
    .sort((a, b) => b.overdue - a.overdue || a.productivity - b.productivity)[0];

  const insights = [];

  if (summary.completionRate >= 80) {
    insights.push(`Completion rate is strong at ${summary.completionRate}%, indicating healthy execution across the selected period.`);
  } else if (summary.completionRate >= 55) {
    insights.push(`Completion rate is moderate at ${summary.completionRate}%; focused follow-up on pending work can improve throughput.`);
  } else {
    insights.push(`Completion rate is below target at ${summary.completionRate}%, so managers should review workload balance and blockers.`);
  }

  if (summary.overdueTasks > 0) {
    insights.push(`${summary.overdueTasks} task${summary.overdueTasks === 1 ? " is" : "s are"} overdue. Prioritize due-date triage and extension governance.`);
  } else {
    insights.push("No overdue tasks were detected for this report period.");
  }

  if (bestPerformer) {
    insights.push(`${bestPerformer.employeeName} leads productivity at ${bestPerformer.productivity}% across ${bestPerformer.totalTasks} task${bestPerformer.totalTasks === 1 ? "" : "s"}.`);
  }

  if (riskiestDepartment?.overdue > 0) {
    insights.push(`${riskiestDepartment.department} needs attention with ${riskiestDepartment.overdue} overdue task${riskiestDepartment.overdue === 1 ? "" : "s"}.`);
  }

  // Add new insights
  if (summary.extensionRequestedTasks > 0) {
    insights.push(`${summary.extensionRequestedTasks} task${summary.extensionRequestedTasks === 1 ? " has" : "s have"} requested extension. Review extension requests for approval.`);
  }

  const lateCompletedCount = employees.reduce((sum, emp) => sum + (emp.completedLate || 0), 0);
  if (lateCompletedCount > 0) {
    const latePercentage = Math.round((lateCompletedCount / summary.completedTasks) * 100) || 0;
    insights.push(`${lateCompletedCount} tasks (${latePercentage}%) completed late. Review blockers and resource constraints.`);
  }

  const avgTaskTime = summary.completedTasks > 0 ? (summary.totalTaskHours / summary.completedTasks).toFixed(1) : 0;
  insights.push(`Average task completion time is ${avgTaskTime} hours per task across all completed work.`);

  if (summary.totalPausedHours > 0) {
    insights.push(`${(summary.totalPausedHours).toFixed(1)} hours of work time was paused or on-hold. Investigate bottlenecks.`);
  }

  return insights;
}

/**
 * Calculate detailed task metrics for PDF reporting
 * Handles on-time vs late completion, overdue duration, pause time, etc.
 */
function calculateDetailedTaskMetrics(task, now = new Date()) {
  const timing = calculateTaskMetrics(task, now);
  const dueDate = task.dueDate || task.dueAt;
  const completedAt = task.completedAt;
  const isCompleted = COMPLETED_STATUSES.has(task.status);

  const activeMs = timing.activeWorkedMs || 0;
  const pausedMs = timing.pausedMs || 0;
  const holdMs = timing.holdMs || 0;
  const workedHours = activeMs / (1000 * 60 * 60);
  const pausedHours = pausedMs / (1000 * 60 * 60);
  const holdHours = holdMs / (1000 * 60 * 60);
  
  // Calculate due/overdue metrics
  let daysOverdue = 0;
  let isOnTime = null;
  let isLate = false;
  
  if (dueDate) {
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(23, 59, 59, 999);
    
    if (isCompleted && completedAt) {
      const completedDate = new Date(completedAt);
      isOnTime = completedDate <= dueDateObj;
      isLate = !isOnTime;
      if (isLate) {
        daysOverdue = Math.ceil((completedDate - dueDateObj) / (1000 * 60 * 60 * 24));
      }
    } else if (!isCompleted && now > dueDateObj) {
      // Currently overdue
      daysOverdue = Math.ceil((now - dueDateObj) / (1000 * 60 * 60 * 24));
    }
  }
  
  // Calculate estimated hours
  const estimatedMs = timing.estimatedMs || getEstimatedTotalMinutes(task) * 60 * 1000;
  const estimatedHours = estimatedMs / (1000 * 60 * 60);
  
  // Calculate category
  const statusCategory = STATUS_CATEGORIES[task.status] || "pending";
  
  return {
    workedHours: Number(workedHours.toFixed(2)),
    pausedHours: Number(pausedHours.toFixed(2)),
    holdHours: Number(holdHours.toFixed(2)),
    estimatedHours: Number(estimatedHours.toFixed(2)),
    activeWorkedMs: activeMs,
    pausedMs,
    holdMs,
    estimatedMs,
    remainingMs: timing.remainingMs,
    deadlineRemainingMs: timing.deadlineRemainingMs,
    effectiveDueAt: timing.effectiveDueAt,
    isOverdue: timing.isOverdue || daysOverdue > 0,
    isDueSoon: timing.isDueSoon,
    timingHealth: timing.timingHealth,
    completedOnTime: timing.completedOnTime,
    daysOverdue,
    isOnTime: isOnTime === null ? null : isOnTime,
    isLate,
    statusCategory,
    progress: task.progress || 0,
  };
}

function getLastDate(items = [], field) {
  return [...(Array.isArray(items) ? items : [])]
    .map((item) => item?.[field])
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function getCompletionStatus(task, metrics, now = new Date()) {
  if (COMPLETED_STATUSES.has(task.status)) {
    if (metrics.completedOnTime === true || metrics.isOnTime === true) return "Completed on time";
    return "Completed late";
  }

  if (metrics.isOverdue || task.status === "overdue" || metrics.daysOverdue > 0) {
    return "Overdue";
  }

  if (metrics.isDueSoon || metrics.timingHealth === "risk") {
    return "Approaching limit";
  }

  return "In progress";
}

function getExtensionStatus(task) {
  const requests = Array.isArray(task?.extensionRequests) ? task.extensionRequests : [];
  const latest = requests[requests.length - 1];
  if (latest?.approvalStatus) return latest.approvalStatus;
  if (task?.approvalStatus && task.approvalStatus !== "none") return task.approvalStatus;
  if (task?.status === "extension_requested") return "pending";
  return "none";
}

function buildTaskTimeline(task) {
  const timeline = [];
  const add = (label, at, detail = "") => {
    if (!at) return;
    const date = new Date(at);
    if (Number.isNaN(date.getTime())) return;
    timeline.push({ label, at: date, detail });
  };

  add("Created", task.createdAt);
  add("Started", task.startedAt);

  (task.pauseEntries || []).forEach((entry) => {
    add("Paused", entry.pausedAt, entry.reason || "");
    add("Resumed", entry.resumedAt);
  });

  (task.pauses || []).forEach((entry) => {
    add("Paused", entry.pausedAt, entry.reason || "");
    add("Resumed", entry.resumedAt);
  });

  (task.holdEntries || []).forEach((entry) => {
    add("On hold", entry.heldAt, entry.reason || "");
    add("Hold released", entry.resumedAt);
  });

  (task.extensionRequests || []).forEach((request) => {
    add("Extension requested", request.requestedAt, request.requestRemarks || "");
    add(`Extension ${request.approvalStatus || "updated"}`, request.approvedAt || request.rejectedAt);
  });

  add("Completed", task.completedAt, task.completionRemarks || "");

  return timeline.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 16);
}

/**
 * Group tasks by employee with detailed breakdown
 */
function groupTasksByEmployee(tasks, employees, companyUserIds) {
  const employeeTasksMap = new Map();
  
  // Initialize employee task lists
  for (const user of employees) {
    const userId = getId(user);
    if (!employeeTasksMap.has(userId)) {
      employeeTasksMap.set(userId, {
        employee: user,
        tasks: [],
        tasksByStatus: {
          completed: [],
          pending: [],
          in_progress: [],
          paused: [],
          on_hold: [],
          extension_requested: [],
          overdue: [],
          closed: [],
        },
      });
    }
  }
  
  // Assign tasks to employees
  for (const task of tasks) {
    const assignees = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo : [];
    
    for (const assignee of assignees) {
      const assigneeId = getId(assignee);
      if (!assigneeId) continue;
      
      if (!employeeTasksMap.has(assigneeId)) {
        employeeTasksMap.set(assigneeId, {
          employee: assignee,
          tasks: [],
          tasksByStatus: {
            completed: [],
            pending: [],
            in_progress: [],
            paused: [],
            on_hold: [],
            extension_requested: [],
            overdue: [],
            closed: [],
          },
        });
      }
      
      const category = STATUS_CATEGORIES[task.status] || "pending";
      const metrics = calculateDetailedTaskMetrics(task);
      
      const estimatedMinutes = getEstimatedTotalMinutes(task);
      const workedMinutes = Math.round(metrics.workedHours * 60);
      const holdMinutes = Math.round(metrics.holdHours * 60);
      const pendingMinutes = Math.max(0, metrics.remainingMs !== null ? Math.round(metrics.remainingMs / 60000) : 0);
      const isTimeExceeded = metrics.estimatedMs > 0 && metrics.activeWorkedMs > metrics.estimatedMs;
      const completedLate = metrics.isLate === true;
      const completedOnTime = metrics.completedOnTime === true;
      const lateByMinutes = completedLate && task.completedAt && metrics.effectiveDueAt
        ? Math.max(0, Math.ceil((new Date(task.completedAt).getTime() - new Date(metrics.effectiveDueAt).getTime()) / 60000))
        : 0;

      const taskData = {
        _id: task._id?.toString?.() || "",
        title: task.title || "Untitled Task",
        description: task.description || "",
        status: task.status,
        category,
        priority: task.priority || "MEDIUM",
        dueDate: task.dueDate || task.dueAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        stoppedAt: getLastDate(task.pauseEntries, "pausedAt") || getLastDate(task.pauses, "pausedAt") || null,
        department: getDepartmentName(task, assignee),
        assignedBy: typeof task.assignedBy === "object" ? (task.assignedBy?.name || "System") : (task.assignedBy || "System"),
        assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo.map(a => typeof a === "object" ? a.name : a).join(", ") : "",
        estimatedMinutes,
        workedMinutes,
        holdMinutes,
        pendingMinutes,
        estimatedHours: metrics.estimatedHours,
        workedHours: metrics.workedHours,
        pausedHours: metrics.pausedHours,
        holdHours: metrics.holdHours,
        pendingHours: Math.max(0, metrics.estimatedHours - metrics.workedHours),
        daysOverdue: metrics.daysOverdue,
        overdueHours: Number(Math.max(0, metrics.isOverdue && metrics.deadlineRemainingMs ? Math.abs(metrics.deadlineRemainingMs) / 3600000 : metrics.daysOverdue * 24).toFixed(2)),
        isOverdue: metrics.isOverdue || metrics.daysOverdue > 0,
        isTimeExceeded,
        completedLate,
        completedOnTime,
        lateByMinutes,
        completionResultLabel: getCompletionResultLabel(task, metrics, lateByMinutes),
        completionStatus: getCompletionStatus(task, metrics),
        timeStatusLabel: getTimeStatusLabel(task, metrics),
        extensionStatus: getExtensionStatus(task),
        extensionRequested: task.status === "extension_requested" || Array.isArray(task.extensionRequests) && task.extensionRequests.length > 0,
        extensionApproved: hasApprovedExtension(task),
        remarks: task.remarks?.length > 0 ? 
          task.remarks.map(r => r.text).join("; ") : 
          (task.comments?.length > 0 ? task.comments.map(c => c.text).join("; ") : (task.completionRemarks || "")),
        timeline: buildTaskTimeline(task),
        progress: task.progress || 0,
      };
      
      const employeeData = employeeTasksMap.get(assigneeId);
      employeeData.tasks.push(taskData);
      
      if (employeeData.tasksByStatus[category]) {
        employeeData.tasksByStatus[category].push(taskData);
      }
    }
  }
  
  return employeeTasksMap;
}

/**
 * Identify overdue and risk tasks for summary section
 */
function extractRiskTasks(tasks) {
  const now = new Date();
  const riskTasks = [];
  
  for (const task of tasks) {
    const metrics = calculateDetailedTaskMetrics(task, now);
    
    if (RISK_STATUSES.has(task.status) || metrics.isLate || metrics.daysOverdue > 0) {
      const assignees = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo : [];
      
      for (const assignee of assignees) {
        riskTasks.push({
          taskId: task._id?.toString?.() || "",
          title: task.title || "Untitled Task",
          status: task.status,
          employeeName: assignee?.name || "Unknown",
          departmentName: assignee?.departmentId?.name || "Unassigned",
          dueDate: task.dueDate || task.dueAt,
          daysOverdue: metrics.daysOverdue,
          daysOverdueLabel: metrics.daysOverdue > 0 ? `${metrics.daysOverdue} days` : "0 days",
          workedHours: metrics.workedHours,
          estimatedHours: metrics.estimatedHours,
          priority: task.priority || "MEDIUM",
          isOverdue: metrics.daysOverdue > 0,
          isExtensionRequested: task.status === "extension_requested",
        });
      }
    }
  }
  
  return riskTasks.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0)).slice(0, 20);
}

/**
 * Calculate performance label based on productivity and overdue count
 */
function getPerformanceLabel(productivity, overdueTasks, totalTasks) {
  if (totalTasks === 0) return "No Activity";
  if (productivity >= 85 && overdueTasks === 0) return "Excellent";
  if (productivity >= 70 && overdueTasks <= 1) return "Good";
  if (productivity >= 50 || overdueTasks <= 2) return "Needs Attention";
  return "Critical";
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "HR";
}

export async function buildTaskAnalyticsReportData(options = {}) {
  const {
    companyId,
    generatedBy,
    from,
    to,
    dateRange,
    departmentId,
    employeeId,
    theme = "light",
  } = options;

  if (!companyId) {
    throw new Error("Company context is required");
  }

  const generatedAt = new Date();
  const period = normalizeReportPeriod({ from, to, dateRange });
  let employeeObjectId = null;

  if (employeeId && employeeId !== "all") {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      throw new Error("Invalid employeeId");
    }

    const employee = await User.findOne({ _id: employeeId, companyId }).select("_id").lean();
    if (!employee) {
      throw new Error("Employee not found in this company");
    }

    employeeObjectId = employee._id;
  }

  const [company, companyUsers] = await Promise.all([
    companyId ? Company.findById(companyId).select("name contactEmail contactPhone address").lean() : null,
    companyId
      ? User.find({
          companyId,
          approvalStatus: "APPROVED",
          ...(employeeObjectId ? { _id: employeeObjectId } : {}),
        })
          .select("_id name email departmentId role")
          .populate("departmentId", "name")
          .sort({ name: 1 })
          .lean()
      : [],
  ]);

  const companyUserIds = companyUsers.map((user) => user._id);
  const query = buildLegacySafeTaskQuery({
    companyId,
    companyUserIds,
    fromDate: period.fromDate,
    toDate: period.toDate,
    departmentId,
  });
  if (employeeObjectId) {
    query.assignedTo = employeeObjectId;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[TASK_PDF_ANALYTICS]", {
      companyId: String(companyId),
      employeeId: options.employeeId || "all",
      startDate: period.fromDate,
      endDate: period.toDate,
      query: JSON.stringify(query),
    });
  }

  const tasks = await Task.find(query)
    .select("title description status assignedTo assignedBy department dueAt dueDate completedAt createdAt startedAt priority progress estimatedHours estimatedMinutes totalWorkedMilliseconds totalActiveTimeInSeconds totalPausedMilliseconds totalPausedTimeInSeconds totalHoldTimeInSeconds currentSessionStartTime isRunning isPaused isOnHold extensionRequests approvalStatus completedOnTime completionRemarks comments remarks pauseEntries pauses holdEntries activityLog")
    .populate("assignedTo", "name email departmentId")
    .populate("assignedTo.departmentId", "name")
    .populate("assignedBy", "name email")
    .populate("department", "name")
    .sort({ createdAt: -1 })
    .lean({ virtuals: false });

  if (process.env.NODE_ENV !== "production") {
    console.log("[TASK_PDF_ANALYTICS_RESULT]", {
      taskCount: tasks.length,
      employeeSummaryCount: companyUsers.length,
    });
  }

  const now = new Date();
  const employeeMap = new Map(companyUsers.map((user) => [getId(user), createEmptyEmployeeRow(user)]));
  const departmentMap = new Map();
  let completedTasks = 0;
  let pendingTasks = 0;
  let overdueTasks = 0;
  let workedHours = 0;
  const chartBuckets = { completed: 0, pending: 0, overdue: 0, inProgress: 0 };

  for (const task of tasks) {
    const metrics = calculateTaskMetrics(task, now);
    const isCompleted = COMPLETED_STATUSES.has(task.status);
    const isOverdue = metrics.isOverdue || task.status === "overdue";
    const isPending = !isCompleted && !isOverdue;
    const activeHours = toHoursFromMs(metrics.activeWorkedMs);
    const assignees = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo : [];
    const perAssigneeHours = assignees.length > 0 ? activeHours / assignees.length : 0;

    if (isCompleted) completedTasks += 1;
    else if (isOverdue) overdueTasks += 1;
    else pendingTasks += 1;

    if (isCompleted) chartBuckets.completed += 1;
    else if (isOverdue) chartBuckets.overdue += 1;
    else if (["in-progress", "paused", "on-hold", "due-soon", "extended"].includes(task.status)) chartBuckets.inProgress += 1;
    else chartBuckets.pending += 1;

    workedHours += activeHours;

    if (assignees.length === 0) {
      continue;
    }

    for (const assignee of assignees) {
      const assigneeId = getId(assignee);
      if (!assigneeId) continue;
      if (!employeeMap.has(assigneeId)) {
        employeeMap.set(assigneeId, createEmptyEmployeeRow(assignee));
      }

      const employeeRow = employeeMap.get(assigneeId);
      const departmentName = getDepartmentName(task, assignee);
      employeeRow.department = departmentName;
      employeeRow.totalTasks += 1;
      employeeRow.completed += isCompleted ? 1 : 0;
      employeeRow.pending += isPending ? 1 : 0;
      employeeRow.overdue += isOverdue ? 1 : 0;
      employeeRow.inProgress += ["in-progress", "in_progress", "paused", "on-hold", "due-soon", "extended", "under-review"].includes(task.status) ? 1 : 0;
      employeeRow.paused += task.status === "paused" ? 1 : 0;
      employeeRow.extensionRequested += task.status === "extension_requested" || (Array.isArray(task.extensionRequests) && task.extensionRequests.length > 0) ? 1 : 0;
      employeeRow.completedOnTime += isCompleted && metrics.completedOnTime === true ? 1 : 0;
      employeeRow.completedLate += isCompleted && metrics.completedOnTime === false ? 1 : 0;
      employeeRow.workedHours += perAssigneeHours;
      employeeRow.totalPausedHours += toHoursFromMs(metrics.pausedMs || 0) / Math.max(assignees.length, 1);

      if (!departmentMap.has(departmentName)) {
        departmentMap.set(departmentName, createEmptyDepartmentRow(departmentName));
      }
      const departmentRow = departmentMap.get(departmentName);
      departmentRow.totalTasks += 1;
      departmentRow.completed += isCompleted ? 1 : 0;
      departmentRow.pending += isPending ? 1 : 0;
      departmentRow.overdue += isOverdue ? 1 : 0;
      departmentRow.workedHours += perAssigneeHours;
    }
  }

  const employees = Array.from(employeeMap.values())
    .filter((row) => row.totalTasks > 0)
    .map((row) => {
      return {
        ...row,
        workedHours: Number(row.workedHours.toFixed(2)),
        totalPausedHours: Number((row.totalPausedHours || 0).toFixed(2)),
        productivity: row.totalTasks > 0 ? Math.round(clampNumber((row.completed / row.totalTasks) * 100)) : 0,
        performanceLabel: getPerformanceLabel(
          row.totalTasks > 0 ? Math.round(clampNumber((row.completed / row.totalTasks) * 100)) : 0,
          row.overdue,
          row.totalTasks
        ),
        completedOnTime: row.completedOnTime || 0,
        completedLate: row.completedLate || Math.max(0, row.completed - (row.completedOnTime || 0)),
        extensionRequested: row.extensionRequested || 0,
        inProgress: row.inProgress || 0,
        paused: row.paused || 0,
        onHold: 0,
      };
    })
    .sort((a, b) => b.productivity - a.productivity || b.totalTasks - a.totalTasks || a.employeeName.localeCompare(b.employeeName));

  const departments = Array.from(departmentMap.values())
    .map((row) => ({
      ...row,
      workedHours: Number(row.workedHours.toFixed(2)),
      productivity: row.totalTasks > 0 ? Math.round(clampNumber((row.completed / row.totalTasks) * 100)) : 0,
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks || a.department.localeCompare(b.department));

  // Count additional metrics
  let inProgressTasks = 0;
  let pausedTasks = 0;
  let onHoldTasks = 0;
  let extensionRequestedTasks = 0;
  let completedOnTimeCount = 0;
  let completedLateCount = 0;
  let timeExceededTasks = 0;
  let totalTaskHours = 0;
  let totalPausedHours = 0;

  for (const task of tasks) {
    const detailed = calculateDetailedTaskMetrics(task, now);
    
    if (task.status === "in-progress" || task.status === "in_progress") inProgressTasks++;
    if (task.status === "paused") pausedTasks++;
    if (task.status === "on-hold" || task.status === "hold") onHoldTasks++;
    if (task.status === "extension_requested") extensionRequestedTasks++;
    if (COMPLETED_STATUSES.has(task.status)) {
      totalTaskHours += detailed.workedHours;
      if (detailed.isOnTime === true) completedOnTimeCount++;
      if (detailed.isLate === true) completedLateCount++;
    }
    if (detailed.estimatedHours > 0 && detailed.workedHours > detailed.estimatedHours) {
      timeExceededTasks++;
    }
    totalPausedHours += detailed.pausedHours;
  }

  const totalTasks = tasks.length;
  const summary = {
    totalEmployees: employees.length,
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    pausedTasks,
    onHoldTasks,
    overdueTasks,
    extensionRequestedTasks,
    completedOnTimeCount,
    completedLateCount,
    timeExceededTasks,
    workedHours: Number(workedHours.toFixed(2)),
    totalTaskHours: Number(totalTaskHours.toFixed(2)),
    totalPausedHours: Number(totalPausedHours.toFixed(2)),
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    onTimeCompletionRate: completedTasks > 0 ? Math.round((completedOnTimeCount / completedTasks) * 100) : 0,
    productivity: totalTasks > 0 ? Math.round(clampNumber((completedTasks / totalTasks) * 100)) : 0,
    timeEfficiency: totalTaskHours > 0 ? Math.round(clampNumber(((totalTaskHours - totalPausedHours) / totalTaskHours) * 100)) : 0,
    avgTaskTime: completedTasks > 0 ? Number((totalTaskHours / completedTasks).toFixed(2)) : 0,
    activeEmployees: employees.length,
    departments: departments.length,
  };

  // Group tasks by employee
  const employeeTasksMap = groupTasksByEmployee(tasks, companyUsers, companyUserIds);
  
  // Extract risk tasks
  const riskTasks = extractRiskTasks(tasks);
  
  // Build employee details with full task breakdown
  const employeeDetails = [];
  for (const [employeeId, employeeData] of employeeTasksMap) {
    const empRow = employees.find((e) => e.employeeId === employeeId);
    if (empRow && employeeData.tasks.length > 0) {
      employeeDetails.push({
        ...empRow,
        tasks: employeeData.tasks,
        tasksByStatus: employeeData.tasksByStatus,
      });
    }
  }

  // Get member info if filtered by employee
  let memberInfo = null;
  if (employeeObjectId) {
    const member = companyUsers.find((u) => u._id.toString() === employeeObjectId.toString());
    if (member) {
      memberInfo = {
        name: member.name,
        employeeName: member.name,
        department: member.departmentId?.name || "Team Member",
        initials: getInitials(member.name),
        email: member.email,
        role: member.role || "USER",
      };
    }
  }

  const taskDetails = employeeDetails.flatMap((employee) => employee.tasks || []);

  return {
    reportTitle: memberInfo
      ? `${memberInfo.employeeName} Task Performance Report`
      : "Team Task Performance Report",
    reportScope: memberInfo ? "employee" : "team",
    brand: {
      productName: "TheHRSaathi",
      companyName: company?.name || "TheHRSaathi",
      contactEmail: company?.contactEmail || "",
      contactPhone: company?.contactPhone || "",
      address: company?.address || "",
    },
    period,
    reportType: getReportTypeLabel(period.dateRange),
    generatedAt,
    generatedBy: generatedBy?.name || "System",
    generatedByEmail: generatedBy?.email || "",
    theme: theme === "dark" ? "dark" : "light",
    maxTasksPerEmployee: MAX_TASKS_PER_EMPLOYEE_IN_PDF,
    summary,
    employees,
    employeeDetails,
    taskDetails,
    departments,
    riskTasks,
    charts: {
      taskCompletion: chartBuckets,
      total: Math.max(totalTasks, 1),
      byStatus: {
        completed: completedTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        paused: pausedTasks,
        onHold: onHoldTasks,
        overdue: overdueTasks,
        extensionRequested: extensionRequestedTasks,
      },
    },
    insights: buildInsights({ summary, employees, departments }),
    memberInfo,
  };
}
