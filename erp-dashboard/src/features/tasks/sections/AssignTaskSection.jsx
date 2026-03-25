import React, { useState } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Send, User, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

export default function AssignTaskSection() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'medium',
    department: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Phase 1: Just placeholder
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Form Instruction Card */}
      <Card className="p-6 border-l-4 border-brand-accent bg-brand-accent/5 dark:bg-brand-accent/10">
        <div className="flex gap-4">
          <AlertCircle className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-sm">
              Assign New Task
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create and assign tasks to team members with clear deadlines and priority levels. Real-time notifications will be sent to assignees.
            </p>
          </div>
        </div>
      </Card>

      {/* Task Assignment Form */}
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Task Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              required
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide detailed task description..."
              rows="4"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 resize-none"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignee Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-accent" />
                Assign To *
              </label>
              <select
                name="assignee"
                value={formData.assignee}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                required
              >
                <option value="">Select team member...</option>
                <option value="sarah-johnson">Sarah Johnson</option>
                <option value="mike-davis">Mike Davis</option>
                <option value="emma-wilson">Emma Wilson</option>
                <option value="john-smith">John Smith</option>
                <option value="lisa-anderson">Lisa Anderson</option>
              </select>
            </div>

            {/* Department Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                <option value="">Select department...</option>
                <option value="engineering">Engineering</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="hr">HR</option>
              </select>
            </div>
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Due Date Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-accent" />
                Due Date *
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                required
              />
            </div>

            {/* Priority Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Priority Level
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              leftIcon={<Send className="w-4 h-4" />}
            >
              Assign Task
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
          </div>

          {/* Success Preview */}
          <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
            <div className="flex gap-3 items-start">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 mb-1">
                  Form Preview
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 text-xs">
                  Once submitted, the assignee will receive a real-time notification and can start tracking the task immediately.
                </p>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
