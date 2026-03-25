import React from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { TrendingUp, BarChart3, PieChart, Target, Zap, Calendar } from 'lucide-react';

export default function TasksOverviewSection() {
  // Premium placeholder metrics
  const metrics = [
    {
      icon: Target,
      title: 'Team Performance',
      value: '94%',
      description: 'Tasks completed on time',
      trend: '+2.5%',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: TrendingUp,
      title: 'Productivity Index',
      value: '8.7/10',
      description: 'Team average score',
      trend: '+0.3pts',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Zap,
      title: 'Priority Tasks',
      value: '12',
      description: 'Urgent tasks pending',
      trend: '-3 from last week',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Calendar,
      title: 'Upcoming Deadlines',
      value: '8',
      description: 'Next 7 days',
      trend: 'On schedule',
      color: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Overview Header Card */}
      <Card className="p-8 border-brand-accent/10 dark:border-brand-accent/20 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800/50">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Task Overview
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Get a comprehensive view of all ongoing tasks, team performance metrics, and upcoming deadlines. Track progress in real-time and identify bottlenecks.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="md">
                View Detailed Analytics
              </Button>
              <Button variant="secondary" size="md">
                Download Report
              </Button>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center w-32 h-32 bg-brand-accent/10 dark:bg-brand-accent/5 rounded-2xl">
            <BarChart3 className="w-16 h-16 text-brand-accent opacity-50" />
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={idx}
              className="p-7 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              interactive
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 bg-gradient-to-br ${metric.color} rounded-lg shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  {metric.trend}
                </div>
              </div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                {metric.title}
              </h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
                {metric.value}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {metric.description}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Activity Chart Placeholder */}
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-accent" />
            Activity Timeline
          </h3>
          <select className="text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        
        {/* Chart Placeholder */}
        <div className="h-64 bg-gradient-to-b from-brand-accent/5 to-brand-accent/2 dark:from-brand-accent/10 dark:to-slate-900 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Chart data will be rendered here
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
