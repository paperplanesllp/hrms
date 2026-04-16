import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Loader } from 'lucide-react';
import { taskService } from '../taskService.js';
import api from '../../../lib/api.js';
import { toast } from '../../../store/toastStore.js';
import { getSocket } from '../../../lib/socket.js';
import TimerChip from '../components/TimerChip.jsx';
import { useCountdownTimer } from '../hooks/useTaskTimer.js';
import { calculateRemainingTime, formatToIST } from '../utils/taskDeadlineUtils.js';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Target, 
  Zap, 
  Calendar,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';

function RecentTaskActivityRow({ activity, getActivityColor, getActivityLabel }) {
  const countdown = useCountdownTimer(activity || {});
  const remaining = calculateRemainingTime(activity || {});
  const effectiveDueAt = remaining.effectiveDueAt || activity?.dueAt || activity?.dueDate;

  return (
    <div
      className="flex items-start gap-4 p-4 transition-colors rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
    >
      <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 text-lg transition-transform rounded-full bg-slate-200 dark:bg-slate-700 group-hover:scale-110">
        {activity.avatar || '🗂️'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="font-medium truncate text-slate-900 dark:text-white">
              {activity.title}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activity.person || activity.assignedBy?.name || 'Task update'}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getActivityColor(activity.type)}`}>
            {getActivityLabel(activity.type)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            {activity.time || 'Live'}
          </p>
          <TimerChip countdown={countdown} isPaused={activity.isPaused} dueTooltip={`Due: ${formatToIST(effectiveDueAt)}`} />
        </div>
      </div>
    </div>
  );
}

export default function TasksOverviewSection({ onCreateTask, onViewAnalytics }) {
  const [stats, setStats] = useState({
    byStatus: { pending: 0, 'in-progress': 0, completed: 0, 'on-hold': 0, cancelled: 0, total: 0 },
    byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
    overdue: 0,
    completionRate: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [teamStatus, setTeamStatus] = useState({
    totalMembers: 0,
    activeMembers: 0,
    capacityUsed: 0,
    projectsOnTrack: 0,
    totalProjects: 0
  });

  // Fetch functions wrapped in useCallback to avoid infinite loops
  const fetchStats = useCallback(async () => {
    try {
      const data = await taskService.getMyTaskStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({ title: 'Error loading statistics', type: 'error' });
    }
  }, []);

  const fetchRecentTasks = useCallback(async () => {
    try {
      const tasks = await taskService.getDashboardTasks(5);
      setRecentTasks(tasks);
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
    }
  }, []);

  const fetchTeamStatus = useCallback(async () => {
    try {
      const response = await api.get('/tasks/team-status');
      const data = response.data?.data || response.data;
      setTeamStatus({
        totalMembers: data.totalMembers || 0,
        activeMembers: data.activeMembers || 0,
        capacityUsed: data.capacityUsed || 0,
        projectsOnTrack: data.projectsOnTrack || 0,
        totalProjects: data.totalProjects || 0
      });
    } catch (error) {
      console.error('Error fetching team status:', error);
      // Set reasonable defaults if API not available
      setTeamStatus({
        totalMembers: 0,
        activeMembers: 0,
        capacityUsed: 0,
        projectsOnTrack: 0,
        totalProjects: 0
      });
    }
  }, []);

  // Fetch stats, recent tasks, and team status on mount
  useEffect(() => {
    const timerId = setTimeout(() => {
      fetchStats();
      fetchRecentTasks();
      fetchTeamStatus();
    }, 0);

    return () => clearTimeout(timerId);
  }, [fetchStats, fetchRecentTasks, fetchTeamStatus]);

  // Setup real-time socket listeners for task updates
  useEffect(() => {
    console.log('🔌 [Overview] Setting up socket listeners');
    const socket = getSocket();
    
    if (!socket) {
      console.warn('⚠️ [Overview] Socket not available');
      return;
    }

    // Handle task events - refresh stats and recent tasks
    const handleTaskEventWithRefresh = () => {
      console.log('📡 [Overview] Task event received, refreshing stats');
      // Refresh stats and recent tasks after a short delay to ensure backend has updated
      setTimeout(() => {
        fetchStats();
        fetchRecentTasks();
      }, 300);
    };

    // Register socket listeners
    socket.on('task:created', handleTaskEventWithRefresh);
    socket.on('task:updated', handleTaskEventWithRefresh);
    socket.on('task:status-changed', handleTaskEventWithRefresh);
    socket.on('task:deleted', handleTaskEventWithRefresh);

    // Cleanup: Remove listeners when component unmounts
    return () => {
      console.log('🔌 [Overview] Cleaning up socket listeners');
      socket.off('task:created', handleTaskEventWithRefresh);
      socket.off('task:updated', handleTaskEventWithRefresh);
      socket.off('task:status-changed', handleTaskEventWithRefresh);
      socket.off('task:deleted', handleTaskEventWithRefresh);
    };
  }, [fetchStats, fetchRecentTasks]);

  // Summary stats based on real data
  const summaryStats = [
    {
      id: 'total',
      label: 'Total Tasks',
      value: stats.byStatus.total.toString(),
      subtext: 'All tasks assigned to you',
      icon: Target,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: stats.byStatus.pending.toString(),
      subtext: 'Waiting to be started',
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'inprogress',
      label: 'In Progress',
      value: stats.byStatus['in-progress'].toString(),
      subtext: 'Currently being worked on',
      icon: Activity,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats.byStatus.completed.toString(),
      subtext: 'Successfully finished',
      icon: CheckCircle,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: stats.overdue.toString(),
      subtext: 'Past due date',
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-600 dark:text-red-400',
    },
  ];

  const getActivityColor = (type) => {
    const colors = {
      completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      assigned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      updated: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    };
    return colors[type] || colors.updated;
  };

  const getActivityLabel = (type) => {
    const labels = {
      completed: '✓ Completed',
      assigned: '→ Assigned',
      updated: '○ Updated',
      overdue: '! Overdue',
    };
    return labels[type] || 'Update';
  };

  // Performance insights based on stats
  const quickInsights = [
    {
      label: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      positive: stats.completionRate >= 70,
      change: stats.completionRate >= 70 ? '+5%' : '-3%',
    },
    {
      label: 'On Track',
      value: `${stats.byStatus['in-progress']}`,
      icon: Zap,
      positive: true,
      change: 'improving',
    },
    {
      label: 'Completion Goal',
      value: `${Math.round((stats.byStatus.completed / (stats.byStatus.total || 1)) * 100)}%`,
      icon: Target,
      positive: (stats.byStatus.completed / (stats.byStatus.total || 1)) >= 0.7,
      change: 'avg: 65%',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ==== HERO SECTION ==== */}
      <Card className="relative p-8 overflow-hidden md:p-10 border-brand-accent/10 dark:border-brand-accent/20 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-brand-accent/5 dark:bg-brand-accent/10 blur-3xl -z-0" />
        
        <div className="relative z-10 grid items-start gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-accent/10 dark:bg-brand-accent/20 border border-brand-accent/20 dark:border-brand-accent/30">
                <Sparkles className="w-4 h-4 text-brand-accent" />
                <span className="text-xs font-semibold text-brand-accent">Today's Overview</span>
              </div>
              <h2 className="text-4xl font-bold leading-tight md:text-5xl text-slate-900 dark:text-white">
                Task Management
              </h2>
              <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Track team productivity, monitor deadlines, and ensure project success with real-time insights.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button 
                variant="primary" 
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={onCreateTask}
              >
                Create Task
              </Button>
              <Button 
                variant="secondary" 
                size="md"
                leftIcon={<BarChart3 className="w-4 h-4" />}
                onClick={onViewAnalytics}
              >
                View Analytics
              </Button>
            </div>
          </div>

          {/* Decorative stats preview */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border rounded-lg bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 backdrop-blur">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.byStatus.total}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Total Tasks</div>
              </div>
              <div className="p-4 border rounded-lg bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 backdrop-blur">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.byStatus.completed}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ==== SUMMARY STATS CARDS ==== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.id}
              className={`p-6 transition-all duration-300 hover:shadow-lg group cursor-pointer ${stat.bgColor}`}
              interactive
            >
              <div className="space-y-4">
                {/* Icon Container */}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Label */}
                <div>
                  <p className="text-xs font-medium tracking-wide uppercase text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </p>
                </div>

                {/* Value */}
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {stat.value}
                    </div>
                  </div>
                </div>

                {/* Subtext with trend */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className={`text-xs font-semibold ${stat.textColor}`}>
                    {stat.subtext}
                  </span>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className={`w-4 h-4 ${stat.textColor}`} />
                  ) : (
                    <ArrowDownRight className={`w-4 h-4 ${stat.textColor}`} />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ==== MAIN CONTENT GRID ==== */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <Activity className="w-5 h-5 text-brand-accent" />
                Recent Activity
              </h3>
              <button className="flex items-center gap-1 text-sm font-semibold transition-colors text-brand-accent hover:text-brand-accent/80">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {recentTasks.map((activity) => (
                <RecentTaskActivityRow
                  key={activity.id || activity._id}
                  activity={activity}
                  getActivityColor={getActivityColor}
                  getActivityLabel={getActivityLabel}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Quick Insights */}
        <div className="space-y-6">
          {/* Performance Insights */}
          <Card className="p-6">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-slate-900 dark:text-white">
              <Target className="w-5 h-5 text-brand-accent" />
              Performance
            </h3>

            <div className="space-y-4">
              {quickInsights.map((insight, idx) => {
                const InsightIcon = insight.icon;
                return (
                  <div key={idx} className="p-3 transition-colors rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <InsightIcon className="w-4 h-4 text-brand-accent" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {insight.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {insight.value}
                      </div>
                      <span className={`text-xs font-semibold flex items-center gap-1 ${insight.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {insight.positive ? '↑' : '↓'} {insight.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Team Quick Stats */}
          <Card className="p-6 bg-gradient-to-br from-brand-accent/5 to-brand-accent/2 dark:from-brand-accent/10 dark:to-brand-accent/5">
            <div className="flex items-start justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-brand-accent" />
                Team Status
              </h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Team Members</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {teamStatus.activeMembers || 0}/{teamStatus.totalMembers || 0} Active
                  </span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all" 
                    style={{ width: teamStatus.totalMembers > 0 ? `${(teamStatus.activeMembers / teamStatus.totalMembers) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Capacity</span>
                  <span className="font-bold text-slate-900 dark:text-white">{teamStatus.capacityUsed || 0}%</span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/80 transition-all" 
                    style={{ width: `${Math.min(teamStatus.capacityUsed || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Projects on Track</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {teamStatus.projectsOnTrack || 0}/{teamStatus.totalProjects || 0}
                  </span>
                </div>
                <div className="w-full h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div 
                    className="h-full rounded-full bg-amber-500 transition-all" 
                    style={{ width: teamStatus.totalProjects > 0 ? `${(teamStatus.projectsOnTrack / teamStatus.totalProjects) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ==== ANALYTICS PREVIEW SECTION ==== */}
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <BarChart3 className="w-5 h-5 text-brand-accent" />
            Task Completion Trend
          </h3>
          <select className="px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white hover:border-brand-accent dark:hover:border-brand-accent">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>

        {/* Chart Placeholder */}
        <div className="flex items-center justify-center transition-colors border border-dashed h-72 bg-gradient-to-b from-brand-accent/5 via-brand-accent/2 to-brand-accent/1 dark:from-brand-accent/10 dark:via-brand-accent/5 dark:to-slate-900 rounded-xl border-slate-300 dark:border-slate-700 hover:border-brand-accent/50 dark:hover:border-brand-accent/30">
          <div className="space-y-3 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 opacity-40" />
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                Analytics Chart Coming Soon
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Real-time data visualization will appear here in Phase 3
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
