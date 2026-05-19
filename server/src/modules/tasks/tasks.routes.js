import { Router } from 'express';
import { tasksController } from './tasks.controller.js';
import { taskExecutionController } from './taskExecution.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole, ROLES } from '../../middleware/roles.js';
import rateLimit from 'express-rate-limit';
import { uploadTaskAttachmentsMiddleware } from './taskAttachment.middleware.js';

const router = Router();
const taskAttachmentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Protected routes - requires authentication
router.use(requireAuth);

// Diagnostic route (debug only - should be removed in production)
router.get('/debug/diagnostics', tasksController.getTasksDiagnostics);

// Analytics routes (all employees can view)
router.get('/analytics/all', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getAllTasksAnalytics);
router.get('/analytics/team-performance', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getTeamPerformanceAnalytics);
router.get('/analytics/completion-trends', tasksController.getTaskCompletionTrends);
router.get('/analytics/completion-trend', tasksController.getTaskCompletionTrends);
router.get('/analytics/export/pdf', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.exportTaskAnalyticsPdf);

// My tasks routes
router.get('/my', tasksController.getMyTasks);
router.get('/my/stats', tasksController.getTaskStats);
router.get('/my/dashboard', tasksController.getDashboardTasks);

// Tasks assigned by me routes
router.get('/assigned', tasksController.getMyAssignedTasks);

router.get('/:id/attachments/:attachmentId/access', tasksController.getAttachmentAccess);
router.delete('/:id/attachments/:attachmentId', tasksController.deleteAttachment);

// Task detail route
router.get('/:id', tasksController.getTaskById);

// Extension workflow routes
router.post('/request-extension', tasksController.requestTaskExtension);
// Only the task assigner (or admin/HR) can approve/reject – the controller also validates this internally
router.post('/approve-extension', tasksController.approveTaskExtension);
router.post('/reject-extension', tasksController.rejectTaskExtension);

// Get all tasks - all authenticated users
router.get('/', tasksController.getAllTasks);

// Create task - all authenticated users can create tasks
router.post('/', taskAttachmentRateLimit, uploadTaskAttachmentsMiddleware.array('attachments', 12), tasksController.createTask);

// Update task - task owner/assignee/admin/hr
router.patch('/:id', taskAttachmentRateLimit, uploadTaskAttachmentsMiddleware.array('attachments', 12), tasksController.updateTask);

// Delete task - admin/hr or task owner/assignee (permission validated in controller)
router.delete('/:id', tasksController.deleteTask);

// Update task status - self or admin/hr
router.patch('/:id/status', tasksController.updateTaskStatus);

// ─── WORKFLOW MANAGEMENT ───────────────────────────────────────────────────────────
// Hold task
router.put('/:id/hold', tasksController.holdTask);

// Resume task from hold
router.put('/:id/resume-hold', tasksController.resumeTaskFromHold);

// Reassign task
router.put('/:id/reassign', tasksController.reassignTask);

// Get task timeline (activity history)
router.get('/:id/timeline', tasksController.getTaskTimeline);

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
router.get('/:id/comments', tasksController.getComments);
router.post('/:id/comments', tasksController.addComment);
router.delete('/:id/comments/:commentId', tasksController.deleteComment);

// ─── REOPEN ───────────────────────────────────────────────────────────────────
router.post('/:id/reopen', tasksController.reopenTask);

// Check user workload
router.get('/check-workload/:userId', tasksController.checkWorkload);

// Get dashboard metrics
router.get('/dashboard/metrics', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getDashboardMetrics);

// ─── TIMER ACTION ROUTES ───────────────────────────────────────────────────────────
// Timer action routes (assignee only)
router.post('/:id/start', tasksController.startTask);
router.post('/:id/pause', tasksController.pauseTask);
router.post('/:id/resume', tasksController.resumeTask);
router.post('/:id/complete', tasksController.completeTask);
router.post('/:id/block', taskExecutionController.blockTask);
router.post('/:id/unblock/:blockerId', taskExecutionController.unblockTask);
router.post('/:id/send-for-review', taskExecutionController.sendForReview);
router.get('/:id/execution-details', taskExecutionController.getExecutionDetails);
router.post('/:id/request-extension', tasksController.requestTaskExtension);
router.post('/:id/reject', tasksController.rejectTask);
router.get('/:id/analysis', tasksController.getTaskAnalysis);
router.get('/:id/history', tasksController.getTaskTimeline);

// ─── TASK REMINDER ROUTES ───────────────────────────────────────────────────────────
// Get incomplete tasks summary for current user
router.get('/my/summary/incomplete', tasksController.getIncompleteSummary);

// Trigger daily reminders manually (admin/HR only)
router.post('/reminders/trigger', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.triggerDailyReminder);

// Get reminder system status (admin/HR only)
router.get('/reminders/status', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getReminderStatus);

export default router;
