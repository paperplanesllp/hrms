import api from "../../lib/api.js";

const normalizeResponse = (res) => res?.data?.data || res?.data || null;

export const taskService = {
  async getMyTasks(filters = {}) {
    const params = {};

    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.search) params.search = filters.search;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sort) params.sort = filters.sort;

    const res = await api.get("/tasks/my", { params });
    return normalizeResponse(res) || [];
  },

  async getAllTasks(filters = {}) {
    const params = {};

    if (filters.status) params.status = filters.status;
    if (filters.department) params.department = filters.department;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    if (filters.assignedTo) params.assignedTo = filters.assignedTo;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sort) params.sort = filters.sort;

    const res = await api.get("/tasks", { params });
    return normalizeResponse(res) || [];
  },

  async getMyAssignedTasks(filters = {}) {
    const params = {};

    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.search) params.search = filters.search;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sort) params.sort = filters.sort;

    const res = await api.get("/tasks/assigned", { params });
    return normalizeResponse(res) || [];
  },

  /**
   * Get all my tasks including:
   * - Tasks assigned to me by others
   * - Tasks I assigned to myself (created for myself)
   * Removes duplicates and merges results
   */
  async getMyAllTasks(filters = {}) {
    try {
      const params = {};

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.search) params.search = filters.search;
      if (filters.limit) params.limit = filters.limit;
      if (filters.sort) params.sort = filters.sort;
      
      // Add flag to include self-assigned tasks
      params.includeSelfAssigned = true;

      const res = await api.get("/tasks/my", { params });
      return normalizeResponse(res) || [];
    } catch (err) {
      console.error('Error fetching all my tasks:', err);
      return [];
    }
  },

  async getMyTaskStats() {
    const res = await api.get("/tasks/my/stats");
    return normalizeResponse(res) || {};
  },

  async getDashboardTasks(limit = 5) {
    const res = await api.get("/tasks/my/dashboard", { params: { limit } });
    return normalizeResponse(res) || [];
  },

  async createTask(taskData) {
    const res = await api.post("/tasks", taskData);
    return normalizeResponse(res);
  },

  async updateTaskStatus(taskId, status) {
    const res = await api.patch(`/tasks/${taskId}/status`, { status });
    return normalizeResponse(res);
  },

  async updateTask(taskId, taskData) {
    const res = await api.patch(`/tasks/${taskId}`, taskData);
    return normalizeResponse(res);
  },

  async deleteTask(taskId) {
    const res = await api.delete(`/tasks/${taskId}`);
    return normalizeResponse(res);
  },

  async getTaskById(taskId) {
    const res = await api.get(`/tasks/${taskId}`);
    return normalizeResponse(res);
  },

  async addComment(taskId, text) {
    const res = await api.post(`/tasks/${taskId}/comments`, { text });
    return normalizeResponse(res);
  },

  async getComments(taskId) {
    const res = await api.get(`/tasks/${taskId}/comments`);
    return normalizeResponse(res) || [];
  },

  async deleteComment(taskId, commentId) {
    const res = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return normalizeResponse(res);
  },

  // ─── Timer Actions ────────────────────────────────────────────────────────

  async startTask(taskId) {
    const res = await api.post(`/tasks/${taskId}/start`);
    return normalizeResponse(res);
  },

  async pauseTask(taskId, reason) {
    const res = await api.post(`/tasks/${taskId}/pause`, { reason });
    return normalizeResponse(res);
  },

  async resumeTask(taskId) {
    const res = await api.post(`/tasks/${taskId}/resume`);
    return normalizeResponse(res);
  },

  async completeTask(taskId, completionRemark = '') {
    const res = await api.post(`/tasks/${taskId}/complete`, { 
      completionRemark: completionRemark.trim() 
    });
    return normalizeResponse(res);
  },

  // ─── Premium Execution Tracking (NEW) ────────────────────────────────────

  async blockTask(taskId, reason) {
    const res = await api.post(`/tasks/${taskId}/block`, { reason });
    return normalizeResponse(res);
  },

  async unblockTask(taskId, blockerId) {
    const res = await api.post(`/tasks/${taskId}/unblock/${blockerId}`);
    return normalizeResponse(res);
  },

  async sendForReview(taskId) {
    const res = await api.post(`/tasks/${taskId}/send-for-review`);
    return normalizeResponse(res);
  },

  async reopenTask(taskId, reason = '') {
    const res = await api.post(`/tasks/${taskId}/reopen`, { reason });
    return normalizeResponse(res);
  },

  async getExecutionDetails(taskId) {
    const res = await api.get(`/tasks/${taskId}/execution-details`);
    return normalizeResponse(res);
  },

  async requestTaskExtension(taskId, payload) {
    const res = await api.post('/tasks/request-extension', { taskId, ...payload });
    return normalizeResponse(res);
  },

  async approveTaskExtension(taskId, requestId) {
    const res = await api.post('/tasks/approve-extension', { taskId, requestId });
    return normalizeResponse(res);
  },

  async rejectTaskExtension(taskId, requestId, rejectionReason) {
    const res = await api.post('/tasks/reject-extension', { taskId, requestId, rejectionReason });
    return normalizeResponse(res);
  },

  async rejectTask(taskId, rejectionReason) {
    const res = await api.post(`/tasks/${taskId}/reject`, { rejectionReason });
    return normalizeResponse(res);
  },

  async getTaskAnalysis(taskId) {
    const res = await api.get(`/tasks/${taskId}/analysis`);
    return normalizeResponse(res);
  },

  // ─── Workflow Methods ────────────────────────────────────────────────────────────

  async holdTask(taskId, reason) {
    const res = await api.put(`/tasks/${taskId}/hold`, { reason });
    return normalizeResponse(res);
  },

  async resumeTaskFromHold(taskId) {
    const res = await api.put(`/tasks/${taskId}/resume-hold`);
    return normalizeResponse(res);
  },

  async reassignTask(taskId, newAssigneeId, reason) {
    const res = await api.put(`/tasks/${taskId}/reassign`, { newAssigneeId, reason });
    return normalizeResponse(res);
  },

  async getTaskTimeline(taskId) {
    const res = await api.get(`/tasks/${taskId}/timeline`);
    return normalizeResponse(res);
  },

  async checkWorkload(userId) {
    const res = await api.get(`/tasks/check-workload/${userId}`);
    return normalizeResponse(res);
  },

  async getDashboardMetrics() {
    const res = await api.get('/tasks/dashboard/metrics');
    return normalizeResponse(res);
  },

  async getTaskCompletionTrends(days = 7) {
    const res = await api.get('/tasks/analytics/completion-trends', {
      params: { days }
    });
    return normalizeResponse(res);
  }
};