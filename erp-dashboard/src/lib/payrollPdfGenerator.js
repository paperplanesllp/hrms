/**
 * Payroll PDF Generator Utility
 * Generates professional salary slips using jsPDF
 * 
 * Prerequisites: npm install jspdf jspdf-autotable
 */

import jsPDFModule from "jspdf";
import "jspdf-autotable";

const { jsPDF } = jsPDFModule;

const generatePayslipPDF = (payroll, companyName = "ERP HRMS System") => {
  // jsPDF and autoTable are now available globally after import
  try {
    if (!window.jsPDF) {
      throw new Error("jsPDF not loaded");
    }
  } catch (e) {
    console.error("jsPDF not installed. Run: npm install jspdf jspdf-autotable");
    throw new Error("PDF generation library not installed");
  }

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Set default font
  doc.setFont("Helvetica");

  // ============ HEADER SECTION ============
  // Company Logo/Name area
  doc.setFillColor(19, 115, 51); // Dark green from your design system
  doc.rect(0, 0, pageWidth, 25, "F");

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("Helvetica", "bold");
  doc.text(companyName, pageWidth / 2, 12, { align: "center" });

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text("Monthly Salary Slip", pageWidth / 2, 20, { align: "center" });

  yPosition = 35;

  // ============ EMPLOYEE DETAILS SECTION ============
  doc.setTextColor(10, 25, 49);
  doc.setFillColor(240, 248, 253);
  doc.rect(12, yPosition - 5, pageWidth - 24, 30, "F");

  doc.setFontSize(11);
  doc.setFont("Helvetica", "bold");
  doc.text("Employee Information", 15, yPosition);

  doc.setFontSize(9);
  doc.setFont("Helvetica", "normal");

  const leftColumn = 15;
  const rightColumn = pageWidth / 2 + 5;
  yPosition += 8;

  // Left column info
  doc.text(`Employee Name: ${payroll.userId?.name || "---"}`, leftColumn, yPosition);
  doc.text(`Employee ID: ${payroll.userId?.employeeId || "---"}`, leftColumn, yPosition + 6);
  doc.text(`Department: ${payroll.userId?.department || "---"}`, leftColumn, yPosition + 12);

  // Right column info
  doc.text(`Designation: ${payroll.userId?.designation || "---"}`, rightColumn, yPosition);
  doc.text(`Payroll Month: ${payroll.month || "---"}`, rightColumn, yPosition + 6);
  doc.text(`Payroll Year: ${payroll.year || "---"}`, rightColumn, yPosition + 12);

  yPosition += 30;

  // ============ SALARY BREAKDOWN SECTION ============
  doc.setFontSize(11);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(19, 115, 51);
  doc.text("Salary Breakdown", 15, yPosition);

  yPosition += 8;

  // Earnings table
  const earningsData = [
    ["Earnings", "Amount (₹)"],
    ["Basic Salary", formatCurrency(payroll.basicSalary || 0)],
    ["Allowances", formatCurrency(payroll.allowances || 0)],
    ["Bonus", formatCurrency(payroll.bonus || 0)],
    ["Overtime Pay", formatCurrency(payroll.overtimePay || 0)],
  ];

  doc.autoTable({
    startY: yPosition,
    margin: { left: 15, right: 15 },
    head: earningsData.slice(0, 1),
    body: earningsData.slice(1),
    theme: "plain",
    headStyles: {
      fillColor: [19, 115, 51],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      padding: 5,
      halign: "left"
    },
    bodyStyles: {
      fillColor: [246, 250, 253],
      textColor: [10, 25, 49],
      fontSize: 9,
      padding: 4,
      halign: "right"
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      0: { halign: "left", cellWidth: pageWidth - 60 },
      1: { halign: "right", cellWidth: 45 }
    }
  });

  yPosition = doc.lastAutoTable.finalY + 8;

  // Total Earnings
  doc.setFont("Helvetica", "bold");
  doc.setFillColor(230, 244, 234);
  const totalEarnings = (payroll.basicSalary || 0) + 
                        (payroll.allowances || 0) + 
                        (payroll.bonus || 0) + 
                        (payroll.overtimePay || 0);
  doc.rect(15, yPosition - 2, pageWidth - 30, 7, "F");
  doc.text("Total Earnings", 15, yPosition + 2);
  doc.text(formatCurrency(totalEarnings), pageWidth - 20, yPosition + 2, { align: "right" });

  yPosition += 12;

  // Deductions table
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(19, 115, 51);
  doc.text("Deductions", 15, yPosition);

  yPosition += 6;

  const deductionsData = [
    ["Deductions", "Amount (₹)"],
    ["Deductions (PF, Insurance, etc.)", formatCurrency(payroll.deductions || 0)],
    ["Tax (TDS / Income Tax)", formatCurrency(payroll.tax || 0)],
  ];

  doc.autoTable({
    startY: yPosition,
    margin: { left: 15, right: 15 },
    head: deductionsData.slice(0, 1),
    body: deductionsData.slice(1),
    theme: "plain",
    headStyles: {
      fillColor: [242, 113, 28], // Orange from your palette
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      padding: 5,
      halign: "left"
    },
    bodyStyles: {
      fillColor: [255, 250, 245],
      textColor: [10, 25, 49],
      fontSize: 9,
      padding: 4,
      halign: "right"
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      0: { halign: "left", cellWidth: pageWidth - 60 },
      1: { halign: "right", cellWidth: 45 }
    }
  });

  yPosition = doc.lastAutoTable.finalY + 8;

  // Total Deductions
  const totalDeductions = (payroll.deductions || 0) + (payroll.tax || 0);
  doc.setFillColor(255, 240, 230);
  doc.rect(15, yPosition - 2, pageWidth - 30, 7, "F");
  doc.setFont("Helvetica", "bold");
  doc.text("Total Deductions", 15, yPosition + 2);
  doc.text(formatCurrency(totalDeductions), pageWidth - 20, yPosition + 2, { align: "right" });

  yPosition += 12;

  // ============ NET SALARY SECTION ============
  doc.setFillColor(19, 115, 51);
  doc.rect(15, yPosition - 5, pageWidth - 30, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("Helvetica", "bold");
  doc.text("NET SALARY (In Words: " + convertToWords(Math.round(payroll.netSalary || 0)) + ")", 15, yPosition + 2);
  doc.setFontSize(14);
  doc.text(formatCurrency(payroll.netSalary || 0), pageWidth - 20, yPosition + 4, { align: "right" });

  yPosition += 20;

  // ============ PAYMENT DETAILS SECTION ============
  doc.setTextColor(10, 25, 49);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "bold");
  doc.text("Payment Details", 15, yPosition);

  doc.setFontSize(9);
  doc.setFont("Helvetica", "normal");
  yPosition += 7;

  doc.text(`Payment Method: ${payroll.paymentMethod || "---"}`, 15, yPosition);
  if (payroll.customPaymentMethod) {
    doc.text(`Custom Method: ${payroll.customPaymentMethod}`, 15, yPosition + 6);
    yPosition += 6;
  }
  
  const paymentStatus = payroll.paymentStatus || "PENDING";
  const statusColor = paymentStatus === "PAID" ? [19, 115, 51] : [242, 113, 28];
  doc.setTextColor(...statusColor);
  doc.setFont("Helvetica", "bold");
  doc.text(`Payment Status: ${paymentStatus}`, 15, yPosition + 6);
  
  doc.setTextColor(10, 25, 49);
  doc.setFont("Helvetica", "normal");
  if (payroll.paymentDate) {
    const paymentDate = new Date(payroll.paymentDate).toLocaleDateString("en-IN");
    doc.text(`Payment Date: ${paymentDate}`, 15, yPosition + 12);
  }

  yPosition += 20;

  // ============ NOTES SECTION ============
  if (payroll.notes) {
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(10, 25, 49);
    doc.text("Notes:", 15, yPosition);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    const notesWrapped = doc.splitTextToSize(payroll.notes, pageWidth - 30);
    doc.text(notesWrapped, 15, yPosition + 5);
  }

  // ============ FOOTER SECTION ============
  const finally_y = pageHeight - 25;

  doc.setDrawColor(19, 115, 51);
  doc.setLineWidth(0.5);
  doc.line(15, finally_y, pageWidth - 15, finally_y);

  doc.setFontSize(8);
  doc.setTextColor(112, 117, 122);
  doc.setFont("Helvetica", "normal");
  doc.text("Authorized Signature", 15, finally_y + 8);
  doc.text("______________________", 15, finally_y + 12);

  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, pageWidth / 2, finally_y + 8, { align: "center" });
  doc.text("This is a computer-generated document. No signature is required.", pageWidth - 15, finally_y + 8, { align: "right" });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("© 2026 ERP HRMS System. All rights reserved.", pageWidth / 2, pageHeight - 5, { align: "center" });

  // Save the PDF
  const fileName = `Payslip_${payroll.userId?.name || "Employee"}_${payroll.month}.pdf`;
  doc.save(fileName);
};

