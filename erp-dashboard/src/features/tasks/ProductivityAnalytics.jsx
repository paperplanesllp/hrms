import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/ui/Card.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import api from '../../lib/api.js';
import { AlertCircle, TrendingUp, Users, Zap } from 'lucide-react';

export default function ProductivityAnalytics({ departmentId = null }) {
  const [analytics, setAnalytics] = useState(null);
  const [overloaded, setOverloaded] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [departmentId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, teamRes] = await Promise.all([
        api.get('/tasks/analytics/all', { params: { dateRange: 'month' } }),
        api.get('/tasks/analytics/team-performance', { params: { dateRange: 'month' } })
      ]);

      const analyticsData = analyticsRes.data?.data || {};
      const teamData = teamRes.data?.data || [];
      setAnalytics(analyticsData);
      setOverloaded((Array.isArray(teamData) ? teamData : []).filter(member => (member.overdueCount || 0) > 0));
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;
  const metrics = analytics?.metrics || {};
  const teamPerformance = Array.isArray(overloaded) ? overloaded : [];

  const productivityData = [
    { name: 'Completed', value: analytics.completedTasks || 0, fill: '#10b981' },
    { name: 'Pending', value: analytics.pendingTasks || 0, fill: '#f59e0b' },
    { name: 'Overdue', value: metrics.overdueOpenTasks || analytics.overdueCount || 0, fill: '#ef4444' },
    { name: 'On Hold', value: metrics.onHoldTasks || analytics.onHoldTasks || 0, fill: '#6366f1' }
  ];

  const scoreHistory = analytics.scoreHistory || [];

  const departmentComparison = analytics.departmentComparison || [];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase">Productivity Score</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {Math.round(metrics.estimateAccuracyPct || 0)}%
              </p>
            </div>
            <div className="p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase">Completion Rate</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                {Math.round(analytics.completionRate || 0)}%
              </p>
            </div>
            <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase">On-Time Rate</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {metrics.completedTasks > 0 ? Math.round(((metrics.completedOnTimeTasks || 0) / metrics.completedTasks) * 100) : 0}%
              </p>
            </div>
            <div className="p-2 bg-purple-200 dark:bg-purple-800/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase">Overloaded</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-1">
                {teamPerformance.length}
              </p>
            </div>
            <div className="p-2 bg-red-200 dark:bg-red-800/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution */}
        {productivityData.some(d => d.value > 0) && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Task Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productivityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productivityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Productivity Score Trend */}
        {scoreHistory && scoreHistory.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Productivity Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Department Comparison */}
      {departmentComparison && departmentComparison.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Department Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completion" fill="#10b981" name="Completion Rate" />
              <Bar dataKey="onTime" fill="#3b82f6" name="On-Time Rate" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Overloaded Employees */}
      {overloaded.length > 0 && (
        <Card className="p-6 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500" />
            Overloaded Employees Requiring Attention
          </h3>
          <div className="space-y-3">
            {teamPerformance.slice(0, 10).map((emp) => (
              <div key={emp._id || emp.email} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{emp.name || emp.userName || emp.email}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {(emp.inProgress || 0)} in progress • {(emp.overdueCount || 0)} overdue
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{emp.classification || 'Needs Improvement'}</p>
                  <p className="text-xs text-slate-500">Score: {emp.performanceScore || 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
