import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Loader } from 'lucide-react';
import { taskService } from '../taskService.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';

export default function TaskCompletionChart({ title = 'Task Completion Trend' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState(null);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const trends = await taskService.getTaskCompletionTrends(days);
      setData(trends.data || []);
      setSummary(trends.summary || {});
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast({
        title: 'Error loading chart',
        message: error?.response?.data?.message || 'Failed to fetch completion trends',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [days]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTaskStatusChanged = (data) => {
      if (data.task?.status === 'completed') {
        fetchTrends();
      }
    };

    socket.on('task:status-changed', handleTaskStatusChanged);

    return () => {
      socket.off('task:status-changed', handleTaskStatusChanged);
    };
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center transition-colors border border-dashed h-72 bg-gradient-to-b from-brand-accent/5 via-brand-accent/2 to-brand-accent/1 dark:from-brand-accent/10 dark:via-brand-accent/5 dark:to-slate-900 rounded-xl border-slate-300 dark:border-slate-700">
        <div className="flex flex-col items-center gap-2">
          <Loader className="w-6 h-6 animate-spin text-brand-accent" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading chart...</p>
        </div>
      </div>
    );
  }

  const hasData = data && data.length > 0 && data.some(d => d.completed > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center transition-colors border border-dashed h-72 bg-gradient-to-b from-brand-accent/5 via-brand-accent/2 to-brand-accent/1 dark:from-brand-accent/10 dark:via-brand-accent/5 dark:to-slate-900 rounded-xl border-slate-300 dark:border-slate-700">
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No task completions yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Complete some tasks to see your completion trends
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Total Completed</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summary.totalCompleted}</p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">On-Time</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{summary.totalOnTime}</p>
          </div>
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">Late</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{summary.totalLate}</p>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">On-Time %</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{summary.onTimePercentage}%</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            className="dark:stroke-slate-400"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            className="dark:stroke-slate-400"
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
          />
          <Legend />
          <Bar dataKey="completed" fill="#10b981" name="Total Completed" radius={[8, 8, 0, 0]} />
          <Bar dataKey="onTime" fill="#3b82f6" name="On-Time" radius={[8, 8, 0, 0]} />
          <Bar dataKey="late" fill="#f59e0b" name="Late" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
