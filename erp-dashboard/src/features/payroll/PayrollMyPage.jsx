import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { Link } from "react-router-dom";
import { DollarSign, TrendingUp, Calendar, Shield, Download, FileText, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── PDF Generation ────────────────────────────────────────────────────────
function generatePayslipPDF(payrollItems, user) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const BRAND = [19, 115, 51];   // #137333 green
  const DARK  = [10,  25, 49];   // #0A1931 navy
  const GRAY  = [112, 117, 122]; // #70757A

  const formatMonth = (m) => {
    if (!m) return "—";
    const [y, mo] = m.split("-");
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[parseInt(mo, 10) - 1] || mo} ${y}`;
  };

  payrollItems.forEach((item, idx) => {
    if (idx > 0) doc.addPage();

    const W = doc.internal.pageSize.getWidth();
    let y = 0;

    // ── Green header bar ────────────────────────────────────────────────
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, W, 28, "F");
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("SALARY PAYSLIP", W / 2, 13, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(formatMonth(item.month), W / 2, 22, { align: "center" });
    y = 36;

    // ── Employee info block ──────────────────────────────────────────────
    doc.setFillColor(240, 248, 244);
    doc.roundedRect(14, y, W - 28, 28, 3, 3, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text("Employee Details", 20, y + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    const name  = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || "—";
    const email = user?.email || "—";
    const role  = user?.role  || "—";
    doc.text(`Name:  ${name}`,  20, y + 16);
    doc.text(`Email: ${email}`, 20, y + 22);
    doc.text(`Role:  ${role}`,  W / 2 + 4, y + 16);
    doc.text(`Period: ${formatMonth(item.month)}`, W / 2 + 4, y + 22);
    y += 36;

    // ── Earnings table ───────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND);
    doc.text("EARNINGS", 14, y + 4);
    y += 7;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Component", "Amount (₹)"]],
      body: [
        ["Basic Salary",  `₹${(item.basicSalary  || 0).toLocaleString()}`],
        ["Allowances",    `₹${(item.allowances    || 0).toLocaleString()}`],
        ["Bonus",         `₹${(item.bonus         || 0).toLocaleString()}`],
        ["Overtime Pay",  `₹${(item.overtimePay   || 0).toLocaleString()}`],
      ],
      headStyles: { fillColor: BRAND, textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { textColor: DARK, fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 248, 244] },
      columnStyles: { 1: { halign: "right" } },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 6;

    // ── Deductions table ─────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor([200, 50, 50]);
    doc.text("DEDUCTIONS", 14, y + 4);
    y += 7;

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Component", "Amount (₹)"]],
      body: [
        ["Tax (TDS)",   `₹${(item.tax        || 0).toLocaleString()}`],
        ["Deductions",  `₹${(item.deductions || 0).toLocaleString()}`],
      ],
      headStyles: { fillColor: [200, 50, 50], textColor: [255,255,255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { textColor: DARK, fontSize: 9 },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      columnStyles: { 1: { halign: "right" } },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 6;

    // ── Net salary highlight ─────────────────────────────────────────────
    const gross = (item.basicSalary || 0) + (item.allowances || 0) + (item.bonus || 0) + (item.overtimePay || 0);
    const totalDed = (item.tax || 0) + (item.deductions || 0);
    doc.setFillColor(...BRAND);
    doc.roundedRect(14, y, W - 28, 22, 3, 3, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text(`Gross Pay:  ₹${gross.toLocaleString()}`, 20, y + 8);
    doc.text(`Total Deductions:  ₹${totalDed.toLocaleString()}`, 20, y + 15);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`NET SALARY:  ₹${(item.netSalary || 0).toLocaleString()}`, W - 20, y + 13, { align: "right" });
    y += 30;

    // ── Payment info ─────────────────────────────────────────────────────
    const statusColors = { PAID: [19,115,51], PENDING: [180,130,0], CANCELLED: [200,50,50] };
    const sc = statusColors[item.paymentStatus] || GRAY;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Payment Method: ${item.paymentMethod || "—"}`, 14, y);
    doc.text(`Payment Date: ${item.paymentDate ? new Date(item.paymentDate).toLocaleDateString("en-IN") : "—"}`, 14, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...sc);
    doc.text(`Status: ${item.paymentStatus || "PENDING"}`, W - 14, y, { align: "right" });
    y += 14;

    if (item.notes) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...GRAY);
      doc.text(`Notes: ${item.notes}`, 14, y);
      y += 7;
    }

    // ── Footer ───────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")}  |  This is a system-generated payslip.`, W / 2, 287, { align: "center" });
  });

  // File name
  const name = [user?.firstName, user?.lastName].filter(Boolean).join("_") || user?.name || "payslip";
  const suffix = payrollItems.length === 1
    ? payrollItems[0].month
    : `${payrollItems[0].month}_to_${payrollItems[payrollItems.length - 1].month}`;
  doc.save(`payslip_${name}_${suffix}.pdf`);
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PayrollMyPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isHR = user?.role === ROLES.HR;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payroll/my");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading payroll:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Calculate total salary
  const totalSalary = Array.isArray(items) ? items.reduce((sum, item) => sum + (item.netSalary || 0), 0) : 0;

  // For Admin: Show different message and button
  if (isAdmin) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageTitle
          title="Payroll Management"
          subtitle="Admin has full access."
          actions={
            <Link to="/payroll/manage">
              <Button variant="secondary" className="bg-white hover:bg-[#F6FAFD] text-[#0A1931] border border-[#B3CFE5] shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                Manage HR Payroll
              </Button>
            </Link>
          }
        />

        <Card className="p-8 bg-gradient-to-br from-[#E6F4EA] to-[#F1F8F6] border-l-4 border-l-[#137333] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-[#137333] flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-[#137333]">Company Owner</h3>
              <p className="text-sm text-[#70757A] mt-2">
                As the company owner, you don't have payroll records. Use the <strong>Manage HR Payroll</strong> button to manage salary for your HR staff members.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // For HR and Employees: Show their payroll
  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="Payroll"
        subtitle={isHR ? "Review your salary and manage employee payroll." : "Review your salary breakdowns, earnings, and deductions. Complete earnings history below."}
        actions={
          isHR ? (
            <Link to="/payroll/manage">
              <Button variant="secondary" className="bg-white hover:bg-[#F6FAFD] text-[#0A1931] border border-[#B3CFE5] shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                Manage Employee Payroll
              </Button>
            </Link>
          ) : null
        }
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 border-l-4 border-l-[#137333] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] tracking-wide uppercase">Total YTD Earnings</p>
              <p className="text-4xl font-bold text-[#137333] mt-2">₹{totalSalary.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-[#E6F4EA] rounded-lg">
              <DollarSign className="w-6 h-6 text-[#137333]" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#4A7FA7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] tracking-wide uppercase">Payslips Generated</p>
              <p className="text-4xl font-bold text-[#4A7FA7] mt-2">{items.length}</p>
            </div>
            <div className="p-3 bg-[#B3CFE5]/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-[#4A7FA7]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Salary History Table */}
      <Card className="p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        {/* Table header with bulk download */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Salary Breakdown</h3>

          {/* Bulk download dropdown */}
          {items.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setBulkOpen((p) => !p)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#137333] text-white rounded-lg hover:bg-[#0f5929] transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Download Payslips
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${bulkOpen ? "rotate-180" : ""}`} />
              </button>
              {bulkOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#B3CFE5] rounded-xl shadow-xl z-20 overflow-hidden">
                  <p className="px-4 py-2 text-xs font-semibold text-[#70757A] uppercase tracking-wider border-b border-[#E8F4FD]">Select Range</p>
                  {[
                    { label: "Last 1 Month",  count: 1 },
                    { label: "Last 3 Months", count: 3 },
                    { label: "Last 5 Months", count: 5 },
                    { label: "All Months",    count: null },
                  ].map(({ label, count }) => {
                    const slice = count ? [...items].slice(0, count) : [...items];
                    const disabled = slice.length === 0;
                    return (
                      <button
                        key={label}
                        disabled={disabled}
                        onClick={() => { generatePayslipPDF(slice, user); setBulkOpen(false); }}
                        className="w-full px-4 py-3 text-sm text-left hover:bg-[#E6F4EA] text-[#0A1931] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5 text-[#137333]" />
                        {label}
                        <span className="ml-auto text-xs text-[#70757A]">{slice.length} slip{slice.length !== 1 ? "s" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close dropdown on outside click */}
        {bulkOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setBulkOpen(false)} />
        )}

        <div className="border border-[var(--border-soft)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--eucalyptus)]">
                <th className="px-6 py-4 font-semibold text-left text-white">Month</th>
                <th className="px-6 py-4 font-semibold text-left text-white">Amount</th>
                <th className="px-6 py-4 font-semibold text-left text-white">Status</th>
                <th className="px-6 py-4 font-semibold text-left text-white">Notes</th>
                <th className="px-6 py-4 font-semibold text-center text-white">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[var(--text-muted)]">Loading payroll data...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[var(--text-muted)]">No payroll records found</td>
                </tr>
              ) : Array.isArray(items) && items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item._id} className={`border-t border-[var(--border-soft)] hover:bg-[var(--pistachio)] transition-colors ${idx % 2 === 0 ? 'bg-[var(--bone-white)]' : 'bg-[var(--ivory)]'}`}>
                    <td className="px-6 py-4 font-medium text-[var(--text-main)]">{item.month}</td>
                    <td className="px-6 py-4 font-semibold text-[var(--clay)]">₹{item.netSalary?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4">
                      <Badge className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
                        item.paymentStatus === 'PAID' 
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : item.paymentStatus === 'PENDING'
                          ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                          : 'bg-[var(--pistachio)] border-[var(--eucalyptus)] text-[var(--text-main)]'
                      }`}>
                        {item.paymentStatus || 'PENDING'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{item.notes || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => generatePayslipPDF([item], user)}
                        title={`Download payslip for ${item.month}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#137333] border border-[#137333] rounded-lg hover:bg-[#E6F4EA] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[var(--text-muted)]">No payroll records available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}