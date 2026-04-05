import express from 'express';
import { tasksController } from './tasks.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

/**
 * Task CRUD Operations
 */

// Get my tasks (assigned to me)
router.get('/my', authMiddleware, tasksController.getMyTasks);

// Get tasks assigned by me
router.get('/assigned', authMiddleware, tasksController.getMyAssignedTasks);

// Get all tasks (admin/HR)
router.get('/', authMiddleware, tasksController.getAllTasks);

// Get task by ID
router.get('/:id', authMiddleware, tasksController.getTaskById);

// Get task statistics
router.get('/my/stats', authMiddleware, tasksController.getMyTaskStats);

// Create new task
router.post('/', authMiddleware, tasksController.createTask);

// Update task
router.put('/:id', authMiddleware, tasksController.updateTask);

// Delete task (soft delete)
router.delete('/:id', authMiddleware, tasksController.deleteTask);

/**
 * Task Status Operations
 */

// Update task status
router.patch('/:id/status', authMiddleware, tasksController.updateTaskStatus);

// Mark task as complete
router.patch('/:id/complete', authMiddleware, tasksController.completeTask);

// Accept task (assignee accepts the task)
router.patch('/:id/accept', authMiddleware, tasksController.acceptTask);

// Reject task (assignee rejects the task)
router.patch('/:id/reject', authMiddleware, tasksController.rejectTask);

// Put task on hold
router.patch('/:id/hold', authMiddleware, tasksController.holdTask);

/**
 * Task Movement Operations
 */

// Forward task
router.post('/:id/forward', authMiddleware, tasksController.forwardTask);

// Reassign task
router.post('/:id/reassign', authMiddleware, tasksController.reassignTask);

/**
 * Task Progress & Comments
 */

// Update task progress
router.patch('/:id/progress', authMiddleware, tasksController.updateProgress);

// Add comment
router.post('/:id/comments', authMiddleware, tasksController.addComment);

// Get comments for task
router.get('/:id/comments', authMiddleware, tasksController.getComments);

// Delete comment
router.delete('/:id/comments/:commentId', authMiddleware, tasksController.deleteComment);

/**
 * Task Attachments
 */

// Upload attachment
router.post('/:id/attachments', authMiddleware, tasksController.uploadAttachment);

// Delete attachment
router.delete('/:id/attachments/:attachmentId', authMiddleware, tasksController.deleteAttachment);

/**
 * Task History & Analytics
 */

// Get task history
router.get('/:id/history', authMiddleware, tasksController.getTaskHistory);

// Get task timeline
router.get('/:id/timeline', authMiddleware, tasksController.getTaskTimeline);

/**
 * Department Tasks
 */

// Get department tasks
router.get('/department/:departmentId', authMiddleware, tasksController.getDepartmentTasks);

/**
 * Analytics & Reports
 */

// Get employee productivity
router.get('/analytics/productivity/:userId', authMiddleware, tasksController.getEmployeeProductivity);

// Get productivity dashboard
router.get('/analytics/dashboard', authMiddleware, tasksController.getProductivityDashboard);

// Get workload analysis
router.get('/analytics/workload', authMiddleware, tasksController.getWorkloadAnalysis);

// Detect overloaded employees
router.get('/analytics/overloaded-employees', authMiddleware, tasksController.getOverloadedEmployees);

/**
 * Task Templates & Recurring
 */

// Create recurring task
router.post('/recurring', authMiddleware, tasksController.createRecurringTask);

// Get recurring tasks
router.get('/recurring', authMiddleware, tasksController.getRecurringTasks);

/**
 * AI Features
 */

// Generate tasks from text (meeting notes, etc.)
router.post('/ai/generate-from-text', authMiddleware, tasksController.generateTasksFromText);

// Generate tasks from email
router.post('/ai/generate-from-email', authMiddleware, tasksController.generateTasksFromEmail);

// Get task suggestions for user
router.get('/ai/suggestions', authMiddleware, tasksController.getTaskSuggestions);

// Get suggestions by type
router.get('/ai/suggestions/:type', authMiddleware, tasksController.getSuggestionsByType);

// Accept AI suggestion and create task
router.post('/ai/suggestions/:id/accept', authMiddleware, tasksController.acceptAISuggestion);

// Predict deadline for task
router.post('/ai/predict-deadline', authMiddleware, tasksController.predictDeadline);

// Break down task into subtasks (AI)
router.post('/:id/ai/breakdown', authMiddleware, tasksController.breakdownTaskIntoSubtasks);

// Get subtasks
router.get('/:id/ai/subtasks', authMiddleware, tasksController.getSubtasks);

// Update subtask
router.patch('/:id/ai/subtasks/:subTaskId', authMiddleware, tasksController.updateSubtask);

// Complete subtask
router.patch('/:id/ai/subtasks/:subTaskId/complete', authMiddleware, tasksController.completeSubtask);

// Delete subtask
router.delete('/:id/ai/subtasks/:subTaskId', authMiddleware, tasksController.deleteSubtask);

export const tasksRoutes = router;
