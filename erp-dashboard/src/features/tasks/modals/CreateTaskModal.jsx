import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, FileText, Image, File, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import { toast } from '../../../store/toastStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import api from '../../../lib/api.js';
import { PRIORITY_OPTIONS } from '../taskUtils.js';

const PRIORITY_COLORS = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated, users = [], departments = [] }) {
  const currentUser = useAuthStore(s => s.user);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Set default due date to today
  const getDefaultDueDate = () => {
    const now = new Date();
    return now.toISOString().slice(0, 10); // Format: YYYY-MM-DD
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'pending',
    dueDate: getDefaultDueDate(),
    estimatedHours: '',
    estimatedMinutes: '',
    assignedTo: '',
    department: '',
    tags: [],
    subtasks: [],
    remarks: ''
  });

  const [errors, setErrors] = useState({});

  // Auto-fill department when employee is selected
  const handleAssigneeChange = (userId) => {
    setFormData({ ...formData, assignedTo: userId });
    
    const selectedUser = users.find(u => u._id === userId);
    if (selectedUser && selectedUser.department) {
      const deptId = typeof selectedUser.department === 'object' ? selectedUser.department._id : selectedUser.department;
      setFormData(prev => ({ ...prev, department: deptId }));
      console.log('✅ [Modal] Department auto-filled:', deptId);
    }
  };

  // Handle tag input
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Handle subtask input
  const handleAddSubtask = () => {
    if (subtaskInput.trim()) {
      const newSubtask = {
        id: Date.now(),
        title: subtaskInput.trim(),
        completed: false
      };
      setSubtasks([...subtasks, newSubtask]);
      setFormData({
        ...formData,
        subtasks: [...subtasks, newSubtask]
      });
      setSubtaskInput('');
    }
  };

  const handleRemoveSubtask = (id) => {
    const updated = subtasks.filter(st => st.id !== id);
    setSubtasks(updated);
    setFormData({ ...formData, subtasks: updated });
  };

  // Drag and drop handling
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword'];
    
    Array.from(files).forEach((file) => {
      if (allowedTypes.includes(file.type) && file.size <= 5 * 1024 * 1024) {
        setUploadedFiles([...uploadedFiles, { name: file.name, size: file.size, type: file.type }]);
      } else {
        toast({
          title: 'Invalid file',
          description: 'Only PDF, images, Excel, and Word files up to 5MB are allowed',
          type: 'error'
        });
      }
    });
  };

  const handleRemoveFile = (fileName) => {
    setUploadedFiles(uploadedFiles.filter(f => f.name !== fileName));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Please assign the task to someone';
    }

    // Validate remarks for completed tasks
    if (formData.status === 'completed') {
      const remarksText = formData.remarks.trim();
      if (!remarksText) {
        newErrors.remarks = 'Remarks are required when marking task as completed';
      } else {
        const wordCount = remarksText.split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount < 25) {
          newErrors.remarks = `Remarks must contain at least 25 words (current: ${wordCount} words)`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      LOW: '',
      MEDIUM: '',
      HIGH: '',
      CRITICAL: ''
    };
    return icons[priority] || '';
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return <FileText size={16} />;
    if (fileType.includes('image')) return <Image size={16} />;
    return <File size={16} />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 [CreateTaskModal] Form submitted');
    console.log('📝 [CreateTaskModal] Form data:', formData);

    if (!validateForm()) {
      console.warn('❌ [CreateTaskModal] Validation failed');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 [CreateTaskModal] Sending POST request to /tasks');

      const hours = formData.estimatedHours ? parseInt(formData.estimatedHours) : 0;
      const minutes = formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : 0;
      const totalMinutes = hours * 60 + minutes;

      // Set due date to end of office day (18:00 local time) instead of midnight UTC
      const dueDateWithTime = formData.dueDate
        ? new Date(`${formData.dueDate}T18:00:00`).toISOString()
        : undefined;

      const taskPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        status: formData.status,
        dueDate: dueDateWithTime,
        estimatedHours: hours,
        estimatedMinutes: minutes,
        estimatedTotalMinutes: totalMinutes,
        assignedTo: formData.assignedTo,
        department: formData.department || undefined,
        tags: formData.tags,
        subtasks: subtasks,
        assignedBy: currentUser?.id,
        createdAt: new Date(),
        attachments: uploadedFiles.map(f => f.name),
        ...(formData.status === 'completed' && { completionRemarks: formData.remarks.trim() })
      };

      console.log('📋 [CreateTaskModal] Task payload:', taskPayload);

      const response = await api.post('/tasks', taskPayload);

      console.log('✅ [CreateTaskModal] Task created successfully:', response.data);
      toast({
        title: 'Task created successfully',
        description: `"${formData.title}" has been assigned to the team`,
        type: 'success'
      });

      // Reset form
      const defaultDate = (() => {
        const now = new Date();
        return now.toISOString().slice(0, 10);
      })();
      
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'pending',
        dueDate: defaultDate,
        estimatedHours: '',
        estimatedMinutes: '',
        assignedTo: '',
        department: '',
        tags: [],
        subtasks: [],
        remarks: ''
      });
      setUploadedFiles([]);
      setSubtasks([]);
      setTagInput('');
      setSubtaskInput('');
      setShowPreview(false);
      setErrors({});

      // Call callback to refresh list
      if (onTaskCreated) {
        onTaskCreated(response.data);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('❌ [CreateTaskModal] Error creating task:', error);
      console.error('❌ [CreateTaskModal] Error response:', error.response?.data);
      
      toast({
        title: 'Failed to create task',
        description: error.response?.data?.message || error.message,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Ensure current user is always in the list
  const usersForDropdown = (users.length > 0 ? users : []).filter(u => 
    !u.name?.includes('Voice Call Test') && !u.name?.includes('Debug User')
  );
  const currentUserExists = usersForDropdown.some(u => u._id === currentUser?.id || u._id === currentUser?._id);
  
  // If current user not in list, add them at the top
  if (currentUser && !currentUserExists) {
    usersForDropdown.unshift({
      _id: currentUser.id || currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      department: currentUser.department
    });
  }

  // Get selected assignee info
  const selectedAssignee = usersForDropdown.find(u => u._id === formData.assignedTo);
  const selectedDept = departments.find(d => d._id === formData.department);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-xl bg-white shadow-2xl dark:bg-slate-800 overflow-hidden flex flex-col">
        {/* Premium Header with Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Task</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Organize your team's work with detailed task management</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 transition-colors rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              <X size={24} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Row 1: Title & Priority */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter task title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2.5 border-2 rounded-lg transition ${
                    errors.title 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-slate-200 dark:border-slate-600'
                  } dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                />
                {errors.title && <p className="flex items-center gap-1 mt-1 text-xs text-red-500"><AlertCircle size={12} /> {errors.title}</p>}
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {getPriorityIcon(opt.value)} {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Description */}
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                placeholder="Describe your task in detail..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 transition border-2 rounded-lg resize-none border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                rows="4"
              />
            </div>

            {/* Row 3: Due Date & Estimated Time */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                  }}
                  className={`w-full px-4 py-2.5 border-2 rounded-lg transition ${
                    errors.dueDate 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-slate-200 dark:border-slate-600'
                  } dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                />
                {errors.dueDate && <p className="flex items-center gap-1 mt-1 text-xs text-red-500"><AlertCircle size={12} /> {errors.dueDate}</p>}
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Required Time
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Hours (e.g., 2)"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                      min="0"
                      className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Hours</p>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Minutes (0-59)"
                      value={formData.estimatedMinutes}
                      onChange={(e) => {
                        let val = parseInt(e.target.value) || 0;
                        if (val > 59) val = 59;
                        if (val < 0) val = 0;
                        setFormData({ ...formData, estimatedMinutes: val })
                      }}
                      min="0"
                      max="59"
                      className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Minutes</p>
                  </div>
                </div>
                {formData.estimatedHours || formData.estimatedMinutes ? (
                  <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    ⏱️ Required: {formData.estimatedHours || 0}h {formData.estimatedMinutes || 0}m
                  </p>
                ) : null}
              </div>
            </div>

            {/* Row 4: Assign To, Department, Status */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className={`w-full px-4 py-2.5 border-2 rounded-lg transition dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                    errors.assignedTo 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-slate-200 dark:border-slate-600'
                  }`}
                >
                  <option value="">Select a user...</option>
                  {usersForDropdown.map((u) => {
                    const isYou = u._id === currentUser?.id || u._id === currentUser?._id;
                    return (
                      <option key={u._id} value={u._id}>
                        👤 {u.name || u.email}{isYou ? ' (you)' : ''}
                      </option>
                    );
                  })}
                </select>
                {errors.assignedTo && <p className="flex items-center gap-1 mt-1 text-xs text-red-500"><AlertCircle size={12} /> {errors.assignedTo}</p>}
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Department {selectedDept && '✓'}
                </label>
                <Input
                  type="text"
                  placeholder="Auto-filled"
                  value={selectedDept?.name || ''}
                  disabled
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white bg-slate-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 4.5: Conditional Remarks Field for Completed Tasks */}
            {formData.status === 'completed' && (
              <div className="p-4 border-2 rounded-lg border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
                <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Completion Remarks <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    (Minimum 25 words required)
                  </span>
                </label>
                <textarea
                  placeholder="Please provide completion details, outcomes, challenges faced, and any notes about the task completion... (minimum 25 words)"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className={`w-full px-4 py-3 transition border-2 rounded-lg resize-none dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-200 ${
                    errors.remarks 
                      ? 'border-red-500 dark:border-red-400' 
                      : 'border-slate-300 dark:border-slate-600'
                  } focus:border-blue-500`}
                  rows="4"
                />
                <div className="flex justify-between mt-2">
                  <div>
                    {errors.remarks && (
                      <p className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle size={12} /> {errors.remarks}
                      </p>
                    )}
                  </div>
                  <div className="text-xs font-medium">
                    {formData.remarks.trim() ? (
                      <span className={formData.remarks.trim().split(/\s+/).filter(w => w.length > 0).length >= 25 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-orange-600 dark:text-orange-400'
                      }>
                        {formData.remarks.trim().split(/\s+/).filter(w => w.length > 0).length} / 25 words
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">0 / 25 words</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Row 5: Remarks */}
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                Remarks <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              <div className="flex gap-2 mb-3">
                <Input
                  type="text"
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Plus size={18} /> Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                    >
                      🏷️ {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 7: File Upload */}
            <div>
              <label className="block mb-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                Attachments <span className="text-xs font-normal text-slate-400">(Optional)</span>
              </label>
              
              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50'
                }`}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.doc,.docx"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <Upload size={32} className="text-blue-500" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-semibold">Drag files here or click to browse</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">PDF, Images, Excel, Word (Max 5MB)</p>
                  </div>
                </label>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between px-3 py-2 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        {getFileIcon(file.type)}
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-green-600 dark:text-green-400">({(file.size / 1024).toFixed(1)}KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task Preview */}
            {showPreview && (
              <div className="p-4 border-2 border-blue-200 rounded-lg dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Preview</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Title:</span> {formData.title}</p>
                  <p><span className="font-semibold">Assigned To:</span> {selectedAssignee?.name || 'Not selected'}</p>
                  <p><span className="font-semibold">Priority:</span> <span className={`px-2 py-1 rounded text-xs font-bold ${PRIORITY_COLORS[formData.priority]}`}>{getPriorityIcon(formData.priority)} {formData.priority}</span></p>
                  <p><span className="font-semibold">Due Date:</span> {formData.dueDate || 'Not set'}</p>
                  <p><span className="font-semibold">Required Time:</span> {formData.estimatedHours || '0'}h {formData.estimatedMinutes || '0'}m</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Premium Footer */}
        <div className="flex items-center justify-between gap-3 px-8 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-sm font-medium transition rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              onClick={handleSubmit}
              className="min-w-[180px] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
