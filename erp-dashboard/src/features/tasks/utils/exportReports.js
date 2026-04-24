import { toast } from '../../../store/toastStore.js';
import { calcActiveSeconds } from './taskTimerUtils.js';

/**
 * Export analytics data as CSV
 */
export const exportAsCSV = (analyticsData, teamPerformance, fileName = 'task-reports.csv') => {
  try {
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Add Analytics Summary
    csvContent += 'TASK ANALYTICS SUMMARY\n';
    csvContent += 'Task Completion Rate,' + (analyticsData?.completionRate || 0) + '%\n';
    csvContent += 'Total Tasks,' + (analyticsData?.totalTasks || 0) + '\n';
    csvContent += 'Completed Tasks,' + (analyticsData?.completedTasks || 0) + '\n';
    csvContent += 'In Progress Tasks,' + (analyticsData?.inProgressTasks || 0) + '\n';
    csvContent += 'On Hold Tasks,' + (analyticsData?.onHoldTasks || 0) + '\n';
    csvContent += 'Overdue Tasks,' + (analyticsData?.overdueTasks || 0) + '\n\n';

    // Add Team Performance Data
    csvContent += 'TEAM PERFORMANCE METRICS\n';
    csvContent += 'Team Member,Completed,In Progress,Avg Completion Time (Hours),Performance Score\n';

    if (teamPerformance && teamPerformance.length > 0) {
      teamPerformance.forEach(member => {
        const name = (member.name || member.userName || 'Unknown').replace(/,/g, ' ');
        const row = [
          name,
          member.completed || 0,
          member.inProgress || 0,
          member.avgCompletionTime || 'N/A',
          member.performanceScore || 0
        ].join(',');
        csvContent += row + '\n';
      });
    }

    // Create and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export successful',
      message: `Reports exported as ${fileName}`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    toast({
      title: 'Export failed',
      message: 'Failed to export as CSV',
      type: 'error'
    });
  }
};

/**
 * Export analytics data as Excel (Simple XLSX generation)
 */
export const exportAsExcel = async (analyticsData, teamPerformance, fileName = 'task-reports.xlsx') => {
  try {
    // Load XLSX library
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js');
    
    if (!window.XLSX) {
      throw new Error('XLSX library failed to load');
    }

    generateExcel(analyticsData, teamPerformance, fileName);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    // Fallback to CSV if Excel export fails
    toast({
      title: 'Excel export not available',
      message: 'Exporting as CSV instead',
      type: 'warning'
    });
    exportAsCSV(analyticsData, teamPerformance, fileName.replace('.xlsx', '.csv'));
  }
};

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (src.includes('xlsx') && window.XLSX) {
      resolve();
      return;
    }
    if (src.includes('jspdf') && (window.jsPDF || window.jsPDF?.jsPDF)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
};

