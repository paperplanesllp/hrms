import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  getPriorityStyles,
} from './taskUtils.js';

export default function TaskForm({
  task = null,
  users = [],
  departments = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  isPersonalTask = true
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    department: '',
    dueDate: '',
    priority: 'MEDIUM',
    status: 'pending',
    progress: 0,
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  // Initialize form with task data if editing
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        department: task.department?._id || task.department || '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        priority: task.priority || 'MEDIUM',
        status: task.status || 'pending',
        progress: task.progress || 0,
        tags: task.tags || []
      });
    }
  }, [task]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (form.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    // Only require assignedTo for admin task management (not personal tasks)
    if (!isPersonalTask && !form.assignedTo) {
      newErrors.assignedTo = 'Please assign the task to a user';
    }

    if (!form.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    const dueDate = new Date(form.dueDate);
    if (dueDate < new Date() && !task) {
      newErrors.dueDate = 'Due date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      progress: parseInt(form.progress) || 0
    };

    if (!submitData.department) {
      delete submitData.department;
    }

    onSubmit(submitData);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({
        ...form,
        tags: [...form.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setForm({
      ...form,
      tags: form.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const assignedUser = users.find(u => u._id === form.assignedTo);
  const priorityStyle = getPriorityStyles(form.priority);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Task Title *
        </label>
        <Input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Enter task title"
          error={errors.title}
          className="w-full"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Enter task description (optional)"
          rows="4"
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Priority *
          </label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PRIORITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Priority Preview */}
          <div className={`mt-2 p-2 rounded-lg ${priorityStyle.bg}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${priorityStyle.dot}`}></span>
              <span className={`text-xs font-semibold ${priorityStyle.text}`}>
                {PRIORITY_OPTIONS.find(o => o.value === form.priority)?.label}
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Assign To */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Assign To *
          </label>
          <select
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select user...</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          {errors.assignedTo && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.assignedTo}</p>
          )}
          {assignedUser && (
            <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Assigned to: <strong>{assignedUser.name}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Department
          </label>
          <select
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No department</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Due Date *
          </label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            error={errors.dueDate}
          />
          {errors.dueDate && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.dueDate}</p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Progress
          </label>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {form.progress}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={form.progress}
          onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Remarks
        </label>
        <div className="flex gap-2 mb-2">
          <Input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag(e)}
            placeholder="Add tag and press Enter"
            className="flex-1"
          />
          <Button onClick={handleAddTag} variant="outline">
            Add
          </Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map((tag, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-sm"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
