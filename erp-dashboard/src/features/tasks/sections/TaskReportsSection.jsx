import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { BarChart3, LineChart, PieChart, Download, Calendar, TrendingUp } from 'lucide-react';

export default function TaskReportsSection() {
  const [dateRange, setDateRange] = useState('month');

  const reports = [
    {
      icon: BarChart3,
      title: 'Task Completion Rate',
      description: 'Track completion trends over time',
      metric: '92%',
      change: '+5.2%',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: TrendingUp,
      title: 'Team Productivity',
      description: 'Team members\' average task completion',
      metric: '8.7/10',
      change: '+0.8',
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      icon: PieChart,
      title: 'Task Distribution',
      description: 'Distribution across priorities',
      metric: '3:2:1',
      change: 'High:Med:Low',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
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
        <div className="flex flex-wrap gap-2">
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
              <p className="text-xs text-slate-500 dark:text-slate-500">
                {report.description}
              </p>
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
              Completion Trend
            </h3>
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-3 h-3" />}>
              Export
            </Button>
          </div>
          
          {/* Chart Placeholder */}
          <div className="h-64 bg-gradient-to-b from-brand-accent/5 to-brand-accent/2 dark:from-brand-accent/10 dark:to-slate-900 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
            <div className="text-center">
              <LineChart className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Trend chart will render here
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
          
          {/* Chart Placeholder */}
          <div className="h-64 bg-gradient-to-b from-brand-accent/5 to-brand-accent/2 dark:from-brand-accent/10 dark:to-slate-900 rounded-lg flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Distribution chart will render here
              </p>
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
              {[
                { name: 'Sarah Johnson', completed: 28, inProgress: 3, time: '2.3 days', score: 95 },
                { name: 'Mike Davis', completed: 24, inProgress: 5, time: '2.8 days', score: 88 },
                { name: 'Emma Wilson', completed: 32, inProgress: 2, time: '1.9 days', score: 98 },
                { name: 'John Smith', completed: 19, inProgress: 6, time: '3.1 days', score: 82 },
              ].map((member, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {member.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {member.completed}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {member.inProgress}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {member.time}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-accent to-brand-accent/80"
                          style={{ width: `${member.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white min-w-8">
                        {member.score}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
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
          <Button variant="primary" size="md" leftIcon={<Download className="w-4 h-4" />}>
            Export as PDF
          </Button>
          <Button variant="secondary" size="md" leftIcon={<Download className="w-4 h-4" />}>
            Export as CSV
          </Button>
          <Button variant="secondary" size="md" leftIcon={<Download className="w-4 h-4" />}>
            Export as Excel
          </Button>
        </div>
      </Card>
    </div>
  );
}
