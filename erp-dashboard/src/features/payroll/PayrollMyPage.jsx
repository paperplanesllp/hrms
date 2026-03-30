import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import api from "../../lib/api.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { Link } from "react-router-dom";
import { DollarSign, TrendingUp, Calendar, Shield } from "lucide-react";

export default function PayrollMyPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isHR = user?.role === ROLES.HR;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

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
        <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4">Salary Breakdown</h3>
        <div className="border border-[var(--border-soft)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--eucalyptus)]">
                <th className="px-6 py-4 font-semibold text-left text-white">Month</th>
                <th className="px-6 py-4 font-semibold text-left text-white">Amount</th>
                <th className="px-6 py-4 font-semibold text-left text-white">Status</th>
                <th className="px-6 py-4 font-semibold text-left text-white">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-[var(--text-muted)]">Loading payroll data...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-[var(--text-muted)]">No payroll records found</td>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-[var(--text-muted)]">No payroll records available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}