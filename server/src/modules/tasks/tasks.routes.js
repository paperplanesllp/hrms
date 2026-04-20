import { Router } from 'express';
import { tasksController } from './tasks.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole, ROLES } from '../../middleware/roles.js';
import { uploadDocuments } from '../../middleware/upload.js';

const router = Router();

// Protected routes - requires authentication
router.use(requireAuth);

// Diagnostic route (debug only - should be removed in production)
router.get('/debug/diagnostics', tasksController.getTasksDiagnostics);

// Analytics routes (admin/HR only)
router.get('/analytics/all', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getAllTasksAnalytics);
router.get('/analytics/team-performance', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getTeamPerformanceAnalytics);
router.get('/analytics/completion-trends', tasksController.getTaskCompletionTrends);

// My tasks routes
router.get('/my', tasksController.getMyTasks);
router.get('/my/stats', tasksController.getTaskStats);
router.get('/my/dashboard', tasksController.getDashboardTasks);

// Tasks assigned by me routes
router.get('/assigned', tasksController.getMyAssignedTasks);

// Task detail route
router.get('/:id', tasksController.getTaskById);

// Extension approval workflow routes
router.post('/request-extension', tasksController.requestTaskExtension);
router.post('/approve-extension', tasksController.approveTaskExtension);
router.post('/reject-extension', tasksController.rejectTaskExtension);

// Admin/HR only routes (before general routes to maintain priority)
// Get all tasks - admin/hr only
router.get('/', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getAllTasks);

// Create task - all authenticated users can create tasks
router.post('/', uploadDocuments.array('attachments', 10), tasksController.createTask);

// Update task - task owner/assignee/admin/hr
router.patch('/:id', uploadDocuments.array('attachments', 10), tasksController.updateTask);

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

// Check user workload
router.get('/check-workload/:userId', tasksController.checkWorkload);

// Get dashboard metrics
router.get('/dashboard/metrics', tasksController.getDashboardMetrics);

// ─── TIMER ACTION ROUTES ───────────────────────────────────────────────────────────
// Timer action routes (assignee only)
router.post('/:id/start', tasksController.startTask);
router.post('/:id/pause', tasksController.pauseTask);
router.post('/:id/resume', tasksController.resumeTask);
router.post('/:id/complete', tasksController.completeTask);
router.post('/:id/request-extension', tasksController.requestTaskExtension);
router.post('/:id/reject', tasksController.rejectTask);
router.get('/:id/analysis', tasksController.getTaskAnalysis);

// ─── TASK REMINDER ROUTES ───────────────────────────────────────────────────────────
// Get incomplete tasks summary for current user
router.get('/my/summary/incomplete', tasksController.getIncompleteSummary);

// Trigger daily reminders manually (admin/HR only)
router.post('/reminders/trigger', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.triggerDailyReminder);

// Get reminder system status (admin/HR only)
router.get('/reminders/status', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getReminderStatus);

export default router;
