import { toast } from '../../../store/toastStore.js';

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