// Generate monthly payroll report (all employees)
const generateMonthlyPayrollReportPDF = (payrolls, month, year, companyName = "ERP HRMS System") => {
  try {
    if (!window.jsPDF) {
      throw new Error("jsPDF not loaded");
    }
  } catch (e) {
    console.error("jsPDF not installed. Run: npm install jspdf jspdf-autotable");
    throw new Error("PDF generation library not installed");
  }

  const doc = new jsPDF("l", "mm", "a4"); // Landscape orientation
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(19, 115, 51);
  doc.rect(0, 0, pageWidth, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("Helvetica", "bold");
  doc.text(`${companyName} - Monthly Payroll Report`, pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.text(`Month: ${month} | Year: ${year}`, pageWidth / 2, 18, { align: "center" });

  // Prepare table data
  const tableData = payrolls.map(p => [
    p.userId?.name || "---",
    p.userId?.employeeId || "---",
    p.userId?.department || "---",
    formatCurrency(p.basicSalary || 0),
    formatCurrency((p.allowances || 0) + (p.bonus || 0) + (p.overtimePay || 0)),
    formatCurrency((p.deductions || 0) + (p.tax || 0)),
    formatCurrency(p.netSalary || 0),
    p.paymentMethod || "---",
    p.paymentStatus || "PENDING"
  ]);

  // Generate table
  doc.autoTable({
    startY: 25,
    margin: { left: 10, right: 10 },
    head: [[
      "Employee",
      "ID",
      "Department",
      "Basic",
      "Additions",
      "Deductions",
      "Net Salary",
      "Payment Method",
      "Status"
    ]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [19, 115, 51],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      padding: 3
    },
    bodyStyles: {
      textColor: [10, 25, 49],
      fontSize: 8,
      padding: 2
    },
    alternateRowStyles: {
      fillColor: [246, 250, 253]
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 18 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 20, halign: "right" },
      7: { cellWidth: 25 },
      8: { cellWidth: 15 }
    }
  });

  // Summary
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalBasic = payrolls.reduce((sum, p) => sum + (p.basicSalary || 0), 0);
  const totalAdditions = payrolls.reduce((sum, p) => sum + (p.allowances || 0) + (p.bonus || 0) + (p.overtimePay || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.deductions || 0) + (p.tax || 0), 0);
  const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  doc.setFont("Helvetica", "bold");
  doc.setFillColor(230, 244, 234);
  doc.rect(10, finalY, pageWidth - 20, 8, "F");
  doc.text("TOTAL", 15, finalY + 5);
  doc.text(formatCurrency(totalBasic), 95, finalY + 5, { align: "right" });
  doc.text(formatCurrency(totalAdditions), 115, finalY + 5, { align: "right" });
  doc.text(formatCurrency(totalDeductions), 135, finalY + 5, { align: "right" });
  doc.text(formatCurrency(totalNetSalary), 155, finalY + 5, { align: "right" });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(112, 117, 122);
  doc.setFont("Helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 10, pageHeight - 10);
  doc.text(`Total Employees: ${payrolls.length}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.text("© 2026 ERP HRMS System. All rights reserved.", pageWidth - 10, pageHeight - 10, { align: "right" });

  const fileName = `PayrollReport_${month}_${year}.pdf`;
  doc.save(fileName);
};

// ============ HELPER FUNCTIONS ============

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function convertToWords(num) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

  if (num === 0) return "Zero";

  function toWordsSmall(n) {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + toWordsSmall(n % 100) : "");
    if (n < 100000) return toWordsSmall(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + toWordsSmall(n % 1000) : "");
    if (n < 10000000) return toWordsSmall(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + toWordsSmall(n % 100000) : "");
    return toWordsSmall(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + toWordsSmall(n % 10000000) : "");
  }

  return toWordsSmall(num) + " Rupees Only";
}

export { generatePayslipPDF, generateMonthlyPayrollReportPDF, formatCurrency, convertToWords };
