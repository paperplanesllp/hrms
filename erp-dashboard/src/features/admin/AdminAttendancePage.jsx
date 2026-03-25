import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Input from "../../components/ui/Input.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { Filter, Download, RefreshCw } from "lucide-react";

export default function AdminAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    userId: "",
    startDate: "",
    endDate: "",
    status: ""
  });

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error loading users:", err);
      const message = err.response?.status === 401
        ? "Session expired. Please log in again."
        : err.response?.status === 403
        ? "Access denied. Only Admin and HR can view this page."
        : "Failed to load users. Please try again.";
      toast({ title: message, type: "error" });
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;

      const res = await api.get("/admin/attendance", { params });
      setRecords(res.data || []);
    } catch (err) {
      const message = err.response?.status === 401
        ? "Session expired. Please log in again."
        : err.response?.status === 403
        ? "Access denied. Only Admin and HR can view attendance logs."
        : "Failed to load attendance logs. Please try again.";
      toast({ title: message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAttendance();
  }, []);

  const handleFilter = () => {
    loadAttendance();
  };

  const clearFilters = () => {
    setFilters({ userId: "", startDate: "", endDate: "", status: "" });
    setTimeout(() => loadAttendance(), 100);
  };

  const getStatusBadge = (status) => {
    if (status === "PRESENT") {
      return "bg-[#E6F4EA] border-[#137333] text-[#137333]";
    } else if (status === "SHORT_HOURS") {
      return "bg-orange-50 border-orange-400 text-orange-600";
    } else if (status === "ABSENT") {
      return "bg-[#FCE8E6] border-[#C5221F] text-[#C5221F]";
    }
    return "bg-gray-50 border-gray-300 text-gray-600";
  };

  const getStatusLabel = (status) => {
    if (status === "SHORT_HOURS") return "Short Hours";
    return status;
  };

  // Calculate summary stats
  const totalPresent = records.filter(r => r.status === "PRESENT").length;
  const totalShortHours = records.filter(r => r.status === "SHORT_HOURS").length;
  const totalAbsent = records.filter(r => r.status === "ABSENT").length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="Attendance Logs"
        subtitle="Monitor all employee attendance records with detailed filtering"
        actions={
          <Button onClick={loadAttendance} variant="secondary" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 border-l-4 border-l-green-600">
          <div className="text-sm font-medium tracking-wide uppercase text-slate-600 dark:text-slate-400">Present</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{totalPresent}</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-orange-500">
          <div className="text-sm font-medium tracking-wide uppercase text-slate-600 dark:text-slate-400">Short Hours</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">{totalShortHours}</div>
        </Card>
        <Card className="p-5 border-l-4 border-l-red-600">
          <div className="text-sm font-medium tracking-wide uppercase text-slate-600 dark:text-slate-400">Absent</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{totalAbsent}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">User</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-accent dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Start Date</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">End Date</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-900 dark:text-white">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-accent dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="PRESENT">Present</option>
              <option value="SHORT_HOURS">Short Hours</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleFilter} className="bg-slate-600 hover:bg-slate-700">
            Apply Filters
          </Button>
          <Button onClick={clearFilters} variant="ghost">
            Clear
          </Button>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card className="p-6 bg-white">
        {loading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-[#70757A]">
            No attendance records found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Date</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Employee</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Shift</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Clock In</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Clock Out</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Total Hours</th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-slate-900 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record._id}
                    className="transition-colors border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400">{record.date}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                      <div className="font-semibold">{record.userId?.name || "Unknown"}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">{record.userId?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {record.shiftName || "Regular Shift"}
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {record.shiftStart} - {record.shiftEnd}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {record.checkIn || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {record.checkOut || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {record.totalHours ? `${record.totalHours}h` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${getStatusBadge(record.status)} border px-3 py-1`}>
                        {getStatusLabel(record.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
