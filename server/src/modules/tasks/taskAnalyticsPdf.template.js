import {
  clampNumber,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatHours,
  formatPercent,
  formatDuration,
  formatDays,
  getStatusLabel,
  getPriorityLabel,
  getStatusTone,
} from "./taskAnalyticsPdf.utils.js";

function statusBadge(value, tone) {
  return `<span class="badge badge-${tone}">${escapeHtml(value)}</span>`;
}

function progressBar(value, tone = "blue") {
  const percent = clampNumber(value);
  return `
    <div class="progress">
      <div class="progress-fill progress-${tone}" style="width:${percent}%"></div>
    </div>
  `;
}

function metricCard(label, value, accent, detail = "") {
  return `
    <section class="metric-card">
      <div class="metric-accent metric-${accent}"></div>
      <p class="metric-label">${escapeHtml(label)}</p>
      <h2>${escapeHtml(value)}</h2>
      ${detail ? `<p class="metric-detail">${escapeHtml(detail)}</p>` : ""}
    </section>
  `;
}

function renderEmployeeRows(employees) {
  if (!employees.length) {
    return `<tr><td colspan="8" class="empty-row">No task data found for the selected period.</td></tr>`;
  }

  return employees.map((employee) => {
    const productivityTone = employee.productivity >= 80 ? "green" : employee.productivity >= 55 ? "amber" : "red";
    return `
      <tr>
        <td>
          <strong>${escapeHtml(employee.employeeName)}</strong>
        </td>
        <td>${escapeHtml(employee.department)}</td>
        <td>${employee.totalTasks}</td>
        <td>${statusBadge(employee.completed, "success")}</td>
        <td>${statusBadge(employee.pending, "warning")}</td>
        <td>${statusBadge(employee.overdue, employee.overdue > 0 ? "danger" : "muted")}</td>
        <td>${formatHours(employee.workedHours)}</td>
        <td class="productivity-cell">
          <span>${formatPercent(employee.productivity)}</span>
          ${progressBar(employee.productivity, productivityTone)}
        </td>
      </tr>
    `;
  }).join("");
}

function renderDepartmentCards(departments) {
  if (!departments.length) {
    return `<section class="empty-panel">No department analytics available for this period.</section>`;
  }

  return departments.map((department) => `
    <section class="department-card">
      <div class="department-head">
        <h3>${escapeHtml(department.department)}</h3>
        ${statusBadge(formatPercent(department.productivity), department.productivity >= 75 ? "success" : department.productivity >= 50 ? "warning" : "danger")}
      </div>
      <div class="department-grid">
        <span>Total <strong>${department.totalTasks}</strong></span>
        <span>Done <strong>${department.completed}</strong></span>
        <span>Pending <strong>${department.pending}</strong></span>
        <span>Overdue <strong>${department.overdue}</strong></span>
      </div>
      ${progressBar(department.productivity, department.productivity >= 75 ? "green" : department.productivity >= 50 ? "amber" : "red")}
      <p>${formatHours(department.workedHours)} worked</p>
    </section>
  `).join("");
}

function renderCompletionChart(charts) {
  const items = [
    ["Completed", charts.taskCompletion.completed, "green"],
    ["In Progress", charts.taskCompletion.inProgress, "blue"],
    ["Pending", charts.taskCompletion.pending, "amber"],
    ["Overdue", charts.taskCompletion.overdue, "red"],
  ];

  return items.map(([label, value, tone]) => {
    const width = charts.total > 0 ? Math.round((value / charts.total) * 100) : 0;
    return `
      <div class="chart-row">
        <div class="chart-label">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
        ${progressBar(width, tone)}
      </div>
    `;
  }).join("");
}

function renderInsights(insights) {
  return insights.map((insight, index) => `
    <li>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <p>${escapeHtml(insight)}</p>
    </li>
  `).join("");
}

function formatMinutesLabel(minutes) {
  const mins = Number(minutes) || 0;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours > 0) {
    return `${hours}h ${remainder}m`;
  }
  return `${remainder}m`;
}

