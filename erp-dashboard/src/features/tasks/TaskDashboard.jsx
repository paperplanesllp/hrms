import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Zap, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import api from '../../lib/api.js';
import { getPriorityStyles, PRIORITY_OPTIONS } from './taskUtils.js';

export default function TaskDashboard({ userId, onFilterChange }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/my/stats');
      setStats(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading task stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error || !stats) {
    return (
      <Card className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-red-700 dark:text-red-300">Failed to load task statistics</p>
      </Card>
    );
  }

  const statsByStatus = stats.byStatus || {};
  const statsByPriority = stats.byPriority || {};

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <Card 
          className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg hover:from-blue-100 hover:to-blue-200 transition-all"
          onClick={() => onFilterChange?.({ status: null })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                Total Tasks
              </p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {statsByStatus.total || 0}
              </p>
            </div>
            <div className="p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        {/* Pending */}
        <Card 
          className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-l-4 border-amber-500 cursor-pointer hover:shadow-lg hover:from-amber-100 hover:to-amber-200 transition-all"
          onClick={() => onFilterChange?.({ status: 'pending' })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                Pending
              </p>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                {statsByStatus.pending || 0}
              </p>
            </div>
            <div className="p-2 bg-amber-200 dark:bg-amber-800/50 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        {/* In Progress */}
        <Card 
          className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-l-4 border-cyan-500 cursor-pointer hover:shadow-lg hover:from-cyan-100 hover:to-cyan-200 transition-all"
          onClick={() => onFilterChange?.({ status: 'in-progress' })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
                In Progress
              </p>
              <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-100 mt-1">
                {statsByStatus['in-progress'] || 0}
              </p>
            </div>
            <div className="p-2 bg-cyan-200 dark:bg-cyan-800/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </Card>

        {/* Completed */}
        <Card 
          className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-l-4 border-green-500 cursor-pointer hover:shadow-lg hover:from-green-100 hover:to-green-200 transition-all"
          onClick={() => onFilterChange?.({ status: 'completed' })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                Completed
              </p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
                {statsByStatus.completed || 0}
              </p>
            </div>
            <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        {/* Overdue */}
        <Card 
          className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-l-4 border-red-500 cursor-pointer hover:shadow-lg hover:from-red-100 hover:to-red-200 transition-all"
          onClick={() => onFilterChange?.({ dateRange: 'overdue' })}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                Overdue
              </p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-1">
                {stats.overdue || 0}
              </p>
            </div>
            <div className="p-2 bg-red-200 dark:bg-red-800/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks by Priority */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Tasks by Priority
          </h3>
          <div className="space-y-3">
            {PRIORITY_OPTIONS.map(option => {
              const count = statsByPriority[option.value] || 0;
              const percentage = statsByStatus.total > 0 
                ? Math.round((count / statsByStatus.total) * 100) 
                : 0;
              const styles = getPriorityStyles(option.value);

              return (
                <div key={option.value} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${styles.dot}`}></span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {option.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${styles.dot}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tasks by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Tasks by Status
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Pending', value: statsByStatus.pending || 0, color: 'amber' },
              { label: 'In Progress', value: statsByStatus['in-progress'] || 0, color: 'blue' },
              { label: 'Completed', value: statsByStatus.completed || 0, color: 'green' },
              { label: 'On Hold', value: statsByStatus['on-hold'] || 0, color: 'slate' },
              { label: 'Cancelled', value: statsByStatus.cancelled || 0, color: 'red' }
            ].map(status => {
              const percentage = statsByStatus.total > 0 
                ? Math.round((status.value / statsByStatus.total) * 100) 
                : 0;

              return (
                <div key={status.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {status.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {status.value} ({percentage}%)
                    </span>
                  </div>
                  <div className={`w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden bg-${status.color}-100 dark:bg-${status.color}-900/30`}>
                    <div
                      className={`h-full transition-all bg-${status.color}-500`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              Completion Rate
            </p>
            <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">
              {stats.completionRate || 0}%
            </p>
          </div>
          <div className="flex-1 mx-6">
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                style={{ width: `${stats.completionRate || 0}%` }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {statsByStatus.completed || 0} of {statsByStatus.total || 0} completed
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
