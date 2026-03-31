import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { BarChart3, LineChart, PieChart, Download, Calendar, TrendingUp, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../lib/api.js';
import { useAuthStore } from '../../../store/authStore.js';
import { toast } from '../../../store/toastStore.js';
import { exportAsCSV, exportAsExcel, exportAsPDF } from '../utils/exportReports.js';

export default function TaskReportsSection() {
  const user = useAuthStore(s => s.user);
  const [dateRange, setDateRange] = useState('month');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user has admin/hr role
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if user has permission to view analytics
      if (!isAdminOrHR) {
        setError('You do not have permission to view task reports');
        return;
      }
      
      // Load analytics data
      const analyticsResponse = await api.get('/tasks/analytics/all', {
        params: { dateRange }
      });
      const data = analyticsResponse.data.data || analyticsResponse.data;
      setAnalyticsData(data);
      console.log('✅ Analytics data loaded:', data);

      // Load team performance data
      const teamResponse = await api.get('/tasks/analytics/team-performance', {
        params: { dateRange }
      });
      const teamData = teamResponse.data.data || teamResponse.data || [];
      setTeamPerformance(Array.isArray(teamData) ? teamData : []);
      console.log('✅ Team performance data loaded:', teamData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      const errorMsg = error?.response?.status === 403 
        ? 'You do not have permission to view reports'
        : error?.response?.data?.message || 'Failed to load reports';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [isAdminOrHR, dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, loadAnalytics]);

  // Build reports array dynamically from API data
  const reports = analyticsData ? [
    {
      icon: BarChart3,
      title: 'Task Completion Rate',
      description: 'Track completion trends over time',
      metric: `${analyticsData?.completionRate || 0}%`,
      change: `${analyticsData?.completionRateTrend || 0}%`,
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: TrendingUp,
      title: 'Total Tasks',
      description: 'All tasks in the system',
      metric: analyticsData?.totalTasks || 0,
      change: analyticsData?.completedTasks || 0,
      sublabel: 'Completed',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      icon: PieChart,
      title: 'In Progress',
      description: 'Currently active tasks',
      metric: analyticsData?.inProgressTasks || 0,
      change: analyticsData?.onHoldTasks || 0,
      sublabel: 'On Hold',
      color: 'from-purple-500 to-purple-600',
    },
  ] : [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Error State */}
      {error && (
        <Card className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">Error Loading Reports</h3>
              <p className="text-sm text-red-800 dark:text-red-400 mb-3">{error}</p>
              {error.includes('do not have permission') && (
                <p className="text-sm text-red-700 dark:text-red-400">
                  Reports are only available to HR and Admin users.
                </p>
              )}
              <Button 
                variant="danger" 
                size="sm"
                onClick={loadAnalytics}
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-40 bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Loader className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Loading reports...</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
      {/* Reports Header */}
      <Card className="p-8 border-brand-accent/10 dark:border-brand-accent/20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800/50">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Task Reports & Analytics
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Detailed insights into task performance, team productivity, and project progress metrics.
            </p>
          </div>
          <div className="hidden lg:block">
            <LineChart className="w-16 h-16 text-brand-accent/30" />
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap gap-2 items-center">
          {['week', 'month', 'quarter', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
                ${dateRange === range
                  ? 'bg-brand-accent text-slate-900 shadow-lg shadow-brand-accent/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                }
              `}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
          
          {/* Refresh Button */}
          <button
            onClick={loadAnalytics}
            disabled={isLoading}
            className="ml-auto px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report, idx) => {
          const Icon = report.icon;
          return (
            <Card 
              key={idx}
              className="p-6 hover:shadow-lg transition-all duration-300"
              interactive
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 bg-gradient-to-br ${report.color} rounded-lg shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {report.change}
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                {report.title}
              </h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {report.metric}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {report.description}
                </p>
                {report.sublabel && (
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {report.change} {report.sublabel}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Trend Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-brand-accent" />
              Completion Trend ({dateRange})
            </h3>
            <Button 
              variant="secondary" 
              size="sm" 
              leftIcon={<Download className="w-3 h-3" />}
              onClick={() => exportAsCSV(analyticsData, teamPerformance, `completion-trend-${new Date().getTime()}.csv`)}
            >
              Export
            </Button>
          </div>
          
          {/* Chart Placeholder with Real Data */}
          <div className="h-64 bg-gradient-to-b from-brand-accent/5 to-brand-accent/2 dark:from-brand-accent/10 dark:to-slate-900 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 p-4">
            <div className="text-center w-full">
              <LineChart className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                Completion Rate: {analyticsData?.completionRate || 0}%
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">
                Chart data is available for monthly/quarterly/yearly views
              </p>
            </div>
          </div>
        </Card>

        {/* Task Distribution Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-brand-accent" />
              Task Distribution
            </h3>
            <select className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
              <option>By Priority</option>
              <option>By Status</option>
              <option>By Department</option>
            </select>
          </div>
          
          {/* Chart Placeholder with Real Data Stats */}
          <div className="h-64 bg-gradient-to-b from-brand-accent/5 to-brand-accent/2 dark:from-brand-accent/10 dark:to-slate-900 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 p-4">
            <div className="text-center w-full">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{analyticsData?.totalTasks || 0}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{analyticsData?.completedTasks || 0}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                </div>
              </div>
              <PieChart className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto opacity-50" />
            </div>
          </div>
        </Card>
      </div>

      {/* Team Performance Table */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-accent" />
          Team Performance Metrics
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Team Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Completed
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  In Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Avg Completion Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody>
              {teamPerformance && teamPerformance.length > 0 ? teamPerformance.map((member, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {member.name || member.userName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {member.completed || 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {member.inProgress || 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {member.avgCompletionTime || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-accent to-brand-accent/80"
                          style={{ width: `${member.performanceScore || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white min-w-8">
                        {member.performanceScore || 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No team performance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export Options */}
      <Card className="p-6 bg-gradient-to-br from-brand-accent/5 to-transparent dark:from-brand-accent/10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Export Reports
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="primary" 
            size="md" 
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => exportAsPDF(analyticsData, teamPerformance, `task-reports-${new Date().getTime()}.pdf`)}
            disabled={isLoading}
          >
            Export as PDF
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => exportAsCSV(analyticsData, teamPerformance, `task-reports-${new Date().getTime()}.csv`)}
            disabled={isLoading}
          >
            Export as CSV
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => exportAsExcel(analyticsData, teamPerformance, `task-reports-${new Date().getTime()}.xlsx`)}
            disabled={isLoading}
          >
            Export as Excel
          </Button>
        </div>
      </Card>
        </>
      )}
    </div>
  );
}
