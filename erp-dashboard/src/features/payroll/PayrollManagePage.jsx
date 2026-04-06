import React, { useEffect, useState, useCallback } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import PayrollForm from "./PayrollForm.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { 
  DollarSign, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Download, 
  Eye,
  CheckCircle,
  Calendar,
  Users,
  TrendingUp
} from "lucide-react";

export default function PayrollManagePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isHR = user?.role === ROLES.HR;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({});
  const [payrollLoadError, setPayrollLoadError] = useState("");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState(""); // PENDING, PAID, CANCELLED
  
  const [openForm, setOpenForm] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [viewingPayroll, setViewingPayroll] = useState(null);
  const [openViewModal, setOpenViewModal] = useState(false);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let payrollFetchFailed = false;
      
      // Get payroll records
      const payrollParams = new URLSearchParams();
      if (filterMonth) payrollParams.append("month", filterMonth);
      if (filterYear) payrollParams.append("year", filterYear);
      if (filterStatus) payrollParams.append("paymentStatus", filterStatus);
      
      const payrollUrl = `/payroll?${payrollParams.toString()}`;
      
      const [payrollRes, employeesRes, statsRes] = await Promise.all([
        api.get(payrollUrl).catch(err => {
          console.error("Payroll fetch error:", err);
          payrollFetchFailed = true;
          const msg = err.response?.data?.message || "Failed to load payroll records.";
          setPayrollLoadError(msg);
          if (err.response?.status === 401) {
            toast({ title: "Session expired. Please log in again.", type: "error" });
            setTimeout(() => window.location.href = "/login", 2000);
          }
          return { data: [] };
        }),
        api.get(isAdmin ? "/admin/users" : "/users").catch(err => {
          console.error("Users fetch error:", err);
          return { data: [] };
        }),
        api.get(`/payroll/stats/dashboard?year=${filterYear}${filterMonth ? `&month=${filterMonth}` : ""}`).catch(err => {
          console.error("Stats fetch error:", err);
          return { data: {} };
        })
      ]);

      if (!payrollFetchFailed) {
        setPayrollLoadError("");
      }
      
      // Filter employees based on role hierarchy
      let employeeList = employeesRes.data || [];
      
      if (isAdmin) {
        // Admin only sees HR staff
        employeeList = employeeList.filter(e => e.role === ROLES.HR);
      } else if (isHR) {
        // HR only sees regular employees (not admin, not other HR)
        employeeList = employeeList.filter(e => e.role !== ROLES.ADMIN && e.role !== ROLES.HR);
      }
      
      const payrollRows = Array.isArray(payrollRes.data)
        ? payrollRes.data
        : Array.isArray(payrollRes.data?.data)
        ? payrollRes.data.data
        : [];

      setPayrolls(payrollRows);
      setEmployees(employeeList);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error("Load data error:", err);
      const message = err.response?.status === 401
        ? "Session expired. Please log in again."
        : err.response?.status === 403
        ? "Access denied. Only Admin and HR can manage payroll."
        : "Failed to load payroll data.";
      toast({ title: message, type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterStatus, isAdmin, isHR]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle form submit (create/update)
  const handleFormSubmit = async (formData) => {
    try {
      setSubmitting(true);
      
      await api.put("/payroll", formData);
      
      toast({ 
        title: editingPayroll 
          ? "Payroll updated successfully" 
          : "Payroll created successfully", 
        type: "success" 
      });
      
      setOpenForm(false);
      setEditingPayroll(null);
      await loadData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                       err.message || 
                       "Failed to save payroll record";
      console.error("Error saving payroll:", err);
      toast({ title: errorMsg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // Mark as paid
  const handleMarkAsPaid = async (payrollId) => {
    if (!window.confirm("Mark this payroll as paid?")) return;
    
    try {
      const paymentDate = new Date().toISOString().split("T")[0];
      await api.patch(`/payroll/${payrollId}/payment-status`, {
        paymentStatus: "PAID",
        paymentDate: new Date(paymentDate)
      });
      
      toast({ title: "Marked as paid successfully", type: "success" });
      await loadData();
    } catch (err) {
      console.error("Error marking as paid:", err);
      toast({ title: "Failed to mark as paid", type: "error" });
    }
  };

  // Delete payroll
  const handleDelete = async (payrollId) => {
    if (!window.confirm("Are you sure you want to delete this payroll record? This action cannot be undone.")) return;
    
    try {
      await api.delete(`/payroll/${payrollId}`);
      toast({ title: "Payroll deleted successfully", type: "success" });
      await loadData();
    } catch (err) {
      console.error("Error deleting payroll:", err);
      toast({ title: "Failed to delete payroll", type: "error" });
    }
  };

  // Download payroll slip as PDF
  const handleDownloadPDF = async (payroll) => {
    try {
      // Dynamic import of PDF generator
      const { generatePayslipPDF } = await import("../../lib/payrollPdfGenerator.js");
      generatePayslipPDF(payroll, "ERP HRMS System");
      toast({ title: "PDF downloaded successfully", type: "success" });
    } catch (err) {
      console.error("Error generating PDF:", err);
      if (err.message.includes("jsPDF not installed")) {
        toast({ 
          title: "PDF library not installed. Run: npm install jspdf jspdf-autotable", 
          type: "error" 
        });
      } else {
        toast({ title: "Failed to generate PDF", type: "error" });
      }
    }
  };

  // Download monthly payroll report
  const handleDownloadMonthlyReport = async () => {
    if (payrolls.length === 0) {
      toast({ title: "No payroll records to export", type: "error" });
      return;
    }
    
    try {
      const { generateMonthlyPayrollReportPDF } = await import("../../lib/payrollPdfGenerator.js");
      generateMonthlyPayrollReportPDF(
        payrolls,
        filterMonth || new Date().toISOString().substring(0, 7),
        filterYear,
        "ERP HRMS System"
      );
      toast({ title: "Monthly report downloaded", type: "success" });
    } catch (err) {
      console.error("Error generating report:", err);
      toast({ title: "Failed to generate report", type: "error" });
    }
  };

  // Filter and search
  const filteredPayrolls = payrolls.filter(p => {
    const matchSearch = !searchTerm || 
      p.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.userId?.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchSearch;
  });

  // Calculate totals
  const totalNetSalary = filteredPayrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const paidCount = filteredPayrolls.filter(p => p.paymentStatus === "PAID").length;
  const pendingCount = filteredPayrolls.filter(p => p.paymentStatus === "PENDING").length;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="Payroll Management"
        subtitle={isAdmin ? "Manage HR staff payroll records." : "Manage employee payroll records."}
        actions={
          <Button 
            onClick={() => { setEditingPayroll(null); setOpenForm(true); }} 
            className="bg-[#137333] hover:bg-[#0d5628] text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            New Payroll
          </Button>
        }
      />

      {/* Summary Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Employees */}
        <Card className="p-6 border-l-4 border-l-[#137333] bg-white hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Employees</p>
              <p className="text-3xl font-bold text-[#137333] mt-2">{stats.totalEmployees || 0}</p>
            </div>
            <Users className="w-6 h-6 text-[#137333]" />
          </div>
        </Card>

        {/* Total Payroll This Month */}
        <Card className="p-6 border-l-4 border-l-[#4A7FA7] bg-white hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Payroll</p>
              <p className="text-3xl font-bold text-[#4A7FA7] mt-2">₹{(stats.totalPayroll || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-[#4A7FA7]" />
          </div>
        </Card>

        {/* Paid Employees */}
        <Card className="p-6 transition bg-white border-l-4 border-l-green-600 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Paid</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{stats.paidEmployees || 0}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </Card>

        {/* Pending Payroll */}
        <Card className="p-6 transition bg-white border-l-4 border-l-orange-500 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Pending</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">{stats.pendingPayroll || 0}</p>
            </div>
            <Calendar className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="p-5 bg-white">
        <div className="grid items-end gap-4 md:grid-cols-5">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-[#0A1931] mb-2 uppercase">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#70757A]" />
              <Input
                placeholder="Name, Email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Month Filter */}
          <div>
            <label className="block text-xs font-medium text-[#0A1931] mb-2 uppercase">Month</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#137333]"
            >
              <option value="">All Months</option>
              {months.map(m => (
                <option key={m.value} value={`${filterYear}-${m.value}`}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-xs font-medium text-[#0A1931] mb-2 uppercase">Year</label>
            <select
              value={filterYear}
              onChange={(e) => {
                const newYear = parseInt(e.target.value);
                setFilterYear(newYear);
                setFilterMonth("");
              }}
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#137333]"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-[#0A1931] mb-2 uppercase">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#137333]"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Download Report Button */}
          <Button
            onClick={handleDownloadMonthlyReport}
            disabled={payrolls.length === 0}
            className="w-full gap-2 text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </Card>

      {/* Payroll Table */}
      <Card className="p-6 overflow-x-auto bg-white">
        <h3 className="text-lg font-semibold text-[#0A1931] mb-4">Payroll Records ({filteredPayrolls.length})</h3>
        
        {loading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : filteredPayrolls.length === 0 ? (
          <div className="py-12 text-center">
            <DollarSign className="w-12 h-12 text-[#B3CFE5] mx-auto mb-3" />
            <p className="text-[#70757A] text-lg">No payroll records found</p>
            {payrollLoadError ? (
              <p className="text-red-600 text-sm mt-2">{payrollLoadError}</p>
            ) : (
              <p className="text-[#70757A] text-sm mt-2">
                {searchTerm ? "Try adjusting your search filters" : "Create your first payroll record"}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#B3CFE5]">
                  <th className="px-4 py-3 text-left font-semibold text-[#0A1931]">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0A1931]">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0A1931]">Month</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0A1931]">Basic</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0A1931]">Additions</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0A1931]">Deductions</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0A1931]">Net Salary</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0A1931]">Payment Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0A1931]">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#0A1931]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayrolls.map((payroll) => (
                  <tr key={payroll._id} className="border-b border-[#B3CFE5]/30 hover:bg-[#F6FAFD]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0A1931]">{payroll.userId?.name || "---"}</div>
                      <div className="text-xs text-[#70757A]">{payroll.userId?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[#70757A]">{payroll.userId?.employeeId || "---"}</td>
                    <td className="px-4 py-3 font-medium text-[#0A1931]">{payroll.month}</td>
                    <td className="px-4 py-3 text-right text-[#137333] font-semibold">
                      ₹{(payroll.basicSalary || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-[#0A1931]">
                      ₹{((payroll.allowances || 0) + (payroll.bonus || 0) + (payroll.overtimePay || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-[#0A1931]">
                      ₹{((payroll.deductions || 0) + (payroll.tax || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-[#137333] font-bold">
                      ₹{(payroll.netSalary || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-[#0A1931]">
                        {payroll.paymentMethod === "Other" 
                          ? payroll.customPaymentMethod 
                          : payroll.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${
                        payroll.paymentStatus === "PAID"
                          ? "bg-green-50 border-green-500 text-green-700"
                          : payroll.paymentStatus === "CANCELLED"
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "bg-orange-50 border-orange-400 text-orange-600"
                      } border px-3 py-1 text-xs font-medium`}>
                        {payroll.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <Button
                          onClick={() => { setViewingPayroll(payroll); setOpenViewModal(true); }}
                          title="View Details"
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => { setEditingPayroll(payroll); setOpenForm(true); }}
                          title="Edit"
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDownloadPDF(payroll)}
                          title="Download PDF"
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {payroll.paymentStatus !== "PAID" && (
                          <Button
                            onClick={() => handleMarkAsPaid(payroll._id)}
                            title="Mark as Paid"
                            variant="ghost"
                            size="sm"
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(payroll._id)}
                          title="Delete"
                          variant="ghost"
                          size="sm"
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer with Totals */}
            {filteredPayrolls.length > 0 && (
              <div className="border-t-2 border-[#B3CFE5] mt-4 pt-4">
                <div className="text-right space-y-2 font-semibold text-[#0A1931]">
                  <div className="flex justify-end gap-20 px-4">
                    <span>Total Payroll: ₹{totalNetSalary.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    <span className="text-green-600">Paid: {paidCount}</span>
                    <span className="text-orange-600">Pending: {pendingCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Payroll Form Modal */}
      <Modal
        open={openForm}
        onClose={() => { setOpenForm(false); setEditingPayroll(null); }}
        title={editingPayroll ? "Edit Payroll Record" : "Create New Payroll"}
        size="lg"
      >
        <PayrollForm
          initialData={editingPayroll}
          employees={employees}
          onSubmit={handleFormSubmit}
          isSubmitting={submitting}
        />
      </Modal>

      {/* View Payroll Details Modal */}
      <Modal
        open={openViewModal}
        onClose={() => { setOpenViewModal(false); setViewingPayroll(null); }}
        title="Payroll Details"
      >
        {viewingPayroll && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Employee Info */}
            <div className="bg-[#F6FAFD] p-4 rounded-lg">
              <h4 className="font-bold text-[#0A1931] mb-3">Employee Information</h4>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-[#70757A]">Name</p>
                  <p className="font-medium text-[#0A1931]">{viewingPayroll.userId?.name}</p>
                </div>
                <div>
                  <p className="text-[#70757A]">Employee ID</p>
                  <p className="font-medium text-[#0A1931]">{viewingPayroll.userId?.employeeId}</p>
                </div>
                <div>
                  <p className="text-[#70757A]">Department</p>
                  <p className="font-medium text-[#0A1931]">{viewingPayroll.userId?.department}</p>
                </div>
                <div>
                  <p className="text-[#70757A]">Designation</p>
                  <p className="font-medium text-[#0A1931]">{viewingPayroll.userId?.designation}</p>
                </div>
              </div>
            </div>

            {/* Payroll Period */}
            <div className="p-4 rounded-lg bg-orange-50">
              <h4 className="font-bold text-[#0A1931] mb-2">Payroll Period</h4>
              <p className="text-[#0A1931]">
                <span className="text-[#70757A]">{viewingPayroll.month}</span>
              </p>
            </div>

            {/* Earnings */}
            <div className="p-4 rounded-lg bg-green-50">
              <h4 className="font-bold text-[#0A1931] mb-3">Earnings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Basic Salary</span>
                  <span className="font-medium">₹{(viewingPayroll.basicSalary || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Allowances</span>
                  <span className="font-medium">₹{(viewingPayroll.allowances || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Bonus</span>
                  <span className="font-medium">₹{(viewingPayroll.bonus || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Overtime Pay</span>
                  <span className="font-medium">₹{(viewingPayroll.overtimePay || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-green-200">
                  <span className="font-medium text-[#0A1931]">Total Earnings</span>
                  <span className="font-bold text-green-600">
                    ₹{((viewingPayroll.basicSalary || 0) + (viewingPayroll.allowances || 0) + (viewingPayroll.bonus || 0) + (viewingPayroll.overtimePay || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="p-4 rounded-lg bg-orange-50">
              <h4 className="font-bold text-[#0A1931] mb-3">Deductions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Deductions (PF, Insurance)</span>
                  <span className="font-medium">₹{(viewingPayroll.deductions || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Tax (TDS / Income Tax)</span>
                  <span className="font-medium">₹{(viewingPayroll.tax || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-orange-200">
                  <span className="font-medium text-[#0A1931]">Total Deductions</span>
                  <span className="font-bold text-orange-600">
                    ₹{((viewingPayroll.deductions || 0) + (viewingPayroll.tax || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="bg-[#137333] text-white p-4 rounded-lg">
              <h4 className="mb-2 font-bold">Net Salary</h4>
              <p className="text-3xl font-bold">
                ₹{(viewingPayroll.netSalary || 0).toLocaleString()}
              </p>
            </div>

            {/* Payment Details */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h4 className="font-bold text-[#0A1931] mb-3">Payment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8ba5be]">Payment Method</span>
                  <span className="font-medium">
                    {viewingPayroll.paymentMethod === "Other" 
                      ? viewingPayroll.customPaymentMethod 
                      : viewingPayroll.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#70757A]">Status</span>
                  <Badge className={`${
                    viewingPayroll.paymentStatus === "PAID"
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-orange-50 border-orange-400 text-orange-600"
                  } border px-2 py-1 text-xs`}>
                    {viewingPayroll.paymentStatus}
                  </Badge>
                </div>
                {viewingPayroll.paymentDate && (
                  <div className="flex justify-between">
                    <span className="text-[#70757A]">Payment Date</span>
                    <span className="font-medium">
                      {new Date(viewingPayroll.paymentDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {viewingPayroll.notes && (
              <div className="p-4 rounded-lg bg-blue-50">
                <h4 className="font-bold text-[#0A1931] mb-2">Notes</h4>
                <p className="text-sm text-[#0A1931]">{viewingPayroll.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleDownloadPDF(viewingPayroll)}
                className="flex-1 gap-2 text-white bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button
                onClick={() => { setOpenViewModal(false); setEditingPayroll(viewingPayroll); setOpenForm(true); }}
                className="flex-1 gap-2 text-white bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
