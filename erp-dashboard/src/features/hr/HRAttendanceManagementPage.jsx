import React, { useCallback, useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { convertTo12HourFormat } from "../attendance/attendanceUtils.js";
import { Search, Edit2, AlertCircle, CheckCircle, Clock, Calendar, User, ChevronDown, X } from "lucide-react";

export default function HRAttendanceManagementPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", checkInPeriod: "AM", checkOutPeriod: "PM" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/users?role=USER&limit=1000");
      const allUsers = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const employeeOnly = allUsers.filter(
        (emp) => emp?.role === ROLES.USER && String(emp?._id || "") !== currentUserId
      );

      setEmployees(employeeOnly);
      
      // Auto-select first employee
      if (employeeOnly.length > 0) {
        setSelectedEmployee(employeeOnly[0]);
      } else {
        setSelectedEmployee(null);
      }
    } catch (e) {
      toast({ 
        title: "Failed to load employees", 
        type: "error" 
      });
      console.error("Error loading employees:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Load all employees on mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const loadAttendanceRecords = async (employee, date) => {
    if (!employee?._id) return;

    try {
      setRecordsLoading(true);
      const fromDate = date;
      const toDate = date;

      const res = await api.get("/attendance", {
        params: {
          userId: employee._id,
          from: fromDate,
          to: toDate
        }
      });

      setAttendanceRecords(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      toast({ 
        title: "Failed to load attendance records", 
        type: "error" 
      });
      console.error("Error loading attendance:", e);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Load attendance when employee/date changes
  useEffect(() => {
    if (selectedEmployee) {
      loadAttendanceRecords(selectedEmployee, selectedDate);
    }
  }, [selectedEmployee, selectedDate]);

  const handleEditRecord = (record) => {
    const targetUserId = String(record?.userId || "");
    const canEditRecord = record?.userRole === ROLES.USER && targetUserId !== currentUserId;

    if (!canEditRecord) {
      toast({
        title: "You can only edit employee attendance records",
        type: "error"
      });
      return;
    }

    setEditingRecord(record);
    // Convert 24h HH:MM to 12h for display
    const to12h = (time24) => {
      if (!time24) return { time: "", period: "AM" };
      const [hStr, mStr] = time24.split(":");
      let h = parseInt(hStr, 10);
      const period = h >= 12 ? "PM" : "AM";
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      return { time: `${h}:${mStr}`, period };
    };
    const ci = to12h(record.checkIn);
    const co = to12h(record.checkOut);
    setEditForm({
      checkIn: ci.time,
      checkInPeriod: ci.period,
      checkOut: co.time,
      checkOutPeriod: co.period
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord?._id) return;

    try {
      setEditSubmitting(true);

      // Convert 12h to 24h HH:MM for backend
      const to24h = (time12, period) => {
        if (!time12) return "";
        const match = time12.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        let h = parseInt(match[1], 10);
        const m = match[2];
        if (h < 1 || h > 12 || parseInt(m, 10) > 59) return null;
        if (period === "AM") { if (h === 12) h = 0; }
        else { if (h !== 12) h += 12; }
        return `${String(h).padStart(2, "0")}:${m}`;
      };

      // Validate time format (H:MM or HH:MM)
      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (editForm.checkIn && !timeRegex.test(editForm.checkIn)) {
        toast({ 
          title: "Invalid check-in time format. Use H:MM (e.g. 9:30)", 
          type: "error" 
        });
        return;
      }
      if (editForm.checkOut && !timeRegex.test(editForm.checkOut)) {
        toast({ 
          title: "Invalid check-out time format. Use H:MM (e.g. 5:30)", 
          type: "error" 
        });
        return;
      }

      const checkIn24 = to24h(editForm.checkIn, editForm.checkInPeriod);
      const checkOut24 = to24h(editForm.checkOut, editForm.checkOutPeriod);

      if (editForm.checkIn && checkIn24 === null) {
        toast({ title: "Invalid check-in time. Hour must be 1-12.", type: "error" });
        return;
      }
      if (editForm.checkOut && checkOut24 === null) {
        toast({ title: "Invalid check-out time. Hour must be 1-12.", type: "error" });
        return;
      }

      await api.put(`/attendance/${editingRecord._id}`, {
        checkIn: checkIn24 || "",
        checkOut: checkOut24 || ""
      });

      toast({ 
        title: "✅ Attendance record updated successfully", 
        type: "success" 
      });

      setShowEditModal(false);
      setEditingRecord(null);

      // Always reload canonical attendance rows so computed fields/date formatting stay correct.
      if (selectedEmployee?._id) {
        await loadAttendanceRecords(selectedEmployee, selectedDate);
      }
    } catch (e) {
      toast({ 
        title: "Failed to update: " + (e?.response?.data?.message || e.message), 
        type: "error" 
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "ABSENT":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "HOLIDAY":
        return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
      case "SHORT_HOURS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "HALF_DAY":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
      case "LATE":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PRESENT":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "ABSENT":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "HOLIDAY":
        return <Calendar className="w-4 h-4 text-sky-600" />;
      case "SHORT_HOURS":
      case "LATE":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "HALF_DAY":
        return <Clock className="w-4 h-4 text-indigo-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDisplayDate = (dateValue, longFormat = false) => {
    if (!dateValue) return "-";
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-US", longFormat
      ? { weekday: "long", year: "numeric", month: "long", day: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" }
    );
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <PageTitle
        title="Attendance Management"
        subtitle="View and manually edit employee attendance records. Use this for software issue corrections."
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Sidebar - Employee List */}
          <Card elevated className="lg:col-span-1 h-fit">
            <div className="p-4 border-b border-[#B3CFE5] dark:border-slate-700">
              <h3 className="text-lg font-bold text-[#0A1931] dark:text-white mb-3">Employees</h3>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-[#4A7FA7]" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg border-[#B3CFE5] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#0A1931] dark:text-white placeholder-[#4A7FA7] dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="divide-y divide-[#B3CFE5] dark:divide-slate-700 max-h-96 overflow-y-auto">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp._id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedEmployee?._id === emp._id
                        ? "bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-600"
                        : "hover:bg-[#F6FAFD] dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-[#4A7FA7]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A1931] dark:text-white truncate">
                          {emp.name}
                        </p>
                        <p className="text-xs text-[#4A7FA7] dark:text-slate-400 truncate">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-[#4A7FA7] dark:text-slate-400">
                  No employees found
                </div>
              )}
            </div>
          </Card>

          {/* Main Content - Attendance Records */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filter Controls */}
            <Card elevated className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  {selectedEmployee ? (
                    <div>
                      <p className="text-sm text-[#4A7FA7] dark:text-slate-400">Selected Employee</p>
                      <p className="text-lg font-bold text-[#0A1931] dark:text-white">{selectedEmployee.name}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#4A7FA7] dark:text-slate-400">No employee selected</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-[#4A7FA7] dark:text-slate-400">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg border-[#B3CFE5] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#0A1931] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>

            {/* Attendance Records Table */}
            <Card elevated>
              <div className="p-4 border-b border-[#B3CFE5] dark:border-slate-700">
                <h3 className="text-lg font-bold text-[#0A1931] dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Attendance Records (Daily - {selectedDate})
                </h3>
              </div>

              {recordsLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Spinner />
                </div>
              ) : attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#B3CFE5] dark:border-slate-700 bg-[#F6FAFD] dark:bg-slate-800">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#0A1931] dark:text-white">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#0A1931] dark:text-white">Check-In</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#0A1931] dark:text-white">Check-Out</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#0A1931] dark:text-white">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#0A1931] dark:text-white">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => (
                        <tr
                          key={record._id}
                          className="border-b border-[#B3CFE5] dark:border-slate-700 hover:bg-[#F6FAFD] dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-[#0A1931] dark:text-white">
                            {formatDisplayDate(record.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#4A7FA7] dark:text-slate-300">
                            {record.checkIn ? convertTo12HourFormat(record.checkIn) : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#4A7FA7] dark:text-slate-300">
                            {record.checkOut ? convertTo12HourFormat(record.checkOut) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(record.status)}`}>
                                {record.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {record.userRole === ROLES.USER && String(record.userId || "") !== currentUserId ? (
                              <button
                                onClick={() => handleEditRecord(record)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-[#4A7FA7] dark:text-slate-400">Restricted</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-[#4A7FA7] dark:text-slate-400 mx-auto mb-2" />
                  <p className="text-[#4A7FA7] dark:text-slate-400">No attendance records for selected date</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
          <Card elevated className="w-full max-w-md">
            <div className="p-6 border-b border-[#B3CFE5] dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">Edit Attendance Record</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRecord(null);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#4A7FA7]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Date Display */}
              <div>
                <label className="block text-sm font-semibold text-[#0A1931] dark:text-white mb-2">
                  Date
                </label>
                <input
                  type="text"
                  disabled
                  value={formatDisplayDate(editingRecord?.date, true)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white font-medium"
                />
              </div>

              {/* Check-In Time */}
              <div>
                <label className="block text-sm font-semibold text-[#0A1931] dark:text-white mb-2">
                  Check-In Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="9:00"
                    value={editForm.checkIn}
                    onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                    className="flex-1 px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={editForm.checkInPeriod}
                    onChange={(e) => setEditForm({ ...editForm, checkInPeriod: e.target.value })}
                    className="px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1">e.g. 9:30 AM — Leave empty if no check-in</p>
              </div>

              {/* Check-Out Time */}
              <div>
                <label className="block text-sm font-semibold text-[#0A1931] dark:text-white mb-2">
                  Check-Out Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="5:30"
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                    className="flex-1 px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={editForm.checkOutPeriod}
                    onChange={(e) => setEditForm({ ...editForm, checkOutPeriod: e.target.value })}
                    className="px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1">e.g. 6:30 PM — Leave empty if no check-out</p>
              </div>

              <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                <p className="text-sm font-medium text-blue-900">Status will be auto-calculated</p>
                <p className="text-xs text-blue-700 mt-1">
                  The system automatically updates Present, Short Hours, Half Day, or Absent based on timings.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRecord(null);
                  }}
                  className="flex-1 px-4 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
