import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, Calendar, Users } from 'lucide-react';
import TaskLoadingSkeleton from '../components/TaskLoadingSkeleton.jsx';


export default function ReportsSection({ stats }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [completionTrend, setCompletionTrend] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days'); // 7days, 30days, 90days

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Load analytics data
      const analyticsResponse = await api.get('/tasks/analytics/all');
      setAnalyticsData(analyticsResponse.data.data);

      // Load completion trend
      const trendResponse = await api.get('/tasks/analytics/completion-trend');
      setCompletionTrend(trendResponse.data.data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 duration-300 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Comprehensive task management insights</p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 font-bold text-gray-900 transition-colors bg-white border-2 border-gray-300 rounded-lg dark:border-gray-600 dark:bg-slate-700 dark:text-white focus:border-blue-500"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {isLoading ? (
        <TaskLoadingSkeleton type="stats" />
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="p-6 border-2 border-blue-300 rounded-2xl dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-blue-700 uppercase dark:text-blue-400">Total Tasks</h3>
                <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                {analyticsData?.totalTasks || 0}
              </p>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Across organization</p>
            </div>

            <div className="p-6 border-2 border-green-300 rounded-2xl dark:border-green-700 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-green-700 uppercase dark:text-green-400">Completed</h3>
                <TrendingUp size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-4xl font-bold text-green-900 dark:text-green-100">
                {analyticsData?.completedTasks || 0}
              </p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">Completion rate: {analyticsData?.completionRate || 0}%</p>
            </div>

            <div className="p-6 border-2 rounded-2xl border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase text-amber-700 dark:text-amber-400">In Progress</h3>
                <Calendar size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                {analyticsData?.inProgressTasks || 0}
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Active work</p>
            </div>

            <div className="p-6 border-2 border-red-300 rounded-2xl dark:border-red-700 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-red-700 uppercase dark:text-red-400">Overdue</h3>
                <Calendar size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <p className="text-4xl font-bold text-red-900 dark:text-red-100">
                {analyticsData?.overdueTasks || 0}
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Needs attention</p>
            </div>
          </div>

          {/* Charts and visualizations */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Priority Distribution */}
            <div className="p-6 bg-white border-2 border-gray-200 shadow-lg rounded-2xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 mb-6 text-xl font-bold text-gray-900 dark:text-white">
                <PieChart size={20} /> Priority Distribution
              </h3>

              <div className="space-y-4">
                {analyticsData?.priorityBreakdown && Object.entries(analyticsData.priorityBreakdown).map(([priority, count]) => {
                  const priorityColors = {
                    LOW: { bar: 'bg-blue-500', label: 'Low' },
                    MEDIUM: { bar: 'bg-amber-500', label: 'Medium' },
                    HIGH: { bar: 'bg-orange-500', label: 'High' },
                    URGENT: { bar: 'bg-red-500', label: 'Urgent' }
                  };

                  const config = priorityColors[priority];
                  const total = analyticsData.totalTasks || 1;
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={priority}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{config.label}</span>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full dark:bg-gray-700">
                        <div
                          className={`h-full ${config.bar} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Distribution */}
            <div className="p-6 bg-white border-2 border-gray-200 shadow-lg rounded-2xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="flex items-center gap-2 mb-6 text-xl font-bold text-gray-900 dark:text-white">
                <BarChart3 size={20} /> Task Status Distribution
              </h3>

              <div className="space-y-4">
                {analyticsData?.statusDistribution && Object.entries(analyticsData.statusDistribution).map(([status, count]) => {
                  const statusColors = {
                    pending: { bar: 'bg-gray-500', label: 'Pending' },
                    'in-progress': { bar: 'bg-blue-500', label: 'In Progress' },
                    completed: { bar: 'bg-green-500', label: 'Completed' },
                    'on-hold': { bar: 'bg-yellow-500', label: 'On Hold' },
                    cancelled: { bar: 'bg-red-500', label: 'Cancelled' }
                  };

                  const config = statusColors[status];
                  const total = analyticsData.totalTasks || 1;
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-700 capitalize dark:text-gray-300">
                          {status.replace('-', ' ')}
                        </span>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full dark:bg-gray-700">
                        <div
                          className={`h-full ${config.bar} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Completion Trend */}
          <div className="p-6 bg-white border-2 border-gray-200 shadow-lg rounded-2xl dark:border-gray-700 dark:bg-slate-800">
            <h3 className="flex items-center gap-2 mb-6 text-xl font-bold text-gray-900 dark:text-white">
              <TrendingUp size={20} /> Completion Trend (Last 7 Days)
            </h3>

            {completionTrend && completionTrend.length > 0 ? (
              <div className="space-y-3">
                {completionTrend.map((day, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {day._id}
                      </span>
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {day.completedCount} completed
                      </span>
                    </div>
                    <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full dark:bg-gray-700">
                      <div
                        className="h-full transition-all duration-500 bg-gradient-to-r from-green-500 to-emerald-600"
                        style={{
                          width: `${Math.min(
                            (day.completedCount / Math.max(...completionTrend.map(d => d.completedCount), 1)) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No completion data available</p>
              </div>
            )}
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-6 bg-white border-2 border-gray-200 shadow-lg rounded-2xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Average Progress</h3>
              <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                {analyticsData?.averageProgress || 0}%
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Organization wide average</p>
            </div>

            <div className="p-6 bg-white border-2 border-gray-200 shadow-lg rounded-2xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">On-Time Rate</h3>
              <p className="text-5xl font-bold text-green-600 dark:text-green-400">
                {analyticsData?.totalTasks > 0 
                  ? Math.round(((analyticsData.totalTasks - analyticsData.overdueTasks) / analyticsData.totalTasks) * 100)
                  : 0}%
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Tasks completed on time</p>
            </div>

            <div className="p-6 bg-white border-2 border-gray-200 shadow-lg rounded-2xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Pending Tasks</h3>
              <p className="text-5xl font-bold text-amber-600 dark:text-amber-400">
                {analyticsData?.pendingTasks || 0}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Waiting to start</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
