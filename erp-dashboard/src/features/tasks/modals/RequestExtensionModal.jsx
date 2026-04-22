import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import { toast } from '../../../store/toastStore.js';
import api from '../../../lib/api.js';

export default function RequestExtensionModal({ 
  isOpen, 
  onClose, 
  task, 
  onExtensionRequested 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    additionalHours: '',
    additionalMinutes: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});

  const handleClose = () => {
    setFormData({ additionalHours: '', additionalMinutes: '', reason: '' });
    setErrors({});
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};

    const hours = parseInt(formData.additionalHours) || 0;
    const minutes = parseInt(formData.additionalMinutes) || 0;

    if (hours === 0 && minutes === 0) {
      newErrors.additionalTime = 'Please enter additional time required';
    }

    if (!formData.reason?.trim()) {
      newErrors.reason = 'Please provide a reason for extension';
    } else if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        taskId: task._id,
        additionalHours: parseInt(formData.additionalHours) || 0,
        additionalMinutes: parseInt(formData.additionalMinutes) || 0,
        reason: formData.reason.trim()
      };

      const response = await api.post('/extensions/request', payload);

      toast({
        title: 'Extension requested',
        description: 'Your extension request has been sent to the assigned person',
        type: 'success'
      });

      if (onExtensionRequested) {
        onExtensionRequested(response.data);
      }

      handleClose();
    } catch (error) {
      console.error('Error requesting extension:', error);
      toast({
        title: 'Failed to request extension',
        description: error.response?.data?.message || error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const currentEstimated = `${task.estimatedHours || 0}h ${task.estimatedMinutes || 0}m`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-orange-600 dark:text-orange-400" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Request Time Extension</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Task: {task.title}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 transition-colors rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <X size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Time Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              <span className="font-semibold">Current Required Time:</span> {currentEstimated}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Additional Time */}
            <div>
              <label className="block mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                Additional Time Needed <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Hours"
                    value={formData.additionalHours}
                    onChange={(e) => setFormData({ ...formData, additionalHours: e.target.value })}
                    min="0"
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Hours</p>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Minutes (0-59)"
                    value={formData.additionalMinutes}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val > 59) val = 59;
                      if (val < 0) val = 0;
                      setFormData({ ...formData, additionalMinutes: val });
                    }}
                    min="0"
                    max="59"
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Minutes</p>
                </div>
              </div>
              {errors.additionalTime && (
                <p className="flex items-center gap-1 mt-2 text-xs text-red-500">
                  <AlertCircle size={12} /> {errors.additionalTime}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                Reason for Extension <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Explain why you need more time (minimum 10 characters)..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-lg resize-none dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-orange-200 transition ${
                  errors.reason 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-slate-200 dark:border-slate-600'
                } focus:border-orange-500`}
                rows="4"
              />
              <div className="flex justify-between mt-2">
                <div>
                  {errors.reason && (
                    <p className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle size={12} /> {errors.reason}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formData.reason.length} characters
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                ℹ️ Your extension request will be sent to <strong>the person who assigned this task</strong> for approval. They can approve or reject your request.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            onClick={handleSubmit}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                Sending...
              </>
            ) : (
              <>
                <Send size={18} />
                Send Request
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
