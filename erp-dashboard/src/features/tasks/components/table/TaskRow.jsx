import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Grip, 
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  getPriorityStyles,
  getStatusStyles,
  isTaskOverdue,
  getDaysUntilDue
} from '../../taskUtils.js';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_OPTIONS = ['new', 'pending', 'in-progress', 'on-hold', 'under-review', 'completed', 'overdue', 'cancelled'];

const TaskRow = memo(({
  task,
  onUpdate,
  onDelete,
  onSelect,
  isSelected,
  isDragging,
  onDragStart,
  onDragEnd,
  users = []
}) => {
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  // Determine background colors and styling
  const rowBg = isSelected 
    ? 'bg-indigo-50 dark:bg-indigo-950/30' 
    : isDragging 
    ? 'bg-slate-100 dark:bg-slate-800/60 opacity-50' 
    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50';

  const getCellContent = (fieldName) => {
    switch (fieldName) {
      case 'title': {
        return task.title;
      }
      case 'priority': {
        return task.priority;
      }
      case 'status': {
        return task.status;
      }
      case 'dueDate': {
        return new Date(task.dueDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: task.dueDate.split('-')[0] !== new Date().getFullYear() ? 'numeric' : undefined
        });
      }
      case 'assignedTo': {
        const assignedUser = users.find(u => u._id === task.assignedTo);
        return assignedUser ? assignedUser.firstName + ' ' + assignedUser.lastName : 'Unassigned';
      }
      default: {
        return '';
      }
    }
  };

  // Find assigned user object
  const assignedUser = users.find(u => u._id === task.assignedTo);
  const getInitials = (user) => {
    if (!user) return '?';
    return (user.firstName?.[0] || '') + (user.lastName?.[0] || '');
  };

  const handleEditStart = (field) => {
    setEditField(field);
    setEditValue(getCellContent(field));
  };

  const handleEditCancel = () => {
    setEditField(null);
    setEditValue('');
  };

  const handleEditSave = async () => {
    if (!editValue.trim()) {
      handleEditCancel();
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {};
      
      switch (editField) {
        case 'title':
          updateData.title = editValue.trim();
          break;
        case 'priority':
          updateData.priority = editValue;
          break;
        case 'status':
          updateData.status = editValue;
          break;
        case 'assignedTo':
          updateData.assignedTo = editValue;
          break;
        case 'dueDate':
          updateData.dueDate = new Date(editValue).toISOString();
          break;
        default:
          break;
      }

      console.log(`✏️ [TaskRow] Updating field "${editField}":`, updateData);
      await onUpdate(task._id, updateData);
      
      setEditField(null);
      setEditValue('');
    } catch (error) {
      console.error('❌ [TaskRow] Update failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (editField && inputRef.current) {
      inputRef.current.focus();
      if (editField === 'title') {
        inputRef.current.select();
      }
    }
  }, [editField]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Overdue indicator
  const overdue = isTaskOverdue(task.dueDate);
  const daysUntil = getDaysUntilDue(task.dueDate);
  
  const priorityStyle = getPriorityStyles(task.priority);
  const statusStyle = getStatusStyles(task.status);

  return (
    <tr
      draggable
      onDragStart={() => onDragStart(task._id)}
      onDragEnd={onDragEnd}
      className={`border-b border-slate-200 dark:border-slate-700 transition-all duration-200 ${rowBg}`}
    >
      {/* Drag Handle + Checkbox */}
      <td className="px-4 py-3 w-12">
        <div className="flex items-center gap-2">
          <button
            draggable
            onClick={() => onSelect && onSelect(task._id)}
            className={`p-2 rounded transition-colors ${
              isSelected 
                ? 'bg-indigo-500 text-white' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect && onSelect(task._id)}
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
            <Grip size={16} />
          </button>
        </div>
      </td>

      {/* Priority Badge */}
      <td className="px-4 py-3 w-28">
        {editField === 'priority' ? (
          <select
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1 rounded border-2 border-indigo-500 dark:bg-slate-800 dark:text-white focus:outline-none ${priorityStyle.bg}`}
          >
            {PRIORITY_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => handleEditStart('priority')}
            className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-md ${priorityStyle.badge}`}
            title="Click to edit priority"
          >
            {task.priority}
          </button>
        )}
      </td>

      {/* Task Title */}
      <td className="px-4 py-3 flex-1 min-w-64">
        {editField === 'title' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            placeholder="Enter task title..."
            className="w-full px-3 py-2 rounded-lg border-2 border-indigo-500 dark:bg-slate-800 dark:text-white focus:outline-none"
          />
        ) : (
          <button
            onClick={() => handleEditStart('title')}
            className="text-left w-full px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors truncate text-slate-900 dark:text-slate-100 font-medium"
            title={task.title}
          >
            {task.title}
          </button>
        )}
      </td>

      {/* Assigned User */}
      <td className="px-4 py-3 w-40">
        {editField === 'assignedTo' ? (
          <select
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 rounded border-2 border-indigo-500 dark:bg-slate-800 dark:text-white focus:outline-none"
          >
            <option value="">-- Select User --</option>
            {users.map(u => (
              <option key={u._id} value={u._id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => handleEditStart('assignedTo')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full"
            title="Click to reassign"
          >
            {assignedUser ? (
              <>
                <div className={`w-8 h-8 rounded-full ${priorityStyle.dot} text-white flex items-center justify-center text-xs font-bold`}>
                  {getInitials(assignedUser)}
                </div>
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  {assignedUser.firstName} {assignedUser.lastName}
                </span>
              </>
            ) : (
              <span className="text-sm text-red-500">Unassigned</span>
            )}
          </button>
        )}
      </td>

      {/* Status Badge */}
      <td className="px-4 py-3 w-40">
        {editField === 'status' ? (
          <select
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1 rounded border-2 border-indigo-500 dark:bg-slate-800 dark:text-white focus:outline-none ${statusStyle.bg}`}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => handleEditStart('status')}
            className={`w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-md ${statusStyle.badge}`}
            title="Click to edit status"
          >
            {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
          </button>
        )}
      </td>

      {/* Due Date with Overdue Indicator */}
      <td className="px-4 py-3 w-32">
        {editField === 'dueDate' ? (
          <input
            ref={inputRef}
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 rounded border-2 border-indigo-500 dark:bg-slate-800 dark:text-white focus:outline-none"
          />
        ) : (
          <button
            onClick={() => handleEditStart('dueDate')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full ${
              overdue 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50' 
                : daysUntil <= 2 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Click to edit due date"
          >
            <Clock size={16} />
            <span className="text-sm">
              {getCellContent('dueDate')}
              {overdue && ' ⚠️'}
            </span>
          </button>
        )}
      </td>

      {/* Progress Bar */}
      <td className="px-4 py-3 w-40">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">
            {task.progress || 0}%
          </span>
        </div>
      </td>

      {/* Reminder Icon */}
      <td className="px-4 py-3 w-12 text-center">
        {task.reminderType && task.reminderType !== 'none' && (
          <div title={`Reminder: ${task.reminderType}`} className="text-orange-500 flex justify-center">
            <Clock size={18} />
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 w-20">
        {isSaving ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : editField ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleEditSave}
              className="p-1.5 rounded text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              title="Save changes"
            >
              <Save size={16} />
            </button>
            <button
              onClick={handleEditCancel}
              className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Cancel editing"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity group">
            <button
              onClick={() => {
                if (onDelete) onDelete(task._id);
              }}
              className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});

TaskRow.displayName = 'TaskRow';

export default TaskRow;
