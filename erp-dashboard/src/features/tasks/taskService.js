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
  }
};