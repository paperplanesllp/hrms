import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { convertTo12HourFormat } from "../attendance/attendanceUtils.js";
import { Search, Edit2, AlertCircle, CheckCircle, Clock, Calendar, User, ChevronDown, X, Filter } from "lucide-react";

export default function AdminAttendanceManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("week"); // day, week, month
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ checkIn: "", checkOut: "", status: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Load all employees and departments on mount
  useEffect(() => {
    loadEmployeesAndDepartments();
  }, []);

  // Load attendance when employee is selected or filter changes
  useEffect(() => {
    if (selectedEmployee) {
      loadAttendanceRecords();
    }
  }, [selectedEmployee, filterType]);

  // Filter employees when department changes
  useEffect(() => {
    if (selectedDepartment === "all") {
      // Keep all employees, auto-select first
      if (employees.length > 0) {
        setSelectedEmployee(employees[0]);
      }
    } else {
      // Filter by department
      const filtered = employees.filter(emp => emp.departmentId === selectedDepartment);
      if (filtered.length > 0) {
        setSelectedEmployee(filtered[0]);
      }
    }
  }, [selectedDepartment, employees]);

  const loadEmployeesAndDepartments = async () => {
    try {
      setLoading(true);
      
      // Load all users (not just USER role, employees could have different roles)
      const empRes = await api.get("/users?limit=1000");
      const allEmployees = Array.isArray(empRes.data) ? empRes.data : empRes.data?.data || [];
      setEmployees(allEmployees);

      // Load departments if available
      try {
        const deptRes = await api.get("/departments?limit=100");
        const allDepts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data?.data || [];
        setDepartments(allDepts);
      } catch {
        // Departments endpoint might not exist, skip error
        console.log("Departments endpoint not available");
        setDepartments([]);
      }

      // Auto-select first employee
      if (allEmployees.length > 0) {
        setSelectedEmployee(allEmployees[0]);
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
  };

  const loadAttendanceRecords = async (employee, type) => {
    if (!employee?._id) return;

    try {
      setRecordsLoading(true);
      const today = new Date();
      let fromDate, toDate;

      if (type === "day") {
        fromDate = today.toISOString().split("T")[0];
        toDate = fromDate;
      } else if (type === "week") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        fromDate = startOfWeek.toISOString().split("T")[0];
        toDate = today.toISOString().split("T")[0];
      } else if (type === "month") {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        fromDate = startOfMonth.toISOString().split("T")[0];
        toDate = today.toISOString().split("T")[0];
      }

      const res = await api.get("/attendance", {
        params: {
          userId: employee._id,
          from: fromDate,
          to: toDate
        }
      });

      setAttendanceRecords(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast({ 
        title: "Failed to load attendance records", 
        type: "error" 
      });
      console.error("Error loading attendance:", error);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Load attendance when employee is selected or filter changes
  useEffect(() => {
    if (selectedEmployee) {
      loadAttendanceRecords(selectedEmployee, filterType);
    }
  }, [selectedEmployee, filterType]);

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setEditForm({
      checkIn: record.checkIn || "",
      checkOut: record.checkOut || "",
      status: record.status || "PRESENT"
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord?._id) return;

    try {
      setEditSubmitting(true);

      // Validate time format
      if (editForm.checkIn && !/^\d{2}:\d{2}$/.test(editForm.checkIn)) {
        toast({ 
          title: "Invalid check-in time format. Use HH:MM", 
          type: "error" 
        });
        return;
      }
      if (editForm.checkOut && !/^\d{2}:\d{2}$/.test(editForm.checkOut)) {
        toast({ 
          title: "Invalid check-out time format. Use HH:MM", 
          type: "error" 
        });
        return;
      }

      const res = await api.put(`/attendance/${editingRecord._id}`, {
        checkIn: editForm.checkIn || null,
        checkOut: editForm.checkOut || null,
        status: editForm.status
      });

      toast({ 
        title: "✅ Attendance record updated successfully", 
        type: "success" 
      });

      // Update local state
      setAttendanceRecords(prev =>
        prev.map(r => r._id === editingRecord._id ? res.data : r)
      );

      setShowEditModal(false);
      setEditingRecord(null);
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
      case "SHORT_HOURS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
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
      case "SHORT_HOURS":
      case "LATE":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDisplayedEmployees = () => {
    let result = employees;

    // Filter by department if selected
    if (selectedDepartment !== "all") {
      result = result.filter(emp => emp.departmentId === selectedDepartment);
    }

    // Filter by search term
    result = result.filter(emp =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return result;
  };

  const displayedEmployees = getDisplayedEmployees();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <PageTitle
        title="Attendance Management (Admin)"
        subtitle="View and manually edit all employee attendance records. Admin-level access for system issue corrections."
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Sidebar - Employee List with Filters */}
          <Card elevated className="lg:col-span-1 h-fit max-h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b border-[#B3CFE5] dark:border-slate-700">
              <h3 className="text-lg font-bold text-[#0A1931] dark:text-white mb-3">Employees</h3>

              {/* Department Filter */}
              {departments.length > 0 && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[#4A7FA7] dark:text-slate-400 mb-2">
                    <Filter className="w-3 h-3 inline mr-1" />
                    Department
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg border-[#B3CFE5] dark:border-slate-600 bg-white dark:bg-slate-800 text-[#0A1931] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
            <div className="divide-y divide-[#B3CFE5] dark:divide-slate-700 overflow-y-auto flex-1">
              {displayedEmployees.length > 0 ? (
                displayedEmployees.map((emp) => (
                  <button
                    key={emp._id}
                    onClick={() => setSelectedEmployee(emp)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedEmployee?._id === emp._id
                        ? "bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-600"
                        : "hover:bg-[#F6FAFD] dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-[#4A7FA7] flex-shrink-0" />
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
                      <p className="text-xs text-[#4A7FA7] dark:text-slate-400">{selectedEmployee.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#4A7FA7] dark:text-slate-400">No employee selected</p>
                  )}
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  {["day", "week", "month"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        filterType === type
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-[#0A1931] dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Attendance Records Table */}
            <Card elevated>
              <div className="p-4 border-b border-[#B3CFE5] dark:border-slate-700">
                <h3 className="text-lg font-bold text-[#0A1931] dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Attendance Records ({filterType.charAt(0).toUpperCase() + filterType.slice(1)})
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-[#0A1931] dark:text-white">Distance</th>
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
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
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
                          <td className="px-4 py-3 text-sm text-[#4A7FA7] dark:text-slate-300">
                            {record.distanceFromOffice ? `${record.distanceFromOffice}m` : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-[#4A7FA7] dark:text-slate-400 mx-auto mb-2" />
                  <p className="text-[#4A7FA7] dark:text-slate-400">No attendance records for this period</p>
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
                  value={new Date(editingRecord.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-700 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white font-medium"
                />
              </div>

              {/* Check-In Time */}
              <div>
                <label className="block text-sm font-semibold text-[#0A1931] dark:text-white mb-2">
                  Check-In Time (HH:MM)
                </label>
                <input
                  type="text"
                  placeholder="09:00"
                  value={editForm.checkIn}
                  onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                  className="w-full px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1">Leave empty if no check-in</p>
              </div>

              {/* Check-Out Time */}
              <div>
                <label className="block text-sm font-semibold text-[#0A1931] dark:text-white mb-2">
                  Check-Out Time (HH:MM)
                </label>
                <input
                  type="text"
                  placeholder="17:00"
                  value={editForm.checkOut}
                  onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                  className="w-full px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1">Leave empty if no check-out</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-[#0A1931] dark:text-white mb-2">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-[#B3CFE5] dark:border-slate-600 rounded-lg text-[#0A1931] dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="SHORT_HOURS">Short Hours</option>
                  <option value="LATE">Late</option>
                </select>
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
