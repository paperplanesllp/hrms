import React, { useState, useEffect } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { convertTo12HourFormat } from "../attendance/attendanceUtils.js";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Award,
  Target,
  Activity,
} from "lucide-react";

function PerformanceMetricCard({ icon: Icon, label, value, unit, trend, color }) {
  const trendColor = trend > 0 ? "text-green-600" : "text-red-600";
  const trendSymbol = trend > 0 ? "↗" : "↘";

  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-lg" elevated>
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white`}
          style={{ backgroundColor: color }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <Badge variant={trend > 0 ? "success" : "warning"} className="text-xs">
          {trendSymbol} {Math.abs(trend).toFixed(1)}%
        </Badge>
      </div>
      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
        {value}
        <span className="text-sm text-slate-500 dark:text-slate-400 font-normal ml-2">
          {unit}
        </span>
      </h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm">{label}</p>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="p-6" elevated>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </Card>
  );
}

export default function EmployeeAnalyticsDashboard() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [analytics, setAnalytics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Calculate date range based on timeRange
        const today = new Date();
        let fromDate = new Date(today);
        
        switch (timeRange) {
          case "daily":
            fromDate.setDate(today.getDate());
            break;
          case "week":
            fromDate.setDate(today.getDate() - 7);
            break;
          case "month":
            fromDate.setMonth(today.getMonth() - 1);
            break;
          case "quarter":
            fromDate.setMonth(today.getMonth() - 3);
            break;
          case "year":
            fromDate.setFullYear(today.getFullYear() - 1);
            break;
          default:
            fromDate.setMonth(today.getMonth() - 1);
        }

        const from = fromDate.toISOString().split("T")[0];
        const to = today.toISOString().split("T")[0];

        const [analyticsRes, attendanceRes, leaveRes] = await Promise.all([
          api.get("/dashboard/analytics", { params: { range: timeRange } }),
          api.get("/attendance", { params: { from, to } }),
          api.get("/dashboard/leave-balance"),
        ]);

        setAnalytics(analyticsRes.data);
        setAttendance(attendanceRes.data || []);
        setLeaveBalance(leaveRes.data);
      } catch (err) {
        console.error("Error loading analytics:", err);
        toast({
          title: "Failed to load analytics",
          message: err?.response?.data?.message || "Please try again",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  // Calculate personal metrics
  const getPersonalAttendanceStats = () => {
    if (!attendance || attendance.length === 0) {
      return { present: 0, absent: 0, late: 0, percentage: 0, total: 0 };
    }

    const present = attendance.filter((a) => a.status === "PRESENT").length;
    const absent = attendance.filter((a) => a.status === "ABSENT").length;
    const late = attendance.filter((a) => a.status === "SHORT_HOURS").length;
    const total = present + absent + late;
    const percentage = total > 0 ? ((present / total) * 100) : 0;

    return { present, absent, late, percentage, total };
  };

  const getWeeklyAttendance = () => {
    if (!attendance || attendance.length === 0) return [];

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday of this week

    return weekDays.map((day, idx) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + idx);
      const dateStr = date.toISOString().split("T")[0];

      const dayAttendance = attendance.find((a) => a.date === dateStr);
      return {
        day,
        date: dateStr,
        status: dayAttendance?.status || "ABSENT",
        checkIn: dayAttendance?.checkIn || null,
        checkOut: dayAttendance?.checkOut || null,
      };
    });
  };

  const getHoursWorked = () => {
    if (!attendance || attendance.length === 0) return [];

    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayAttendance = attendance.find((a) => a.date === dateStr);
      if (dayAttendance?.totalHours) {
        last7Days.push({
          day: dateStr.slice(5),
          hours: dayAttendance.totalHours,
          status: dayAttendance.status,
        });
      }
    }

    return last7Days.length > 0 ? last7Days : [];
  };

  const personalStats = getPersonalAttendanceStats();
  const weeklyData = getWeeklyAttendance();
  const hoursData = getHoursWorked();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner />
          <p className="text-slate-600 dark:text-slate-400 mt-4">
            Loading your performance analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Your Performance
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Real-time insights into your attendance, productivity, and
                performance
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back, {user?.name?.split(" ")[0]}!
            </p>
            <Badge variant="success" className="mt-2">
              ✓ Active
            </Badge>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          {["daily", "week", "month", "quarter", "year"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                timeRange === range
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <PerformanceMetricCard
          icon={CheckCircle2}
          label="Attendance Rate"
          value={personalStats.percentage}
          unit="%"
          trend={personalStats.percentage >= 85 ? 5 : personalStats.percentage >= 70 ? 0 : -10}
          color="#3B82F6"
        />
        <PerformanceMetricCard
          icon={Clock}
          label="Days Present"
          value={personalStats.present}
          unit="days"
          trend={personalStats.present > 0 ? 5 : -5}
          color="#10B981"
        />
        <PerformanceMetricCard
          icon={AlertCircle}
          label="Days Absent"
          value={personalStats.absent}
          unit="days"
          trend={personalStats.absent > 0 ? -5 : 0}
          color="#EF4444"
        />
        <PerformanceMetricCard
          icon={Zap}
          label="On-Time Arrivals"
          value={personalStats.late === 0 ? "100" : (((personalStats.present / (personalStats.present + personalStats.late)) * 100) || 0).toFixed(0)}
          unit="%"
          trend={personalStats.late === 0 ? 10 : -5}
          color="#F59E0B"
        />
      </div>

      {/* Leave Balance */}
      {leaveBalance && (
        <Card className="p-6" elevated>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Leave Balance
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your annual leave status
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total Days
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {leaveBalance.total}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Remaining
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {leaveBalance.remaining}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Used / Pending
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">
                {leaveBalance.used} Used / {leaveBalance.pending} Pending
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance */}
        <ChartCard
          title="Weekly Attendance Overview"
          subtitle="Your attendance status for each day this week"
        >
          <div className="space-y-3">
            {weeklyData && weeklyData.length > 0 ? (
              weeklyData.map((day, idx) => {
                const statusColor =
                  day.status === "PRESENT"
                    ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
                    : day.status === "SHORT_HOURS"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
                    : "bg-slate-100 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700";

                const statusText =
                  day.status === "PRESENT"
                    ? "Present"
                    : day.status === "SHORT_HOURS"
                    ? "Late"
                    : "No Record";
                const statusIcon =
                  day.status === "PRESENT"
                    ? "✓"
                    : day.status === "SHORT_HOURS"
                    ? "!"
                    : "−";

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-xl border ${statusColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 w-12">
                        {day.day}
                      </span>
                      <span
                        className="text-xl font-bold"
                        style={{
                          color:
                            day.status === "PRESENT"
                              ? "#059669"
                              : day.status === "SHORT_HOURS"
                              ? "#D97706"
                              : "#6B7280",
                        }}
                      >
                        {statusIcon}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {statusText}
                      </p>
                      {day.checkIn && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {convertTo12HourFormat(day.checkIn)}
                          {day.checkOut && ` - ${convertTo12HourFormat(day.checkOut)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-48 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No weekly data yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Check in this week to see your attendance
                  </p>
                </div>
              </div>
            )}
          </div>
        </ChartCard>

        {/* Hours Worked */}
        {hoursData.length > 0 ? (
          <ChartCard
            title="Hours Worked This Week"
            subtitle="Daily working hours"
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard title="Hours Worked" subtitle="No data yet">
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p>Start checking in to see your working hours</p>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Attendance Trend */}
      {analytics?.charts?.attendanceTrend && analytics.charts.attendanceTrend.length > 0 ? (
        <ChartCard
          title="Attendance Trends"
          subtitle={`Your attendance pattern over the selected period`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.charts.attendanceTrend}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="present"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorPresent)"
                name="Present"
              />
              <Area
                type="monotone"
                dataKey="absent"
                stroke="#EF4444"
                fillOpacity={1}
                fill="url(#colorAbsent)"
                name="Absent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : (
        <ChartCard
          title="Attendance Trends"
          subtitle="Build your attendance data by checking in regularly"
        >
          <div className="h-80 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <Activity className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No attendance data yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Start checking in and checking out to build your attendance record
              </p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Performance Summary */}
      <Card className="p-6" elevated>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Performance Summary
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Overall Score
            </p>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {personalStats.total === 0 ? 0 : (personalStats.percentage || 0).toFixed(0)}
              <span className="text-xl">/100</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Based on {personalStats.total} records
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Status
            </p>
            <Badge
              variant={personalStats.percentage > 85 ? "success" : personalStats.percentage > 70 ? "warning" : "danger"}
              className="text-lg p-2 inline-block"
            >
              {personalStats.percentage > 85
                ? "Excellent"
                : personalStats.percentage > 70
                ? "Good"
                : personalStats.percentage > 0 ? "Needs Improvement" : "No Data"}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Summary
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {personalStats.present} Present<br/>
              {personalStats.late} Late<br/>
              {personalStats.absent} Absent
            </p>
          </div>
        </div>
      </Card>

      {/* Tips & Recommendations */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800" elevated>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Tips to Improve Your Performance
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Maintain Punctuality
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Arrive on time every day to boost your score
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Reduce Absences
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Minimize unplanned absences for better attendance
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Checkout Properly
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Always checkout to record your working hours
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Track Progress
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Review this dashboard regularly
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
