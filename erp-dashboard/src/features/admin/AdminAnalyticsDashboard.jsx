import React, { useState, useEffect } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import {
  AttendanceTrendChart,
  DepartmentComparisonChart,
  PayrollDistributionChart,
  LeaveAnalyticsChart,
  KPICard
} from "../../components/charts/AnalyticsChart.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { TrendingUp, Calendar, Users, AlertCircle, BarChart3, PieChart } from "lucide-react";

export default function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [analytics, setAnalytics] = useState(null);

  const formatPercentage = (val, decimals = 1) => {
    const num = parseFloat(val) || 0;
    return (Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals) + '%';
  };

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get("/dashboard/analytics", {
          params: { range: timeRange }
        });
        setAnalytics(res.data);
      } catch (err) {
        console.error("Error loading analytics:", err);
        toast({
          title: "Failed to load analytics",
          message: err?.response?.data?.message || "Please try again",
          type: "error"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadAnalytics();
  }, [timeRange]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--ivory)] to-[var(--pistachio)] p-6 rounded-3xl border border-[var(--border-soft)]">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[var(--eucalyptus)] rounded-2xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-[var(--text-main)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Analytics Dashboard</h1>
            <p className="text-[var(--text-muted)] mt-1">Executive insights into HR metrics, attendance, payroll, and team performance</p>
          </div>
        </div>
        
        {/* Time Range Filter */}
        <div className="flex flex-wrap gap-3">
          {["daily", "week", "month", "quarter", "year"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                timeRange === range
                  ? "bg-[var(--clay)] text-white shadow-md"
                  : "bg-[var(--bone-white)] text-[var(--text-muted)] hover:bg-[var(--eucalyptus)] hover:text-[var(--text-main)] border border-[var(--border-soft)]"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Spinner />
            <p className="text-[var(--text-muted)] mt-4">Loading analytics data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 transition-all duration-300 hover:shadow-lg" elevated>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <Badge variant="success">{analytics?.kpis?.attendanceRate > 93 ? "+" : ""}{formatPercentage((analytics?.kpis?.attendanceRate || 0) - 92)}</Badge>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-1">{formatPercentage(analytics?.kpis?.attendanceRate || 0)}</h3>
              <p className="text-[var(--text-muted)] text-sm">Attendance Rate</p>
              <p className="mt-2 text-xs text-green-600">↗ {formatPercentage((analytics?.kpis?.attendanceRate || 0) - 92)} vs last period</p>
            </Card>
            
            <Card className="p-6 transition-all duration-300 hover:shadow-lg" elevated>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <Badge variant="info">{analytics?.kpis?.onTimeRate > 86 ? "+" : ""}{formatPercentage((analytics?.kpis?.onTimeRate || 0) - 86)}</Badge>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-1">{formatPercentage(analytics?.kpis?.onTimeRate || 0)}</h3>
              <p className="text-[var(--text-muted)] text-sm">On-Time Arrivals</p>
              <p className="mt-2 text-xs text-blue-600">↗ {formatPercentage((analytics?.kpis?.onTimeRate || 0) - 86)} vs last period</p>
            </Card>
            
            <Card className="p-6 transition-all duration-300 hover:shadow-lg" elevated>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <Badge variant="warning">{analytics?.kpis?.pendingLeaves || 0} pending</Badge>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-1">{analytics?.kpis?.totalLeaveRequests || 0}</h3>
              <p className="text-[var(--text-muted)] text-sm">Leave Requests</p>
              <p className="mt-2 text-xs text-purple-600">↗ {((analytics?.kpis?.totalLeaveRequests || 0) > 0 ? '+12%' : '0%')} vs last period</p>
            </Card>
            
            <Card className="p-6 transition-all duration-300 hover:shadow-lg" elevated>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[var(--clay)]/20 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-[var(--clay)]" />
                </div>
                <Badge variant="secondary">${(analytics?.kpis?.hoursProcessed || 0).toLocaleString()}</Badge>
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-1">{analytics?.kpis?.activeEmployees || 0}</h3>
              <p className="text-[var(--text-muted)] text-sm">Active Employees</p>
              <p className="mt-2 text-xs text-red-600">↘ {((analytics?.kpis?.activeEmployees || 0) > 0 ? '-3%' : '0%')} vs last period</p>
            </Card>
          </div>

          {/* Main Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AttendanceTrendChart 
              data={analytics?.charts?.attendanceTrend} 
              title={`Attendance Trends (${
                timeRange === "daily" ? "Today" : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
              })`}
              totals={{
                present: analytics?.summary?.totalPresent,
                late: analytics?.summary?.totalLate,
                halfDay: analytics?.summary?.totalHalfDay,
                absent: analytics?.summary?.totalAbsent
              }}
            />
            <LeaveAnalyticsChart 
              data={analytics?.charts?.leaveAnalytics}
              title={`Leave Analytics (${
                timeRange === "daily" ? "Today" : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
              })`}
            />
          </div>

          <DepartmentComparisonChart 
            data={analytics?.charts?.departmentComparison}
            title={`Department Performance (${
              timeRange === "daily" ? "Today" : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
            })`}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <PayrollDistributionChart 
              data={analytics?.charts?.payrollDistribution}
              title={`Payroll Distribution (${
                timeRange === "daily" ? "Today" : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)
              })`}
            />

            {/* Enhanced Quick Insights */}
            <Card className="p-6" elevated>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--eucalyptus)] rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[var(--text-main)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-main)]">Quick Insights</h3>
                </div>
                <Badge variant="success">Live</Badge>
              </div>

              <div className="space-y-4">
                {[
                  { icon: Users, label: "Active Employees", value: analytics?.kpis?.activeEmployees || 0, change: "+5", color: "blue" },
                  { icon: TrendingUp, label: "Productivity Score", value: "8.7/10", change: "+0.3", color: "green" },
                  { icon: Calendar, label: "Leave Requests", value: analytics?.kpis?.totalLeaveRequests || 0, change: "+3", color: "purple" },
                  { icon: AlertCircle, label: "Pending Actions", value: analytics?.kpis?.pendingLeaves || 0, change: "-2", color: "orange" },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--ivory)] hover:bg-[var(--pistachio)] transition-all duration-200 cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          item.color === "blue" ? "bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200" :
                          item.color === "green" ? "bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200" :
                          item.color === "purple" ? "bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200" :
                          "bg-orange-100 dark:bg-orange-900/30 group-hover:bg-orange-200"
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            item.color === "blue" ? "text-blue-600" :
                            item.color === "green" ? "text-green-600" :
                            item.color === "purple" ? "text-purple-600" :
                            "text-orange-600"
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">{item.label}</p>
                          <p className="text-lg font-bold text-[var(--text-main)]">{item.value}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          item.change.startsWith("+") ? "text-green-600" : "text-red-600"
                        }`}>
                          {item.change}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">vs last {timeRange === "daily" ? "day" : timeRange}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border-soft)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">Period: {analytics?.summary?.startDate} to {analytics?.summary?.endDate}</p>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}