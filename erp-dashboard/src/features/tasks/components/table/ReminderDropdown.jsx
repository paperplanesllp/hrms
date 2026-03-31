import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, X } from 'lucide-react';

const ReminderDropdown = ({ 
  taskId, 
  currentReminder = {}, 
  onReminderChange,
  isLoading = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(currentReminder.reminderType || 'none');
  const containerRef = useRef(null);

  const reminderOptions = [
    { value: 'none', label: 'No Reminder', icon: 'none' },
    { value: '1h', label: '1 Hour Before', icon: 'clock' },
    { value: '1d', label: '1 Day Before', icon: 'clock' },
    { value: '2d', label: '2 Days Before', icon: 'clock' }
  ];

  const getLabel = (value) => {
    return reminderOptions.find(r => r.value === value)?.label || 'No Reminder';
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReminderChange = async (value) => {
    setSelectedType(value);
    
    let reminderTime = null;
    if (value !== 'none') {
      const now = new Date();
      reminderTime = new Date(now.getTime() + getRemindSeconds(value) * 1000);
    }
    
    const reminderData = {
      reminderType: value,
      reminderTime
    };

    console.log(`🔔 [ReminderDropdown] Setting reminder for task ${taskId}:`, reminderData);
    
    try {
      await onReminderChange(taskId, reminderData);
      setIsOpen(false);
    } catch (error) {
      console.error('❌ [ReminderDropdown] Failed to set reminder:', error);
      setSelectedType(currentReminder.reminderType || 'none');
    }
  };

  const getRemindSeconds = (type) => {
    switch (type) {
      case '1h':
        return 60 * 60;
      case '1d':
        return 24 * 60 * 60;
      case '2d':
        return 2 * 24 * 60 * 60;
      default:
        return 0;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
          selectedType === 'none'
            ? 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
            : 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Set task reminder"
      >
        <Clock size={16} />
        <span className="text-sm">{getLabel(selectedType)}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg w-56">
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1">
              SELECT REMINDER TIME
            </p>
            
            {reminderOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleReminderChange(option.value)}
                disabled={isLoading}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                  selectedType === option.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {selectedType === option.value && (
                  <Check size={16} className="text-indigo-600 dark:text-indigo-400" />
                )}
                {selectedType !== option.value && (
                  <div className="w-4" />
                )}
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          {currentReminder.reminderTime && (
            <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reminder set for: <br />
                <strong>{new Date(currentReminder.reminderTime).toLocaleString()}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReminderDropdown;
