import React from 'react';
import { Clock, Play, CheckCircle, Pause, XCircle } from 'lucide-react';

export const statusConfig = {
  pending: {
    color: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-300 dark:border-gray-600',
    icon: Clock,
    label: 'Pending',
    dotColor: 'bg-gray-400'
  },
  'in-progress': {
    color: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: Play,
    label: 'In Progress',
    dotColor: 'bg-blue-500'
  },
  'review': {
    color: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-700',
    icon: Pause,
    label: 'Under Review',
    dotColor: 'bg-purple-500'
  },
  'on-hold': {
    color: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    icon: Pause,
    label: 'On Hold',
    dotColor: 'bg-yellow-500'
  },
  completed: {
    color: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: CheckCircle,
    label: 'Completed',
    dotColor: 'bg-green-500'
  },
  cancelled: {
    color: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: XCircle,
    label: 'Cancelled',
    dotColor: 'bg-red-500'
  }
};

export default function StatusBadge({ status = 'pending', size = 'sm', showDot = true, showLabel = true }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-2.5 text-lg'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-full border ${config.color} ${config.textColor} ${config.borderColor} font-semibold transition-all duration-200 hover:shadow-md`}>
      {showDot && <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />}
      <Icon size={size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
      {showLabel && config.label}
    </div>
  );
}
