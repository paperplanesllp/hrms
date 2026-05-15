import puppeteer from "puppeteer";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { renderTaskAnalyticsPdfHtml } from "./taskAnalyticsPdf.template.js";
import {
  formatDate,
  formatDateTime,
  formatHours,
  formatPercent,
} from "./taskAnalyticsPdf.utils.js";

function getLaunchOptions() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return {
    headless: "new",
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=medium",
    ],
  };
}

export async function generateTaskAnalyticsPdfBuffer(reportData) {
  let browser;

  try {
    const html = renderTaskAnalyticsPdfHtml(reportData);
    browser = await puppeteer.launch(getLaunchOptions());
    const page = await browser.newPage();

    await page.setViewport({
      width: 1440,
      height: 1024,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, {
      waitUntil: ["load", "domcontentloaded", "networkidle0"],
      timeout: 60000,
    });
    await page.emulateMediaType("print");

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "16mm",
        left: "10mm",
      },
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%;font-family:Arial,sans-serif;font-size:9px;color:#64748b;padding:0 12mm;display:flex;justify-content:space-between;">
          <span>TheHRSaathi Employee Task Performance</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      timeout: 60000,
    });

    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } catch (error) {
    console.error("[TaskAnalyticsPDF] Puppeteer render failed, using fallback renderer", {
      message: error?.message,
    });
    return generateFallbackTaskAnalyticsPdfBuffer(reportData);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function drawFooter(doc) {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("TheHRSaathi Task Analytics", 32, height - 18);
    doc.text(`Page ${page} of ${pageCount}`, width - 32, height - 18, { align: "right" });
  }
}

function metricBox(doc, x, y, width, label, value, color) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, 54, 6, 6, "FD");
  doc.setFillColor(...color);
  doc.roundedRect(x, y, width, 5, 6, 6, "F");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + 10, y + 22);
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(String(value), x + 10, y + 42);
}

function generateFallbackTaskAnalyticsPdfBuffer(reportData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 98, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(reportData.brand.productName || "TheHRSaathi", 32, 30);
  doc.setFontSize(24);
  doc.text(reportData.reportTitle || "Task Analytics Report", 32, 62);
  doc.setFontSize(10);
  doc.text(`Company: ${reportData.brand.companyName || "TheHRSaathi"}`, 32, 82);
  doc.text(`Period: ${reportData.period?.label || ""}`, pageWidth - 32, 48, { align: "right" });
  doc.text(`Generated: ${formatDateTime(reportData.generatedAt)}`, pageWidth - 32, 68, { align: "right" });

  const metrics = [
    ["Total Tasks", reportData.summary.totalTasks, [37, 99, 235]],
    ["Completed", reportData.summary.completedTasks, [16, 185, 129]],
    ["Pending", reportData.summary.pendingTasks, [245, 158, 11]],
    ["Overdue", reportData.summary.overdueTasks, [239, 68, 68]],
    ["Worked Hours", formatHours(reportData.summary.workedHours), [37, 99, 235]],
    ["Productivity", formatPercent(reportData.summary.productivity), [16, 185, 129]],
  ];

  const metricWidth = (pageWidth - 64 - 5 * 10) / 6;
  metrics.forEach(([label, value, color], index) => {
    metricBox(doc, 32 + index * (metricWidth + 10), 120, metricWidth, label, value, color);
  });

  autoTable(doc, {
    startY: 198,
    head: [[
      "Employee Name",
      "Department",
      "Total Tasks",
      "Completed",
      "Pending",
      "Overdue",
      "Worked Hours",
      "Productivity %",
    ]],
    body: (reportData.employees || []).map((employee) => [
      employee.employeeName,
      employee.department,
      employee.totalTasks,
      employee.completed,
      employee.pending,
      employee.overdue,
      formatHours(employee.workedHours),
      formatPercent(employee.productivity),
    ]),
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated by ${reportData.generatedBy || "System"}`, 32, 184);
    },
    theme: "grid",
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 32, right: 32 },
    styles: { cellPadding: 5, overflow: "linebreak" },
  });

  const finalY = doc.lastAutoTable?.finalY || 220;
  if (finalY < 470) {
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("AI Insights", 32, finalY + 30);
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    (reportData.insights || []).slice(0, 5).forEach((insight, index) => {
      doc.text(`${index + 1}. ${insight}`, 32, finalY + 50 + index * 16, {
        maxWidth: pageWidth - 64,
      });
    });
  }

  if (reportData.departments?.length) {
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("Department Analytics", 32, 42);
    autoTable(doc, {
      startY: 60,
      head: [["Department", "Total", "Completed", "Pending", "Overdue", "Worked Hours", "Productivity"]],
      body: reportData.departments.map((department) => [
        department.department,
        department.totalTasks,
        department.completed,
        department.pending,
        department.overdue,
        formatHours(department.workedHours),
        formatPercent(department.productivity),
      ]),
      theme: "grid",
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 32, right: 32 },
    });
  }

  drawFooter(doc);
  return Buffer.from(doc.output("arraybuffer"));
}
