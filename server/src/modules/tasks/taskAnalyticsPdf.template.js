import {
  clampNumber,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatHours,
  formatPercent,
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

export function renderTaskAnalyticsPdfHtml(report) {
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
    
    .page-break { break-before: page; page-break-before: always; }
    @page { size: A4; margin: 12mm; }
  `;

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
              <p class="subtitle">Executive task performance, productivity, overdue exposure, and department execution summary.</p>
              <div class="report-meta">
                <div class="meta-pill"><span>Date Range</span><strong>${escapeHtml(report.period.label)}</strong></div>
                <div class="meta-pill"><span>Generated</span><strong>${escapeHtml(formatDateTime(report.generatedAt))}</strong></div>
                <div class="meta-pill"><span>Theme</span><strong>${escapeHtml(report.theme)}</strong></div>
              </div>
            </div>
          </header>

          ${renderMemberHeader(report.memberInfo, report.brand)}

          ${report.taskDetails && report.taskDetails.length > 0 ? `
            <section class="panel">
              <div class="section-title">
                <h2>Task Details</h2>
                <p>Recent tasks and their descriptions</p>
              </div>
              ${renderTaskDetails(report.taskDetails)}
            </section>
          ` : ""}

          <section class="metrics">
            ${metricCard("Total Tasks", String(report.summary.totalTasks), "blue", `${report.summary.activeEmployees} active employees`)}
            ${metricCard("Completed", String(report.summary.completedTasks), "green", `${formatPercent(report.summary.completionRate)} completion rate`)}
            ${metricCard("Pending", String(report.summary.pendingTasks), "amber", "Open workload")}
            ${metricCard("Overdue", String(report.summary.overdueTasks), "red", "Needs attention")}
            ${metricCard("Worked Hours", formatHours(report.summary.workedHours), "blue", "Tracked active work")}
            ${metricCard("Productivity", formatPercent(report.summary.productivity), "green", "Completed vs assigned")}
            ${metricCard("Departments", String(report.summary.departments), "amber", "With task activity")}
            ${metricCard("Report Period", formatDate(report.period.fromDate), "red", `to ${formatDate(report.period.toDate)}`)}
          </section>

          <section class="panel">
            <div class="section-title">
              <h2>Employee Performance</h2>
              <p>${report.employees.length} employee rows</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width:20%">Employee Name</th>
                  <th style="width:16%">Department</th>
                  <th style="width:10%">Total Tasks</th>
                  <th style="width:10%">Completed</th>
                  <th style="width:9%">Pending</th>
                  <th style="width:9%">Overdue</th>
                  <th style="width:11%">Worked Hours</th>
                  <th style="width:15%">Productivity %</th>
                </tr>
              </thead>
              <tbody>${renderEmployeeRows(report.employees)}</tbody>
            </table>
          </section>

          <section class="grid-2">
            <section class="panel">
              <div class="section-title">
                <h2>Task Completion</h2>
                <p>Status mix</p>
              </div>
              ${renderCompletionChart(report.charts)}
            </section>

            <section class="panel">
              <div class="section-title">
                <h2>AI Insights</h2>
                <p>Generated from report metrics</p>
              </div>
              <ul class="insights">${renderInsights(report.insights)}</ul>
            </section>
          </section>

          <section class="panel page-break">
            <div class="section-title">
              <h2>Department Analytics</h2>
              <p>Completion, pending work, and overdue load</p>
            </div>
            <div class="department-list">${renderDepartmentCards(report.departments)}</div>
          </section>
        </main>
      </body>
    </html>
  `;
}
