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
    workedHours: 0,
    productivity: 0,
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

  return insights;
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
    .select("title status assignedTo assignedBy department dueAt dueDate completedAt createdAt priority progress estimatedHours estimatedMinutes totalWorkedMilliseconds totalActiveTimeInSeconds totalPausedMilliseconds totalPausedTimeInSeconds currentSessionStartTime isRunning isPaused isOnHold startedAt extensionRequests completedOnTime")
    .populate("assignedTo", "name email departmentId")
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
    const assignees = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo : [null];
    const perAssigneeHours = assignees.length > 0 ? activeHours / assignees.length : activeHours;

    if (isCompleted) completedTasks += 1;
    else if (isOverdue) overdueTasks += 1;
    else pendingTasks += 1;

    if (isCompleted) chartBuckets.completed += 1;
    else if (isOverdue) chartBuckets.overdue += 1;
    else if (["in-progress", "paused", "on-hold", "due-soon", "extended"].includes(task.status)) chartBuckets.inProgress += 1;
    else chartBuckets.pending += 1;

    workedHours += activeHours;

    for (const assignee of assignees) {
      const assigneeId = getId(assignee) || "unassigned";
      if (!employeeMap.has(assigneeId)) {
        employeeMap.set(assigneeId, createEmptyEmployeeRow(assignee || { name: "Unassigned" }));
      }

      const employeeRow = employeeMap.get(assigneeId);
      const departmentName = getDepartmentName(task, assignee);
      employeeRow.department = departmentName;
      employeeRow.totalTasks += 1;
      employeeRow.completed += isCompleted ? 1 : 0;
      employeeRow.pending += isPending ? 1 : 0;
      employeeRow.overdue += isOverdue ? 1 : 0;
      employeeRow.workedHours += perAssigneeHours;

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
    .map((row) => ({
      ...row,
      workedHours: Number(row.workedHours.toFixed(2)),
      productivity: row.totalTasks > 0 ? Math.round(clampNumber((row.completed / row.totalTasks) * 100)) : 0,
    }))
    .sort((a, b) => b.productivity - a.productivity || b.totalTasks - a.totalTasks || a.employeeName.localeCompare(b.employeeName));

  const departments = Array.from(departmentMap.values())
    .map((row) => ({
      ...row,
      workedHours: Number(row.workedHours.toFixed(2)),
      productivity: row.totalTasks > 0 ? Math.round(clampNumber((row.completed / row.totalTasks) * 100)) : 0,
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks || a.department.localeCompare(b.department));

  const totalTasks = tasks.length;
  const summary = {
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    workedHours: Number(workedHours.toFixed(2)),
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    productivity: totalTasks > 0 ? Math.round(clampNumber((completedTasks / totalTasks) * 100)) : 0,
    activeEmployees: employees.length,
    departments: departments.length,
  };

  return {
    reportTitle: "Task Analytics Report",
    brand: {
      productName: "TheHRSaathi",
      companyName: company?.name || "TheHRSaathi",
      contactEmail: company?.contactEmail || "",
      contactPhone: company?.contactPhone || "",
      address: company?.address || "",
    },
    period,
    generatedAt,
    generatedBy: generatedBy?.name || "System",
    theme: theme === "dark" ? "dark" : "light",
    summary,
    employees,
    departments,
    charts: {
      taskCompletion: chartBuckets,
      total: Math.max(totalTasks, 1),
    },
    insights: buildInsights({ summary, employees, departments }),
  };
}
