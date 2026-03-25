import { tasksService } from './tasks.service.js';
import { sendSuccess, sendError } from '../../utils/responseHelpers.js';

export const tasksController = {
  // Get my tasks
  async getMyTasks(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        from: req.query.from,
        to: req.query.to,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 50,
        sort: req.query.sort
      };
      
      const tasks = await tasksService.getMyTasks(userId, filters);
      sendSuccess(res, tasks, 'Tasks fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get all tasks (admin/HR)
  async getAllTasks(req, res) {
    try {
      const filters = {
        status: req.query.status,
        department: req.query.department,
        priority: req.query.priority,
        search: req.query.search,
        limit: parseInt(req.query.limit) || 100
      };
      
      const tasks = await tasksService.getAllTasks(filters);
      sendSuccess(res, tasks, 'All tasks fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Create new task (admin/HR)
  async createTask(req, res) {
    try {
      const taskData = {
        title: req.body.title,
        description: req.body.description,
        dueDate: req.body.dueDate,
        priority: req.body.priority || 'MEDIUM',
        status: req.body.status || 'pending',
        assignedTo: req.body.assignedTo,
        department: req.body.department || undefined,
        progress: req.body.progress || 0,
        tags: req.body.tags || []
      };
      
      const task = await tasksService.createTask(taskData, req.user.id);
      sendSuccess(res, task, 'Task created successfully', 201);
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Update task status (self - complete/in-progress)
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const task = await tasksService.updateTaskStatus(id, req.user.id, status);
      sendSuccess(res, task, `Task updated to ${status}`);
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Update task details (admin/HR)
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const task = await tasksService.updateTask(id, req.body);
      sendSuccess(res, task, 'Task updated successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Delete task (admin/HR)
  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      await tasksService.deleteTask(id);
      sendSuccess(res, {}, 'Task deleted successfully', 200);
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get task stats for dashboard
  async getTaskStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await tasksService.getTaskStats(userId);
      sendSuccess(res, stats, 'Task stats fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get dashboard pending tasks
  async getDashboardTasks(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 5;
      const tasks = await tasksService.getDashboardTasks(userId, limit);
      sendSuccess(res, tasks, 'Dashboard tasks fetched');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get all tasks analytics (admin/HR only)
  async getAllTasksAnalytics(req, res) {
    try {
      const dateRange = req.query.dateRange || 'month';
      const analytics = await tasksService.getAllTasksAnalytics(dateRange);
      sendSuccess(res, analytics, 'Analytics fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  },

  // Get team performance analytics (admin/HR only)
  async getTeamPerformanceAnalytics(req, res) {
    try {
      const performance = await tasksService.getTeamPerformanceAnalytics();
      sendSuccess(res, performance, 'Team performance analytics fetched successfully');
    } catch (error) {
      sendError(res, error.message, 400);
    }
  }
};