function renderTimeline(timeline = []) {
  if (!timeline.length) return `<div class="timeline-empty">No lifecycle events recorded.</div>`;
  return `
    <div class="task-timeline">
      ${timeline.map((event) => `
        <div class="timeline-item">
          <span class="timeline-dot"></span>
          <div>
            <strong>${escapeHtml(event.label)}</strong>
            <span>${escapeHtml(formatDateTime(event.at))}</span>
            ${event.detail ? `<p>${escapeHtml(event.detail)}</p>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function completionBadge(task) {
  const label = task.completionStatus || task.completionResultLabel || "In progress";
  const lower = label.toLowerCase();
  const tone = lower.includes("late") || lower.includes("overdue")
    ? "danger"
    : lower.includes("approaching")
      ? "warning"
      : lower.includes("on time")
        ? "success"
        : "info";
  return statusBadge(label, tone);
}

function renderTaskCards(employeeDetails, maxTasksPerEmployee = 100) {
  if (!employeeDetails || employeeDetails.length === 0) {
    return `<section class="empty-panel">No tasks found for the selected employee in this period.</section>`;
  }

  return employeeDetails.map((employee) => `
    <section class="employee-section">
      <div class="employee-header">
        <div class="employee-avatar">${escapeHtml(employee.initials || "HR")}</div>
        <div class="employee-header-content">
          <h2>${escapeHtml(employee.employeeName)}</h2>
          <p class="employee-dept">${escapeHtml(employee.department)}</p>
        </div>
        <div class="performance-badge badge-${getPerformanceTone(employee.performanceLabel)}">
          ${escapeHtml(employee.performanceLabel || "Good")}
        </div>
      </div>
      <div class="task-card-stats">
        <div class="task-stat"><span>Total Tasks</span><strong>${employee.totalTasks}</strong></div>
        <div class="task-stat task-stat-success"><span>Completed</span><strong>${employee.completed}</strong></div>
        <div class="task-stat task-stat-warning"><span>Pending</span><strong>${employee.pending}</strong></div>
        <div class="task-stat task-stat-danger"><span>Overdue</span><strong>${employee.overdue}</strong></div>
        <div class="task-stat"><span>Productivity</span><strong>${formatPercent(employee.productivity)}</strong></div>
        <div class="task-stat"><span>Worked Hours</span><strong>${escapeHtml(formatHours(employee.workedHours))}</strong></div>
        <div class="task-stat"><span>Paused Hours</span><strong>${escapeHtml(formatHours(employee.totalPausedHours || 0))}</strong></div>
      </div>

      <div class="task-card-list">
        ${employee.tasks.slice(0, maxTasksPerEmployee).map((task, index) => {
          const tone = task.timeStatusLabel === "Overdue" ? "danger" : task.timeStatusLabel === "Hold/Paused" ? "purple" : task.timeStatusLabel === "Pending" ? "warning" : "success";
          const statusTone = getStatusTone(task.status);
          return `
            <article class="task-card">
              <div class="task-header">
                <div class="task-title-section">
                  <span class="task-number">${String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h4>${escapeHtml(task.title || "Untitled Task")}</h4>
                    <p class="task-description">${escapeHtml(task.description || "No short description provided.")}</p>
                  </div>
                </div>
                <div class="task-badges">
                  ${statusBadge(getStatusLabel(task.status), statusTone)}
                  ${statusBadge(getPriorityLabel(task.priority), task.priority === "HIGH" || task.priority === "URGENT" ? "danger" : "info")}
                  ${completionBadge(task)}
                </div>
              </div>
              <div class="task-progress-row">
                <span>Progress ${clampNumber(task.progress)}%</span>
                ${progressBar(task.progress, tone)}
              </div>
              <div class="task-metrics-grid">
                <div><strong>Assigned By</strong><span>${escapeHtml(task.assignedBy || "System")}</span></div>
                <div><strong>Assigned To</strong><span>${escapeHtml(task.assignedTo || employee.employeeName)}</span></div>
                <div><strong>Department</strong><span>${escapeHtml(task.department || employee.department || "Unassigned")}</span></div>
                <div><strong>Created</strong><span>${escapeHtml(formatDateTime(task.createdAt))}</span></div>
                <div><strong>Started</strong><span>${escapeHtml(formatDateTime(task.startedAt))}</span></div>
                <div><strong>Stopped</strong><span>${escapeHtml(formatDateTime(task.stoppedAt))}</span></div>
                <div><strong>Completed</strong><span>${escapeHtml(formatDateTime(task.completedAt))}</span></div>
                <div><strong>Due Date</strong><span>${escapeHtml(formatDateTime(task.dueDate))}</span></div>
                <div><strong>Estimated</strong><span>${escapeHtml(formatMinutesLabel(task.estimatedMinutes))}</span></div>
                <div><strong>Total Worked</strong><span>${escapeHtml(formatMinutesLabel(task.workedMinutes))}</span></div>
                <div><strong>Total Paused</strong><span>${escapeHtml(formatMinutesLabel(Math.round((task.pausedHours || 0) * 60)))}</span></div>
                <div><strong>Active Time</strong><span>${escapeHtml(formatMinutesLabel(task.workedMinutes))}</span></div>
                <div><strong>Overdue Time</strong><span>${escapeHtml(formatHours(task.overdueHours || 0))}</span></div>
                <div><strong>Completion</strong><span>${escapeHtml(task.completionResultLabel)}</span></div>
                <div><strong>Time Status</strong><span>${escapeHtml(task.timeStatusLabel)}</span></div>
                <div><strong>Extension</strong><span>${escapeHtml(task.extensionStatus || "none")}</span></div>
              </div>
              <div class="timeline-wrap">
                <strong>Task History</strong>
                ${renderTimeline(task.timeline)}
              </div>
              ${task.remarks ? `<div class="task-notes"><strong>Remarks</strong><p>${escapeHtml(task.remarks)}</p></div>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");
}

function renderMemberHeader(memberInfo, companyInfo) {
  if (!memberInfo) return "";
  
  return `
    <section class="member-header">
      <div class="member-avatar">${escapeHtml(memberInfo.initials || "HR")}</div>
      <div class="member-details">
        <div class="member-info">
          <h3>${escapeHtml(memberInfo.name)}</h3>
          <p class="member-designation">${escapeHtml(memberInfo.department || "Team Member")}</p>
        </div>
        <div class="member-company">
          <p class="company-label">Company</p>
          <p class="company-name">${escapeHtml(companyInfo?.companyName || "TheHRSaathi")}</p>
        </div>
      </div>
    </section>
  `;
}

function renderTaskDetails(tasks) {
  if (!tasks || tasks.length === 0) {
    return `<section class="empty-panel">No task details available for this period.</section>`;
  }

  const limitedTasks = tasks.slice(0, 10);
  return `
    <section class="task-details-list">
      ${limitedTasks.map((task, index) => {
        const taskStatusColor = task.status === "completed" ? "success" : 
                               task.status === "overdue" ? "danger" : 
                               task.status === "in-progress" ? "info" : "warning";
        const taskStatusLabel = task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : "Pending";
        
        return `
          <div class="task-card">
            <div class="task-header">
              <div class="task-title-section">
                <span class="task-number">${String(index + 1).padStart(2, "0")}</span>
                <h4>${escapeHtml(task.title || "Untitled Task")}</h4>
              </div>
              <span class="task-status badge-${taskStatusColor}">${escapeHtml(taskStatusLabel)}</span>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
            <div class="task-meta">
              <span class="meta-item">
                <strong>Assigned By:</strong> ${escapeHtml(task.assignedBy || "System")}
              </span>
              <span class="meta-item">
                <strong>Due:</strong> ${escapeHtml(formatDate(task.dueDate) || "N/A")}
              </span>
              ${task.priority ? `<span class="meta-item"><strong>Priority:</strong> ${escapeHtml(task.priority)}</span>` : ""}
            </div>
            ${task.progress ? `<div class="progress"><div class="progress-fill progress-blue" style="width:${clampNumber(task.progress)}%"></div></div>` : ""}
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderRiskTasks(riskTasks) {
  if (!riskTasks || riskTasks.length === 0) {
    return `<section class="empty-panel">No overdue or at-risk tasks in this period.</section>`;
  }

  return `
    <table class="risk-table">
      <thead>
        <tr>
          <th style="width:20%">Employee</th>
          <th style="width:25%">Task Title</th>
          <th style="width:10%">Status</th>
          <th style="width:10%">Priority</th>
          <th style="width:10%">Due Date</th>
          <th style="width:10%">Overdue By</th>
          <th style="width:15%">Hours</th>
        </tr>
      </thead>
      <tbody>
        ${riskTasks.map((task) => `
          <tr>
            <td><strong>${escapeHtml(task.employeeName)}</strong></td>
            <td>${escapeHtml(task.title)}</td>
            <td>${statusBadge(task.status, getStatusTone(task.status))}</td>
            <td>${escapeHtml(getPriorityLabel(task.priority))}</td>
            <td>${escapeHtml(formatDate(task.dueDate))}</td>
            <td class="${task.daysOverdue > 0 ? "alert-cell" : ""}">${escapeHtml(formatDays(task.daysOverdue))}</td>
            <td>${escapeHtml(formatHours(task.workedHours))} / ${escapeHtml(formatHours(task.estimatedHours))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderEmployeeTaskDetails(employeeDetails, maxTasksPerEmployee = 100) {
  if (!employeeDetails || employeeDetails.length === 0) {
    return "";
  }

  return employeeDetails.map((employee) => `
    <div class="page-break"></div>
    <section class="employee-section">
      <div class="employee-header">
        <div class="employee-avatar">${escapeHtml(employee.initials || "HR")}</div>
        <div class="employee-header-content">
          <h2>${escapeHtml(employee.employeeName)}</h2>
          <p class="employee-dept">${escapeHtml(employee.department)}</p>
        </div>
        <div class="performance-badge badge-${getPerformanceTone(employee.performanceLabel)}">
          ${escapeHtml(employee.performanceLabel || "Good")}
        </div>
      </div>

      <div class="employee-metrics">
        <div class="emp-metric">
          <span class="emp-metric-label">Total Tasks</span>
          <span class="emp-metric-value">${employee.totalTasks}</span>
        </div>
        <div class="emp-metric">
          <span class="emp-metric-label">Completed</span>
          <span class="emp-metric-value success">${employee.completed}</span>
        </div>
        <div class="emp-metric">
          <span class="emp-metric-label">Pending</span>
          <span class="emp-metric-value warning">${employee.pending}</span>
        </div>
        <div class="emp-metric">
          <span class="emp-metric-label">Overdue</span>
          <span class="emp-metric-value ${employee.overdue > 0 ? "danger" : ""}">${employee.overdue}</span>
        </div>
        <div class="emp-metric">
          <span class="emp-metric-label">Productivity</span>
          <span class="emp-metric-value">${formatPercent(employee.productivity)}</span>
        </div>
        <div class="emp-metric">
          <span class="emp-metric-label">Worked Hours</span>
          <span class="emp-metric-value">${escapeHtml(formatHours(employee.workedHours))}</span>
        </div>
      </div>

      ${employee.tasks && employee.tasks.length > 0 ? `
        <section class="emp-tasks-panel">
          <h3>Task Details (${employee.tasks.length} tasks)</h3>
          <table class="emp-task-table">
            <thead>
              <tr>
                <th style="width:10%">Task Title</th>
                <th style="width:12%">Description</th>
                <th style="width:5%">Status</th>
                <th style="width:4%">Priority</th>
                <th style="width:5%">Assigned By</th>
                <th style="width:5%">Assigned To</th>
                <th style="width:5%">Start Date</th>
                <th style="width:5%">Due Date</th>
                <th style="width:5%">Completed Date</th>
                <th style="width:4%">Est. Time</th>
                <th style="width:4%">Worked</th>
                <th style="width:4%">Paused</th>
                <th style="width:4%">Hold</th>
                <th style="width:4%">Pending</th>
                <th style="width:4%">Overdue</th>
                <th style="width:5%">Extension</th>
                <th style="width:11%">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${employee.tasks.slice(0, maxTasksPerEmployee).map((task) => `
                <tr>
                  <td><strong>${escapeHtml(task.title)}</strong></td>
                  <td class="task-desc">${escapeHtml((task.description || "").substring(0, 100))}${task.description && task.description.length > 100 ? "..." : ""}</td>
                  <td>${statusBadge(getStatusLabel(task.status), getStatusTone(task.status))}</td>
                  <td>${escapeHtml(getPriorityLabel(task.priority))}</td>
                  <td>${escapeHtml(task.assignedBy || "System")}</td>
                  <td>${escapeHtml(task.assignedTo || employee.employeeName)}</td>
                  <td>${escapeHtml(formatDate(task.startedAt))}</td>
                  <td>${escapeHtml(formatDate(task.dueDate))}</td>
                  <td>${escapeHtml(formatDate(task.completedAt))}</td>
                  <td>${escapeHtml(formatHours(task.estimatedHours))}</td>
                  <td>${escapeHtml(formatHours(task.workedHours))}</td>
                  <td>${escapeHtml(formatHours(task.pausedHours))}</td>
                  <td>${escapeHtml(formatHours(task.holdHours))}</td>
                  <td>${escapeHtml(formatHours(task.pendingHours))}</td>
                  <td>${task.isOverdue ? statusBadge(`${task.daysOverdue}d`, "danger") : statusBadge("No", "success")}</td>
                  <td>${task.extensionRequested ? statusBadge("Requested", "warning") : 
                        task.extensionStatus === "approved" ? statusBadge("Approved", "success") :
                        task.extensionStatus === "rejected" ? statusBadge("Rejected", "danger") :
                        statusBadge("None", "muted")}</td>
                  <td class="task-remarks">${escapeHtml((task.remarks || "").substring(0, 80))}${task.remarks && task.remarks.length > 80 ? "..." : ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>
      ` : `
        <section class="empty-panel">No tasks found for this employee in the selected period.</section>
      `}
    </section>
  `).join("");
}

function getPerformanceTone(label) {
  const tones = {
    "Excellent": "success",
    "Good": "info",
    "Needs Attention": "warning",
    "Critical": "danger",
    "No Activity": "muted",
  };
  return tones[label] || "muted";
}

function renderTaskAnalyticsPdfHtml(report) {
  const isDark = report.theme === "dark";
  const css = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: ${isDark ? "#e5eefb" : "#172033"};
      background: ${isDark ? "#08111f" : "#f5f7fb"};
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { padding: 30px; }
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 24px;
      padding: 26px;
      color: #fff;
      background: linear-gradient(135deg, #0f766e 0%, #2563eb 48%, #111827 100%);
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 85% 18%, rgba(255,255,255,.24), transparent 24%),
        linear-gradient(90deg, rgba(255,255,255,.14), transparent);
      pointer-events: none;
    }
    .hero-content { position: relative; z-index: 1; }
    .brand-row, .report-meta, .section-title, .department-head, .chart-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .logo {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.18);
      border: 1px solid rgba(255,255,255,.34);
      font-weight: 900;
      font-size: 20px;
      letter-spacing: .5px;
      backdrop-filter: blur(10px);
    }
    .brand-copy p, .hero h1, .hero .subtitle { margin: 0; }
    .brand-copy p:first-child { font-weight: 800; font-size: 18px; }
    .brand-copy p:last-child { opacity: .82; }
    .hero h1 { margin-top: 28px; font-size: 34px; line-height: 1.04; letter-spacing: 0; }
    .subtitle { max-width: 580px; margin-top: 10px; color: rgba(255,255,255,.82); font-size: 13px; }
    .report-meta { margin-top: 22px; align-items: stretch; }
    .meta-pill {
      min-width: 145px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.22);
      backdrop-filter: blur(10px);
    }
    .meta-pill span { display: block; font-size: 10px; text-transform: uppercase; color: rgba(255,255,255,.72); }
    .meta-pill strong { display: block; margin-top: 3px; font-size: 12px; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 18px 0;
    }
    .metric-card, .panel, .department-card, .empty-panel {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      background: ${isDark ? "rgba(15,23,42,.82)" : "rgba(255,255,255,.84)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.18)" : "rgba(226,232,240,.88)"};
      box-shadow: 0 14px 32px ${isDark ? "rgba(0,0,0,.28)" : "rgba(15,23,42,.08)"};
    }
    .metric-card { min-height: 116px; padding: 18px; page-break-inside: avoid; }
    .metric-accent { position: absolute; inset: 0 0 auto 0; height: 4px; }
    .metric-blue { background: #2563eb; }
    .metric-green { background: #10b981; }
    .metric-amber { background: #f59e0b; }
    .metric-red { background: #ef4444; }
    .metric-info { background: #0ea5e9; }
    .metric-warning { background: #eab308; }
    .metric-purple { background: #a855f7; }
    .metric-label { margin: 0; color: ${isDark ? "#94a3b8" : "#64748b"}; font-weight: 700; text-transform: uppercase; font-size: 10px; }
    .metric-card h2 { margin: 10px 0 4px; font-size: 25px; letter-spacing: 0; }
    .metric-detail { margin: 0; color: ${isDark ? "#9fb0c7" : "#64748b"}; }
    .panel { margin-top: 16px; padding: 18px; page-break-inside: avoid; }
    .section-title { margin-bottom: 14px; }
    .section-title h2 { margin: 0; font-size: 16px; }
    .section-title p { margin: 0; color: ${isDark ? "#94a3b8" : "#64748b"}; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 14px;
      table-layout: fixed;
    }
    thead { display: table-header-group; }
    th {
      padding: 11px 9px;
      text-align: left;
      color: #fff;
      background: #111827;
      font-size: 10px;
      text-transform: uppercase;
    }
    td {
      padding: 10px 9px;
      border-bottom: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
      vertical-align: middle;
      word-break: break-word;
    }
    tbody tr:nth-child(odd) { background: ${isDark ? "rgba(30,41,59,.58)" : "#ffffff"}; }
    tbody tr:nth-child(even) { background: ${isDark ? "rgba(15,23,42,.48)" : "#f8fafc"}; }
    tr { page-break-inside: avoid; }
    .badge {
      display: inline-flex;
      min-width: 28px;
      justify-content: center;
      padding: 4px 8px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 10px;
    }
    .badge-success { color: #047857; background: #d1fae5; }
    .badge-warning { color: #92400e; background: #fef3c7; }
    .badge-danger { color: #b91c1c; background: #fee2e2; }
    .badge-muted { color: #475569; background: #e2e8f0; }
    .badge-info { color: #1e40af; background: #dbeafe; }
    .badge-purple { background: #e9d5ff; color: #6b21a8; }
    .productivity-cell span { display: inline-block; min-width: 34px; font-weight: 800; }
    .progress {
      display: inline-block;
      width: 86px;
      height: 7px;
      overflow: hidden;
      margin-left: 8px;
      border-radius: 999px;
      background: ${isDark ? "rgba(148,163,184,.22)" : "#e2e8f0"};
      vertical-align: middle;
    }
    .progress-fill { height: 100%; border-radius: inherit; }
    .progress-blue { background: #2563eb; }
    .progress-green { background: #10b981; }
    .progress-amber { background: #f59e0b; }
    .progress-red { background: #ef4444; }
    .progress-info { background: #0ea5e9; }
    .progress-warning { background: #eab308; }
    .progress-purple { background: #a855f7; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
      align-items: start;
    }
    .department-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .department-card, .empty-panel { padding: 14px; page-break-inside: avoid; }
    .department-card h3 { margin: 0; font-size: 13px; }
    .department-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
      color: ${isDark ? "#9fb0c7" : "#64748b"};
    }
    .department-grid strong { color: ${isDark ? "#e5eefb" : "#172033"}; }
    .department-card p { margin: 10px 0 0; color: ${isDark ? "#94a3b8" : "#64748b"}; }
    .chart-row { margin-bottom: 14px; page-break-inside: avoid; }
    .chart-label { margin-bottom: 7px; color: ${isDark ? "#cbd5e1" : "#334155"}; }
    .chart-row .progress { width: 100%; height: 12px; margin: 0; }
    .insights {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .insights li {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 10px;
      padding: 11px 0;
      border-bottom: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
      page-break-inside: avoid;
    }
    .insights li:last-child { border-bottom: 0; }
    .insights span {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      color: #0f766e;
      background: #ccfbf1;
      font-weight: 900;
      font-size: 10px;
    }
    .insights p { margin: 0; }
    .empty-row { text-align: center; color: ${isDark ? "#94a3b8" : "#64748b"}; padding: 28px; }
    
    /* Member Header Styles */
    .member-header {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 20px;
      margin: 16px 0;
      border-radius: 18px;
      background: ${isDark ? "rgba(15,23,42,.82)" : "rgba(255,255,255,.84)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.18)" : "rgba(226,232,240,.88)"};
      box-shadow: 0 14px 32px ${isDark ? "rgba(0,0,0,.28)" : "rgba(15,23,42,.08)"};
      page-break-inside: avoid;
    }
    .member-avatar {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #2563eb 0%, #0f766e 100%);
      color: white;
      font-weight: 900;
      font-size: 24px;
      flex-shrink: 0;
    }
    .member-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 20px;
    }
    .member-info h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .member-designation {
      margin: 4px 0 0;
      font-size: 11px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      text-transform: uppercase;
      font-weight: 600;
    }
    .member-company {
      text-align: right;
    }
    .company-label {
      margin: 0;
      font-size: 10px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      text-transform: uppercase;
      font-weight: 600;
    }
    .company-name {
      margin: 4px 0 0;
      font-size: 13px;
      font-weight: 700;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    
    /* Task Details Styles */
    .task-details-list {
      margin: 16px 0;
      page-break-inside: avoid;
    }
    .task-card {
      padding: 14px;
      margin-bottom: 10px;
      border-radius: 12px;
      background: ${isDark ? "rgba(30,41,59,.58)" : "#ffffff"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
      page-break-inside: avoid;
    }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }
    .task-title-section {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      flex: 1;
    }
    .task-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #2563eb;
      color: white;
      font-weight: 700;
      font-size: 10px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .task-card h4 {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .task-status {
      display: inline-flex;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .task-status.badge-success { background: #d1fae5; color: #047857; }
    .task-status.badge-warning { background: #fef3c7; color: #92400e; }
    .task-status.badge-danger { background: #fee2e2; color: #b91c1c; }
    .task-status.badge-info { background: #dbeafe; color: #1e40af; }
    
    .task-description {
      margin: 8px 0;
      font-size: 11px;
      color: ${isDark ? "#9fb0c7" : "#64748b"};
      line-height: 1.4;
    }
    .task-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
      font-size: 10px;
    }
    .meta-item {
      color: ${isDark ? "#9fb0c7" : "#64748b"};
    }
    .meta-item strong {
      color: ${isDark ? "#cbd5e1" : "#334155"};
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
    }
    
    /* Risk & Overdue Task Styles */
    .risk-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .risk-table thead {
      background: #ef4444;
    }
    .risk-table th {
      padding: 10px 8px;
      text-align: left;
      color: white;
      font-weight: 700;
      font-size: 10px;
    }
    .risk-table td {
      padding: 8px;
      border-bottom: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
    }
    .risk-table tbody tr:nth-child(odd) { background: ${isDark ? "rgba(30,41,59,.58)" : "#ffffff"}; }
    .risk-table tbody tr:nth-child(even) { background: ${isDark ? "rgba(15,23,42,.48)" : "#f8fafc"}; }
    .alert-cell {
      color: #b91c1c;
      font-weight: 700;
    }
    
    /* Employee Section Styles */
    .employee-section {
      margin: 20px 0;
      padding: 20px;
      border-radius: 18px;
      background: ${isDark ? "rgba(15,23,42,.82)" : "rgba(255,255,255,.84)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.18)" : "rgba(226,232,240,.88)"};
      page-break-inside: avoid;
    }
    .employee-header {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
    }
    .employee-avatar {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #2563eb 0%, #0f766e 100%);
      color: white;
      font-weight: 900;
      font-size: 20px;
      flex-shrink: 0;
    }
    .employee-header-content {
      flex: 1;
    }
    .employee-header-content h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .employee-dept {
      margin: 4px 0 0;
      font-size: 11px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      text-transform: uppercase;
      font-weight: 600;
    }
    .performance-badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 11px;
      white-space: nowrap;
    }
    .performance-badge.badge-success { background: #d1fae5; color: #047857; }
    .performance-badge.badge-info { background: #dbeafe; color: #1e40af; }
    .performance-badge.badge-warning { background: #fef3c7; color: #92400e; }
    .performance-badge.badge-danger { background: #fee2e2; color: #b91c1c; }
    .performance-badge.badge-muted { background: #e2e8f0; color: #475569; }
    
    .employee-metrics {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .emp-metric {
      padding: 10px;
      border-radius: 8px;
      background: ${isDark ? "rgba(148,163,184,.08)" : "rgba(226,232,240,.5)"};
      text-align: center;
    }
    .emp-metric-label {
      display: block;
      font-size: 9px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .emp-metric-value {
      display: block;
      font-size: 16px;
      font-weight: 800;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .emp-metric-value.success { color: #10b981; }
    .emp-metric-value.warning { color: #f59e0b; }
    .emp-metric-value.danger { color: #ef4444; }
    
    .emp-tasks-panel {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
    }
    .emp-tasks-panel h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 700;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .emp-task-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7px;
      margin-top: 8px;
    }
    .emp-task-table thead {
      background: ${isDark ? "rgba(30,41,59,.8)" : "#f1f5f9"};
    }
    .emp-task-table th {
      padding: 4px 2px;
      text-align: left;
      color: ${isDark ? "#cbd5e1" : "#334155"};
      font-weight: 700;
      border-bottom: 2px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .emp-task-table td {
      padding: 4px 2px;
      border-bottom: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "#e9eef6"};
      vertical-align: top;
      word-break: break-word;
      line-height: 1.2;
    }
    .emp-task-table tbody tr { 
      page-break-inside: avoid; 
      break-inside: avoid;
    }
    .emp-task-table thead { 
      page-break-after: avoid;
      break-after: avoid;
    }
    .task-desc { 
      color: ${isDark ? "#9fb0c7" : "#64748b"}; 
      max-width: 120px;
      word-wrap: break-word;
    }
    .task-remarks { 
      color: ${isDark ? "#9fb0c7" : "#64748b"}; 
      max-width: 100px;
      word-wrap: break-word;
      font-size: 6px;
    }
    
    /* Color Tones */
    .badge-purple { background: #e9d5ff; color: #6b21a8; }
    .badge-success { color: #047857; background: #d1fae5; }
    .badge-warning { color: #92400e; background: #fef3c7; }
    .badge-danger { color: #b91c1c; background: #fee2e2; }
    .badge-muted { color: #475569; background: #e2e8f0; }
    .badge-info { color: #1e40af; background: #dbeafe; }
    
    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 12px;
    }
    .summary-stat {
      padding: 12px;
      border-radius: 8px;
      background: ${isDark ? "rgba(148,163,184,.08)" : "rgba(226,232,240,.5)"};
      text-align: center;
      page-break-inside: avoid;
    }
    .summary-label {
      display: block;
      font-size: 9px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .summary-value {
      display: block;
      font-size: 20px;
      font-weight: 900;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .hero-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin: 20px 0 0;
    }
    .hero-card {
      background: ${isDark ? "rgba(9,20,36,.88)" : "rgba(255,255,255,.88)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.18)" : "rgba(226,232,240,.88)"};
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 22px 40px ${isDark ? "rgba(0,0,0,.22)" : "rgba(15,23,42,.08)"};
      page-break-inside: avoid;
    }
    .hero-card h3 {
      margin: 0 0 10px;
      font-size: 13px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .7px;
    }
    .hero-card p {
      margin: 0;
      font-size: 14px;
      color: ${isDark ? "#e5eefb" : "#172033"};
      line-height: 1.4;
    }
    .task-card-stats {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .task-stat {
      padding: 12px 14px;
      border-radius: 14px;
      background: ${isDark ? "rgba(30,41,59,.72)" : "rgba(249,250,251,.92)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.16)" : "rgba(226,232,240,.88)"};
      font-size: 11px;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .task-stat span {
      display: block;
      font-weight: 700;
      margin-bottom: 6px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
      text-transform: uppercase;
      font-size: 9px;
    }
    .task-stat strong {
      font-size: 16px;
      line-height: 1.2;
    }
    .task-card-list {
      display: grid;
      gap: 14px;
      margin-top: 18px;
    }
    .task-card {
      padding: 18px;
      border-radius: 18px;
      background: ${isDark ? "rgba(15,23,42,.88)" : "rgba(255,255,255,.96)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.18)" : "rgba(226,232,240,.88)"};
      page-break-inside: avoid;
    }
    .task-title-section {
      display: grid;
      gap: 8px;
    }
    .task-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .task-progress-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin: 14px 0;
      font-size: 10px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
    }
    .task-metrics-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    .task-metrics-grid div {
      background: ${isDark ? "rgba(30,41,59,.6)" : "rgba(248,250,252,.85)"};
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 10px;
      color: ${isDark ? "#e5eefb" : "#172033"};
    }
    .task-metrics-grid strong {
      display: block;
      margin-bottom: 6px;
      font-weight: 700;
      color: ${isDark ? "#94a3b8" : "#475569"};
      text-transform: uppercase;
    }
    .task-notes {
      margin-top: 14px;
      padding: 14px;
      border-radius: 14px;
      background: ${isDark ? "rgba(30,41,59,.5)" : "rgba(249,250,251,.9)"};
      color: ${isDark ? "#cbd5e1" : "#334155"};
      font-size: 10px;
      line-height: 1.45;
    }
    .task-notes p { margin: 0; }
    .timeline-wrap {
      margin-top: 14px;
      padding: 12px;
      border-radius: 14px;
      background: ${isDark ? "rgba(30,41,59,.46)" : "rgba(248,250,252,.92)"};
      border: 1px solid ${isDark ? "rgba(148,163,184,.14)" : "rgba(226,232,240,.9)"};
      page-break-inside: avoid;
    }
    .timeline-wrap > strong {
      display: block;
      margin-bottom: 10px;
      font-size: 10px;
      color: ${isDark ? "#94a3b8" : "#475569"};
      text-transform: uppercase;
    }
    .task-timeline {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px 10px;
    }
    .timeline-item {
      position: relative;
      display: flex;
      gap: 8px;
      min-width: 0;
    }
    .timeline-dot {
      width: 8px;
      height: 8px;
      margin-top: 4px;
      border-radius: 999px;
      background: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,.13);
      flex: 0 0 auto;
    }
    .timeline-item strong {
      display: block;
      font-size: 9px;
      color: ${isDark ? "#e5eefb" : "#172033"};
      line-height: 1.25;
    }
    .timeline-item span, .timeline-item p, .timeline-empty {
      margin: 2px 0 0;
      font-size: 8px;
      line-height: 1.25;
      color: ${isDark ? "#9fb0c7" : "#64748b"};
    }
    .page-break { break-before: page; page-break-before: always; }
    @page { size: A4 landscape; margin: 12mm; }
  `;

  const isEmployeeReport = Boolean(report.memberInfo);
  const focusLabel = isEmployeeReport
    ? "Employee-specific task analytics and performance insights"
    : "Company-wide task analytics and team performance insights";
  const employeeName = report.memberInfo?.employeeName || report.memberInfo?.name || "All Employees";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(report.brand.companyName)} Task Analytics</title>
        <style>${css}</style>
      </head>
      <body>
        <main class="page">
          <header class="hero">
            <div class="hero-content">
              <div class="brand-row">
                <div class="brand-row">
                  <div class="logo">HR</div>
                  <div class="brand-copy">
                    <p>${escapeHtml(report.brand.companyName)}</p>
                    <p>${escapeHtml(report.brand.productName)} Analytics</p>
                  </div>
                </div>
                <div class="meta-pill">
                  <span>Generated By</span>
                  <strong>${escapeHtml(report.generatedBy)}</strong>
                </div>
              </div>
              <h1>${escapeHtml(report.reportTitle)}</h1>
              <p class="subtitle">${escapeHtml(focusLabel)} with premium formatting, timeline clarity, and productivity intelligence.</p>
              <div class="report-meta">
                <div class="meta-pill"><span>Date Range</span><strong>${escapeHtml(report.period.label)}</strong></div>
                <div class="meta-pill"><span>Generated</span><strong>${escapeHtml(formatDateTime(report.generatedAt))}</strong></div>
                <div class="meta-pill"><span>Theme</span><strong>${escapeHtml(report.theme)}</strong></div>
              </div>
            </div>
          </header>

          ${renderMemberHeader(report.memberInfo, report.brand)}

          <section class="hero-summary">
            <div class="hero-card">
              <h3>Employee</h3>
              <p>${escapeHtml(employeeName)}</p>
            </div>
            <div class="hero-card">
              <h3>Report Period</h3>
              <p>${escapeHtml(report.period.label)}</p>
            </div>
            <div class="hero-card">
              <h3>Report Focus</h3>
              <p>${escapeHtml(focusLabel)}</p>
            </div>
          </section>

          <section class="metrics">
            ${metricCard("Total Tasks", String(report.summary.totalTasks), "blue", isEmployeeReport ? "Selected employee total" : "Company total")}
            ${metricCard("Completed", String(report.summary.completedTasks), "green", `${formatPercent(report.summary.onTimeCompletionRate)} on time`)}
            ${metricCard("In Progress", String(report.summary.inProgressTasks), "info", "Active work")}
            ${metricCard("Pending", String(report.summary.pendingTasks), "amber", "Queued tasks")}
            ${metricCard("Overdue", String(report.summary.overdueTasks), "red", "At-risk tasks")}
            ${metricCard("Worked Hours", formatHours(report.summary.workedHours), "purple", "Tracked effort")}
            ${metricCard("Paused Hours", formatHours(report.summary.totalPausedHours), "warning", "Blocked or paused time")}
            ${metricCard("Productivity", formatPercent(report.summary.productivity), "green", "Completion based")}
            ${metricCard("Time Efficiency", formatPercent(report.summary.timeEfficiency), "purple", "Active vs paused")}
          </section>

          <section class="panel">
            <div class="section-title">
              <h2>Executive Summary</h2>
              <p>Key employee performance metrics</p>
            </div>
            <div class="summary-grid">
              <div class="summary-stat">
                <span class="summary-label">Completion Rate</span>
                <span class="summary-value">${formatPercent(report.summary.completionRate)}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">On-Time Delivery</span>
                <span class="summary-value">${formatPercent(report.summary.onTimeCompletionRate)}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">Average Time/Task</span>
                <span class="summary-value">${report.summary.completedTasks > 0 ? formatHours(report.summary.totalTaskHours / report.summary.completedTasks) : "N/A"}</span>
              </div>
              <div class="summary-stat">
                <span class="summary-label">Productivity</span>
                <span class="summary-value">${formatPercent(report.summary.productivity)}</span>
              </div>
            </div>
          </section>

          <section class="grid-2">
            <section class="panel">
              <div class="section-title">
                <h2>Task Completion</h2>
                <p>Status distribution</p>
              </div>
              ${renderCompletionChart(report.charts)}
            </section>

            <section class="panel">
              <div class="section-title">
                <h2>AI Insights</h2>
              <p>${isEmployeeReport ? "Actionable observations for this employee" : "Actionable observations for the company"}</p>
              </div>
              <ul class="insights">${renderInsights(report.insights)}</ul>
            </section>
          </section>

          ${report.riskTasks && report.riskTasks.length > 0 ? `
            <section class="panel page-break">
              <div class="section-title">
                <h2>Overdue & At-Risk Tasks</h2>
                <p>${report.riskTasks.length} tasks requiring immediate attention</p>
              </div>
              ${renderRiskTasks(report.riskTasks)}
            </section>
          ` : ""}

          ${isEmployeeReport ? `
            <section class="panel page-break">
              <div class="section-title">
                <h2>Detailed Task Breakdown</h2>
                <p>Selected employee tasks with time, status, and completion detail</p>
              </div>
              ${renderTaskCards(report.employeeDetails, report.maxTasksPerEmployee || 100)}
            </section>
          ` : `
            <section class="panel page-break">
              <div class="section-title">
                <h2>Employee Performance</h2>
                <p>Company-wide employee task distribution</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Total</th>
                    <th>Completed</th>
                    <th>Pending</th>
                    <th>Overdue</th>
                    <th>Worked</th>
                    <th>Productivity</th>
                  </tr>
                </thead>
                <tbody>${renderEmployeeRows(report.employees || [])}</tbody>
              </table>
            </section>

            <section class="panel page-break">
              <div class="section-title">
                <h2>Department Analytics</h2>
                <p>Completion, pending work, and overdue load</p>
              </div>
              <div class="department-list">${renderDepartmentCards(report.departments)}</div>
            </section>
          `}
        </main>
      </body>
    </html>
  `;
}

export { renderTaskAnalyticsPdfHtml };
