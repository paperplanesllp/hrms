import React from 'react';

const PriorityBadge = ({ priority, size = 'sm' }) => {
  const getPriorityStyles = (priority) => {
    const styles = {
      low: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        border: 'border-green-300 dark:border-green-700',
        label: 'Low'
      },
      medium: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        label: 'Medium'
      },
      high: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-300 dark:border-orange-700',
        label: 'High'
      },
      urgent: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-300 dark:border-red-700',
        label: 'Urgent'
      }
    };
    return styles[priority?.toLowerCase()] || styles.medium;
  };

  const styles = getPriorityStyles(priority);
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded-full font-semibold border ${styles.bg} ${styles.text} ${styles.border}`}>
      {styles.label}
    </span>
  );
};

export default PriorityBadge;