import React, { useState } from 'react';
import { X, AlertCircle, Calendar, Clock, User, FileText, Flag, CheckCircle2, Zap, BarChart3, MessageCircle } from 'lucide-react';

export default function TaskAnalysisModal({ task, onClose, onStatusChange, isLoading = false }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!task) return null;

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'blocked': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || colors['pending'];
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': 'bg-gradient-to-r from-red-500 to-red-600',
      'HIGH': 'bg-gradient-to-r from-orange-500 to-orange-600',
      'MEDIUM': 'bg-gradient-to-r from-amber-500 to-amber-600',
      'LOW': 'bg-gradient-to-r from-blue-500 to-blue-600'
    };
    return colors[priority] || colors['LOW'];
  };

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const daysLeft = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
    { id: 'timeline', label: 'Activity', icon: <Clock className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container - Animated */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header - Premium Design */}
        <div className={`${getPriorityColor(task.priority)} p-6 text-white relative overflow-hidden`}>
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16"></div>

          <div className="relative z-10 flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                  {task.status.toUpperCase().replace('-', ' ')}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">{task.title}</h2>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-4 text-sm text-white/90">
            {task.assignedTo && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{Array.isArray(task.assignedTo) ? task.assignedTo.map(a => a?.name).join(', ') : task.assignedTo?.name}</span>
              </div>
            )}
            <div className={`flex items-center gap-2 ${isOverdue ? 'font-bold' : ''}`}>
              <Calendar className="w-4 h-4" />
              <span>{isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}</span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-4 font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'border-b-2 border-brand-accent text-brand-accent'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-4">
                {/* Status Card */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">STATUS</p>
                  <p className={`text-lg font-bold ${getStatusColor(task.status)}`}>
                    {task.status.toUpperCase()}
                  </p>
                </div>

                {/* Priority Card */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">PRIORITY</p>
                  <p className={`text-lg font-bold ${getPriorityColor(task.priority).replace('bg-gradient', 'text')}`}>
                    {task.priority}
                  </p>
                </div>

                {/* Due Date Card */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">DUE DATE</p>
                  <p className={`text-lg font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                </div>

                {/* Days Left Card */}
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">TIME LEFT</p>
                  <p className={`text-lg font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : daysLeft <= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft} days`}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              {task.status !== 'completed' && (
                <div className="mt-4 p-4 rounded-lg bg-brand-accent/10 border border-brand-accent/20">
                  <button
                    onClick={() => onStatusChange(task._id, 'completed')}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark as Completed
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {task.description && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-accent" />
                    Description
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                </div>
              )}

              {task.department && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Department</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{task.department?.name || 'N/A'}</p>
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {task.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-brand-accent hover:text-brand-accent/80 truncate"
                      >
                        📎 {attachment.name || `File ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Created</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">{new Date(task.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {task.updatedAt !== task.createdAt && (
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                      <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-900 dark:text-purple-300">Last Updated</p>
                      <p className="text-xs text-purple-700 dark:text-purple-400">{new Date(task.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