const generateExcel = (analyticsData, teamPerformance, fileName) => {
  try {
    const XLSX = window.XLSX;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Analytics Sheet
    const analyticsSheetData = [
      ['TASK ANALYTICS SUMMARY'],
      [],
      ['Metric', 'Value'],
      ['Task Completion Rate', (analyticsData?.completionRate || 0) + '%'],
      ['Total Tasks', analyticsData?.totalTasks || 0],
      ['Completed Tasks', analyticsData?.completedTasks || 0],
      ['In Progress Tasks', analyticsData?.inProgressTasks || 0],
      ['On Hold Tasks', analyticsData?.onHoldTasks || 0],
      ['Overdue Tasks', analyticsData?.overdueTasks || 0],
    ];
    const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsSheetData);
    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics');

    // Team Performance Sheet
    const teamData = [
      ['TEAM PERFORMANCE METRICS'],
      [],
      ['Team Member', 'Completed', 'In Progress', 'Avg Completion Time (Hours)', 'Performance Score']
    ];

    if (teamPerformance && teamPerformance.length > 0) {
      teamPerformance.forEach(member => {
        teamData.push([
          member.name || member.userName || 'Unknown',
          member.completed || 0,
          member.inProgress || 0,
          member.avgCompletionTime || 'N/A',
          member.performanceScore || 0
        ]);
      });
    }

    const teamSheet = XLSX.utils.aoa_to_sheet(teamData);
    XLSX.utils.book_append_sheet(workbook, teamSheet, 'Team Performance');

    // Generate Excel file
    XLSX.writeFile(workbook, fileName);

    toast({
      title: 'Export successful',
      message: `Reports exported as ${fileName}`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    toast({
      title: 'Export failed',
      message: 'Failed to generate Excel file',
      type: 'error'
    });
  }
};

/**
 * Export analytics data as PDF (Simple approach)
 */
export const exportAsPDF = async (analyticsData, teamPerformance, fileName = 'task-reports.pdf') => {
  try {
    // Load html2pdf library
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    
    if (!window.html2pdf) {
      throw new Error('html2pdf library failed to load');
    }

    generatePDFSimple(analyticsData, teamPerformance, fileName);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    // Fallback to CSV if PDF export fails
    toast({
      title: 'PDF export not available',
      message: 'Exporting as CSV instead',
      type: 'warning'
    });
    exportAsCSV(analyticsData, teamPerformance, fileName.replace('.pdf', '.csv'));
  }
};

/**
 * Export daily employee tasks as a structured PDF with all task details and analytics matrix.
 */
export const exportDailyTasksAsPDF = async (groups, dailyAnalytics, dateLabel, fileName = 'daily-tasks-report.pdf') => {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    if (!window.html2pdf) throw new Error('html2pdf library failed to load');

    const formatSec = (s) => {
      if (!s || s <= 0) return '0m';
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const statusBadge = (status) => {
      const map = {
        completed: 'background:#d1fae5;color:#065f46;',
        'in-progress': 'background:#dbeafe;color:#1e40af;',
        pending: 'background:#fef3c7;color:#92400e;',
        overdue: 'background:#fee2e2;color:#991b1b;',
        'on-hold': 'background:#fde68a;color:#78350f;',
        paused: 'background:#ede9fe;color:#5b21b6;',
      };
      const style = map[status] || 'background:#f1f5f9;color:#475569;';
      return `<span style="${style}padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">${(status || 'unknown').replace('-', ' ').toUpperCase()}</span>`;
    };

    const tasksHTML = groups.map(g => {
      const taskRows = g.tasks.map((t, i) => {
        const assignedBy = t.assignedBy
          ? (typeof t.assignedBy === 'string' ? t.assignedBy : (t.assignedBy.name || t.assignedBy.userName || 'System'))
          : 'System';
        const assignedTo = Array.isArray(t.assignedTo)
          ? t.assignedTo.map(a => a.name || a.userName || 'Unknown').join(', ')
          : 'Unassigned';
        const estMin = Number.isFinite(Number(t.estimatedTotalMinutes)) && Number(t.estimatedTotalMinutes) >= 0
          ? Math.round(Number(t.estimatedTotalMinutes))
          : Math.round((Number(t.estimatedHours || 0)) * 60 + (Number(t.estimatedMinutes || 0)));
        const estSec = estMin * 60;
        const workedSec = calcActiveSeconds(t);
        const exceeded = estSec > 0 && workedSec > estSec;
        const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `
          <tr style="background:${bg};">
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">${t.title || '—'}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${statusBadge(t.status)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px;">${assignedBy}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-size:12px;">${assignedTo}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${formatSec(estSec)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:${exceeded ? '#dc2626' : '#16a34a'};font-weight:700;">${formatSec(workedSec)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;">${exceeded ? '<span style="color:#dc2626;font-weight:700;">⚠ EXCEEDED</span>' : '<span style="color:#16a34a;">✓ OK</span>'}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#64748b;">${t.description ? t.description.slice(0, 80) + (t.description.length > 80 ? '…' : '') : '—'}</td>
          </tr>`;
      }).join('');

      return `
        <div style="margin-bottom:24px;page-break-inside:avoid;">
          <div style="background:#1e293b;color:#fff;padding:10px 14px;border-radius:6px 6px 0 0;font-weight:700;font-size:14px;">
            👤 ${g.name} &nbsp;<span style="font-weight:400;font-size:12px;opacity:0.8;">(${g.tasks.length} task${g.tasks.length !== 1 ? 's' : ''})</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Task Title</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Status</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Assigned By</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Assigned To</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Estimated</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Worked</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Time Status</th>
                <th style="padding:8px;border:1px solid #e2e8f0;">Description</th>
              </tr>
            </thead>
            <tbody>${taskRows || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#94a3b8;">No tasks</td></tr>'}</tbody>
          </table>
        </div>`;
    }).join('');

    const matrixRows = groups.map((g, i) => {
      const ts = g.tasks;
      const completed = ts.filter(t => t.status === 'completed').length;
      const inProg = ts.filter(t => ['in-progress', 'due-soon', 'extended'].includes(t.status)).length;
      const paused = ts.filter(t => t.isPaused || t.status === 'paused' || t.status === 'on-hold').length;
      const overdue = ts.filter(t => t.status === 'overdue').length;
      const rate = ts.length > 0 ? Math.round((completed / ts.length) * 100) : 0;
      const totalWorked = ts.reduce((sum, t) => sum + calcActiveSeconds(t), 0);
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `<tr style="background:${bg};"><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;">${g.name}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${ts.length}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:#16a34a;font-weight:700;">${completed}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:#2563eb;">${inProg}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:#d97706;">${paused}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;color:#dc2626;">${overdue}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${formatSec(totalWorked)}</td><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;"><div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%;"><div style="background:${rate >= 80 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'};height:8px;border-radius:4px;width:${rate}%;"></div></div><span style="font-size:11px;font-weight:700;">${rate}%</span></td></tr>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;padding:24px;color:#1e293b;">
        <div style="border-bottom:3px solid #1e293b;padding-bottom:12px;margin-bottom:20px;">
          <h1 style="margin:0;font-size:22px;">📋 Daily Task Report</h1>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Period: ${dateLabel} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        </div>

        <h2 style="font-size:16px;margin-bottom:10px;">📊 Summary Matrix</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:28px;">
          <thead><tr style="background:#1e293b;color:#fff;">
            <th style="padding:8px;border:1px solid #334155;text-align:left;">Employee</th>
            <th style="padding:8px;border:1px solid #334155;">Total</th>
            <th style="padding:8px;border:1px solid #334155;">Completed</th>
            <th style="padding:8px;border:1px solid #334155;">In Progress</th>
            <th style="padding:8px;border:1px solid #334155;">Paused</th>
            <th style="padding:8px;border:1px solid #334155;">Overdue</th>
            <th style="padding:8px;border:1px solid #334155;">Total Worked</th>
            <th style="padding:8px;border:1px solid #334155;">Completion Rate</th>
          </tr></thead>
          <tbody>${matrixRows || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#94a3b8;">No data</td></tr>'}</tbody>
        </table>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:28px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
          <div><div style="font-size:11px;color:#64748b;">Total Tasks</div><div style="font-size:20px;font-weight:700;">${dailyAnalytics.totalTasks}</div></div>
          <div><div style="font-size:11px;color:#64748b;">Completed</div><div style="font-size:20px;font-weight:700;color:#16a34a;">${dailyAnalytics.completed}</div></div>
          <div><div style="font-size:11px;color:#64748b;">Completion Rate</div><div style="font-size:20px;font-weight:700;color:#2563eb;">${dailyAnalytics.completionRate}%</div></div>
          <div><div style="font-size:11px;color:#64748b;">On-Time Rate</div><div style="font-size:20px;font-weight:700;color:#7c3aed;">${dailyAnalytics.onTimeRate}%</div></div>
        </div>

        <h2 style="font-size:16px;margin-bottom:16px;">📝 Task Details by Employee</h2>
        ${tasksHTML || '<p style="color:#94a3b8;">No tasks found.</p>'}
      </div>`;

    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = 'position:absolute;left:-9999px;top:0;width:1100px;';
    document.body.appendChild(el);

    await window.html2pdf().set({
      margin: 8,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true, width: 1100 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    }).from(el).save();

    document.body.removeChild(el);
    toast({ title: 'PDF exported', message: fileName, type: 'success' });
  } catch (error) {
    console.error('Error exporting daily tasks PDF:', error);
    toast({ title: 'PDF export failed', message: error?.message || 'Failed to export PDF', type: 'error' });
  }
};

/**
 * Export an existing DOM element as PDF (full page/section export).
 */
export const exportElementAsPDF = async (element, fileName = 'task-reports.pdf') => {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    if (!window.html2pdf) throw new Error('html2pdf library failed to load');
    if (!element) throw new Error('Export element not found');

    const options = {
      margin: 8,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    await window.html2pdf().set(options).from(element).save();

    toast({
      title: 'Export successful',
      message: `Reports exported as ${fileName}`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error exporting PDF element:', error);
    toast({
      title: 'PDF export failed',
      message: error?.message || 'Failed to export PDF',
      type: 'error'
    });
  }
};

const generatePDFSimple = (analyticsData, teamPerformance, fileName) => {
  try {
    // Create HTML content for PDF
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h1 style="color: #1f2937; margin-bottom: 10px;">Task Reports & Analytics</h1>
        <p style="color: #666; margin-bottom: 20px;">Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })} ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
        
        <h2 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">📊 Analytics Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Metric</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Value</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Task Completion Rate</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${analyticsData?.completionRate || 0}%</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Tasks</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${analyticsData?.totalTasks || 0}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Completed Tasks</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${analyticsData?.completedTasks || 0}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb;">In Progress Tasks</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${analyticsData?.inProgressTasks || 0}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">On Hold Tasks</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${analyticsData?.onHoldTasks || 0}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 10px; border: 1px solid #e5e7eb;">Overdue Tasks</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${analyticsData?.overdueTasks || 0}</td>
          </tr>
        </table>

        <h2 style="color: #1f2937; margin-top: 30px; margin-bottom: 15px;">👥 Team Performance Metrics</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f3f4f6;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Team Member</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Completed</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">In Progress</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Avg Time (hrs)</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Performance</td>
          </tr>
          ${
            teamPerformance && teamPerformance.length > 0
              ? teamPerformance
                  .map(
                    (member, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? 'white' : '#f9fafb'};">
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${member.name || member.userName || 'Unknown'}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${member.completed || 0}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${member.inProgress || 0}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${member.avgCompletionTime || 'N/A'}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${member.performanceScore || 0}%</td>
            </tr>
          `
                  )
                  .join('')
              : '<tr><td colspan="5" style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #999;">No team performance data available</td></tr>'
          }
        </table>
      </div>
    `;

    // Create container element
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.display = 'none';
    document.body.appendChild(element);

    // Generate PDF using html2pdf
    const options = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    window.html2pdf().set(options).from(element).save();

    // Cleanup
    document.body.removeChild(element);

    toast({
      title: 'Export successful',
      message: `Reports exported as ${fileName}`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast({
      title: 'PDF generation failed',
      message: 'Please use CSV export instead',
      type: 'error'
    });
  }
};
