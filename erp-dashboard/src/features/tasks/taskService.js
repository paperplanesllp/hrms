import api from '../../lib/api.js';

export const taskService = {
  // Fetch my tasks
  async getMyTasks(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.search) params.search = filters.search;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sort) params.sort = filters.sort;

    const res = await api.get('/tasks/my', { params });
    return res.data.data || res.data || [];
  },

  // Fetch all tasks (admin/hr only)
  async getAllTasks(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.department) params.department = filters.department;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    if (filters.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters.limit) params.limit = filters.limit;

    const res = await api.get('/tasks', { params });
    return res.data.data || res.data || [];
  },

  // Fetch task stats for dashboard
  async getMyTaskStats() {
    const res = await api.get('/tasks/my/stats');
    return res.data.data || res.data || {};
  },

  // Fetch dashboard tasks (recent pending/in-progress)
  async getDashboardTasks(limit = 5) {
    const res = await api.get('/tasks/my/dashboard', { params: { limit } });
    return res.data.data || res.data || [];
  },

  // Create new task
  async createTask(taskData) {
    const res = await api.post('/tasks', taskData);
    return res.data.data || res.data;
  },

  // Update task status
  async updateTaskStatus(taskId, status) {
    const res = await api.patch(`/tasks/${taskId}/status`, { status });
    return res.data.data || res.data;
  },

  // Update task
  async updateTask(taskId, taskData) {
    const res = await api.patch(`/tasks/${taskId}`, taskData);
    return res.data.data || res.data;
  },

  // Delete task
  async deleteTask(taskId) {
    const res = await api.delete(`/tasks/${taskId}`);
    return res.data;
  },

  // Fetch single task
  async getTaskById(taskId) {
    const res = await api.get(`/tasks/${taskId}`);
    return res.data.data || res.data;
  }
};
