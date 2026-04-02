import React, { useState, useEffect } from 'react';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import { 
  Send, 
  User, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  X,
  Plus,
  Building2,
  Zap,
  Flag,
  FileText,
  Clock,
  Users,
  Loader,
  Upload,
  File,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from '../../../store/toastStore.js';
import { useAuthStore } from '../../../store/authStore.js';
import api from '../../../lib/api.js';

export default function AssignTaskSection({ onTaskCreated }) {
  const user = useAuthStore(s => s.user);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: [],
    assignedBy: user?.id, // Auto-filled with logged-in user
    department: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    dueTime: '',
    remarks: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [attachments, setAttachments] = useState([]); // File upload state
  const [submitting, setSubmitting] = useState(false); // Track submission state

  // Fetch users and departments on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersRes, deptRes] = await Promise.all([
          api.get('/users'),
          api.get('/department')
        ]);
        setUsers(usersRes.data || []);
        setDepartments(deptRes.data || []);

        // Set default date and time to today
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const timeString = today.toTimeString().slice(0, 5); // HH:MM format
        
        setFormData(prev => ({
          ...prev,
          dueDate: dateString,
          dueTime: timeString
        }));
      } catch (error) {
        console.error('Error fetching users/departments:', error);
        toast({
          title: 'Failed to load form options',
          message: error?.response?.data?.message || 'Could not load users and departments',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-populate department when first assignedTo changes
  useEffect(() => {
    const firstId = Array.isArray(formData.assignedTo) ? formData.assignedTo[0] : formData.assignedTo;
    if (firstId && users.length > 0) {
      console.log('Finding user for ID:', firstId);
      const selectedUser = users.find(u => {
        const userId = u._id?.toString() || u._id;
        const assignedId = firstId?.toString() || firstId;
        return userId === assignedId;
      });
      if (selectedUser && selectedUser.departmentId) {
        setFormData(prev => ({ ...prev, department: selectedUser.departmentId }));
        setErrors(prev => ({ ...prev, department: '' }));
      }
    }
  }, [formData.assignedTo, users]);

  // Validation rules
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (formData.description && formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters (or leave empty)';
    }

    if (!formData.assignedTo || formData.assignedTo.length === 0) {
      newErrors.assignedTo = 'Please assign the task to someone';
    }

    if (!formData.department) {
      newErrors.department = 'Please select a department';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date must be in the future';
      }
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB per file
    const maxTotalSize = 20 * 1024 * 1024; // 20MB total
    const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'pptx', 'txt', 'zip'];

    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      const isValidExt = validExtensions.includes(extension);
      const isValidSize = file.size <= maxSize;

      if (!isValidExt) {
        toast({ title: `Invalid file: ${file.name}. Supported: ${validExtensions.join(', ')}`, type: 'error' });
      }
      if (!isValidSize) {
        toast({ title: `File ${file.name} exceeds 5MB limit`, type: 'error' });
      }

      return isValidExt && isValidSize;
    });

    const newAttachments = [...attachments, ...validFiles];
    const totalSize = newAttachments.reduce((sum, f) => sum + f.size, 0);

    if (totalSize > maxTotalSize) {
      toast({ title: 'Total attachment size exceeds 20MB limit', type: 'error' });
      return;
    }

    setAttachments(newAttachments);
    e.target.value = ''; // Reset input
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Get file icon based on type
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      try {
        setSubmitting(true);
        
        // Create FormData for multipart/form-data submission (for file uploads)
        const submitFormData = new FormData();
        
        // Add task fields to FormData
        submitFormData.append('title', formData.title);
        submitFormData.append('description', formData.description);
        // Send each assignee ID separately (parsed as array on backend)
        formData.assignedTo.forEach(id => submitFormData.append('assignedTo', id));
        submitFormData.append('assignedBy', formData.assignedBy);
        submitFormData.append('department', formData.department);
        submitFormData.append('priority', formData.priority.toUpperCase());
        submitFormData.append('status', formData.status);
        submitFormData.append('dueDate', formData.dueDate);
        submitFormData.append('remarks', formData.remarks);
        
        // Add attachments to FormData
        attachments.forEach((file) => {
          submitFormData.append('attachments', file);
        });

        // Submit task to API with attachments
        await api.post('/tasks', submitFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Show success message
        toast({
          title: 'Task created successfully',
          message: `"${formData.title}" has been assigned${attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : ''}`,
          type: 'success'
        });

        setShowSuccessState(true);

        // Call the callback to refresh stats
        if (onTaskCreated) {
          onTaskCreated();
        }

        // Reset form after 2 seconds
        setTimeout(() => {
          const today = new Date();
          const dateString = today.toISOString().split('T')[0];
          const timeString = today.toTimeString().slice(0, 5);

          setFormData({
            title: '',
            description: '',
            assignedTo: [],
            assignedBy: user?.id,
            department: '',
            priority: 'medium',
            status: 'pending',
            dueDate: dateString,
            dueTime: timeString,
            remarks: '',
          });
          setErrors({});
          setTouched({});
          setShowSuccessState(false);
          setAttachments([]);
        }, 2000);
      } catch (error) {
        console.error('Error creating task:', error);
        toast({
          title: 'Failed to create task',
          message: error?.response?.data?.message || 'An error occurred while creating the task',
          type: 'error'
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      setErrors(newErrors);
      setTouched({
        title: true,
        description: true,
        assignedTo: true,
        department: true,
        dueDate: true,
        remarks: true,
      });
    }
  };

  const handleReset = () => {
    // Set reset date and time to today
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const timeString = today.toTimeString().slice(0, 5);

    setFormData({
      title: '',
      description: '',
      assignedTo: [],
      assignedBy: user?.id,
      department: '',
      priority: 'medium',
      status: 'pending',
      dueDate: dateString,
      dueTime: timeString,
      remarks: '',
    });
    setErrors({});
    setTouched({});
  };

  // Get assigned users (array) and department for preview
  const assignedUsers = users.filter(u => (formData.assignedTo || []).includes(u._id));
  const assignedByUser = users.find(u => u._id === formData.assignedBy);
  const selectedDept = departments.find(d => d._id === formData.department);

  const toggleAssignee = (userId) => {
    setFormData(prev => {
      const current = prev.assignedTo || [];
      const updated = current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId];
      return { ...prev, assignedTo: updated };
    });
    setErrors(prev => ({ ...prev, assignedTo: '' }));
  };

  // Priority colors
  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
            Assign New Task
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create and assign tasks to team members with clear deadlines and priorities
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 text-brand-accent animate-spin" />
            <p className="font-medium text-slate-600 dark:text-slate-400">Loading form options...</p>
          </div>
        </Card>
      )}

      {/* Info Card */}
      {!loading && (
        <Card className="p-6 border-l-4 border-brand-accent bg-gradient-to-r from-brand-accent/5 to-transparent dark:from-brand-accent/10">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                Task Assignment Info
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All fields marked with <span className="font-bold text-red-500">*</span> are required. Assignees will receive real-time notifications.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Form Card */}
      <Card className="p-8">
        {!showSuccessState ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Basic Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <FileText className="w-5 h-5 text-brand-accent" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Task Details
                </h3>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                  Task Title
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., Design new dashboard layout"
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      errors.title && touched.title
                        ? 'border-red-500 dark:border-red-500 focus:ring-red-500/30'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-brand-accent/30'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2`}
                  />
                  {errors.title && touched.title && (
                    <X className="absolute w-5 h-5 text-red-500 transform -translate-y-1/2 right-3 top-1/2" />
                  )}
                  {!errors.title && touched.title && formData.title && (
                    <CheckCircle className="absolute w-5 h-5 transform -translate-y-1/2 text-emerald-500 right-3 top-1/2" />
                  )}
                </div>
                {errors.title && touched.title && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Provide detailed task description and requirements..."
                  rows="4"
                  className={`w-full px-4 py-3 rounded-lg border transition-all resize-none ${
                    errors.description && touched.description
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-300 dark:border-slate-600 focus:ring-brand-accent/30'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2`}
                />
                {errors.description && touched.description && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>

            {/* Section 2: Assignment Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <User className="w-5 h-5 text-brand-accent" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Assignment
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Assigned To Field — multi-select checkboxes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                    Assign To
                    <span className="text-red-500">*</span>
                    {formData.assignedTo.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold">
                        {formData.assignedTo.length} selected
                      </span>
                    )}
                  </label>
                  <div
                    onBlur={() => setTouched(prev => ({ ...prev, assignedTo: true }))}
                    className={`w-full rounded-lg border overflow-y-auto max-h-44 transition-all ${
                      errors.assignedTo && touched.assignedTo
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-600'
                    } bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700`}
                  >
                    {users.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-400">No users available</p>
                    )}
                    {users.map(u => {
                      const checked = (formData.assignedTo || []).includes(u._id);
                      const isYou = u._id === user?.id || u._id === user?._id;
                      return (
                        <label
                          key={u._id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                            checked ? 'bg-brand-accent/5 dark:bg-brand-accent/10' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignee(u._id)}
                            className="accent-brand-accent w-4 h-4 shrink-0"
                          />
                          <span className={`text-sm ${checked ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {u.name}{isYou ? <span className="ml-1 text-xs font-bold text-brand-accent opacity-80">(you)</span> : null}
                          </span>
                          {u.role && (
                            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 shrink-0">{u.role}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {errors.assignedTo && touched.assignedTo && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.assignedTo}
                    </p>
                  )}
                </div>

                {/* Assigned By Field (Auto-filled) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                    Assigned By
                    <span className="text-xs font-normal text-blue-500">(Auto-filled)</span>
                  </label>
                  <div className="flex items-center w-full gap-2 px-4 py-3 border rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white">
                    <span>{assignedByUser?.avatar}</span>
                    <span className="font-medium">{assignedByUser?.name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Task Configuration */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <Flag className="w-5 h-5 text-brand-accent" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Configuration
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Department Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                    Department
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-3 rounded-lg border transition-all ${
                      errors.department && touched.department
                        ? 'border-red-500 dark:border-red-500 focus:ring-red-500/30'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-brand-accent/30'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 appearance-none`}
                  >
                    <option value="">Select department...</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {errors.department && touched.department && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.department}
                    </p>
                  )}
                </div>

                {/* Priority Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                    Priority Level
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border rounded-lg appearance-none border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Status Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border rounded-lg appearance-none border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                    disabled
                  >
                    <option value="pending">Pending (Default)</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Status is set to Pending by default
                  </p>
                </div>

                {/* Due Date Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                    Due Date
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute w-5 h-5 transform -translate-y-1/2 pointer-events-none text-slate-400 left-3 top-1/2" />
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-all ${
                        errors.dueDate && touched.dueDate
                          ? 'border-red-500 dark:border-red-500 focus:ring-red-500/30'
                          : 'border-slate-300 dark:border-slate-600 focus:ring-brand-accent/30'
                      } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.dueDate && touched.dueDate && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.dueDate}
                    </p>
                  )}
                </div>

                {/* Due Time Field */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1">
                    Due Time
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute w-5 h-5 transform -translate-y-1/2 pointer-events-none text-slate-400 left-3 top-1/2" />
                    <input
                      type="time"
                      name="dueTime"
                      value={formData.dueTime}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="w-full py-3 pl-10 pr-4 transition-all bg-white border rounded-lg border-slate-300 dark:border-slate-600 focus:ring-brand-accent/30 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Additional Notes */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <FileText className="w-5 h-5 text-brand-accent" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Additional Information
                </h3>
              </div>

              {/* Remarks Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                  Remarks / Notes
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Add any additional remarks, context, or attachments information..."
                  rows="3"
                  className="w-full px-4 py-3 transition-all bg-white border rounded-lg resize-none border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Attach Files / Images
                </label>
                <div className="p-6 text-center transition-colors border-2 border-dashed rounded-lg cursor-pointer border-slate-300 dark:border-slate-600 hover:border-brand-accent/50">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.pptx,.txt,.zip"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          Click to upload or drag and drop
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, PPTX, TXT, ZIP (Max 5MB per file, 20MB total)
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Attached Files List */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold tracking-wide uppercase text-slate-600 dark:text-slate-400">
                      {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
                    </p>
                    <div className="space-y-2 overflow-y-auto max-h-48">
                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 transition-colors border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center flex-1 min-w-0 gap-3">
                            {getFileIcon(file.name)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-slate-900 dark:text-white">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="flex-shrink-0 p-1 ml-2 transition-colors text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Summary Preview */}
            {formData.title && (
              <Card className="p-6 border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-brand-accent" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Form Summary
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-slate-600 dark:text-slate-400">Task Title</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{formData.title}</p>
                    </div>
                    
                    {assignedUser && (
                      <div>
                        <p className="mb-1 text-slate-600 dark:text-slate-400">Assigned To</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{assignedUser.name}</p>
                      </div>
                    )}

                    {selectedDept && (
                      <div>
                        <p className="mb-1 text-slate-600 dark:text-slate-400">Department</p>
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${selectedDept.color}`}>
                          {selectedDept.name}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="mb-1 text-slate-600 dark:text-slate-400">Priority</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(formData.priority)}`}>
                        {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                      </div>
                    </div>

                    {formData.dueDate && (
                      <div>
                        <p className="mb-1 text-slate-600 dark:text-slate-400">Due Date</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {new Date(formData.dueDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                leftIcon={submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                disabled={submitting || loading}
              >
                {submitting ? 'Creating Task...' : 'Assign Task'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleReset}
                disabled={submitting}
              >
                Clear Form
              </Button>
            </div>
          </form>
        ) : (
          // Success State
          <div className="py-12 space-y-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 animate-bounce">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                Task Assigned Successfully!
              </h3>
              <p className="mb-1 text-slate-600 dark:text-slate-400">
                {formData.title}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                has been assigned to {assignedUser?.name}
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time notification sent to the assignee
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resetting form...
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Info Cards at Bottom */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5 border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800/50">
          <div className="flex gap-3">
            <Clock className="flex-shrink-0 w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="text-sm">
              <p className="mb-1 font-semibold text-blue-900 dark:text-blue-200">
                Real-time Updates
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Assignees receive live notifications
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:border-purple-800/50">
          <div className="flex gap-3">
            <Users className="flex-shrink-0 w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div className="text-sm">
              <p className="mb-1 font-semibold text-purple-900 dark:text-purple-200">
                Team Management
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Organize tasks by department
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50">
          <div className="flex gap-3">
            <Zap className="flex-shrink-0 w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div className="text-sm">
              <p className="mb-1 font-semibold text-emerald-900 dark:text-emerald-200">
                Priority Tracking
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Set and track task priorities
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
