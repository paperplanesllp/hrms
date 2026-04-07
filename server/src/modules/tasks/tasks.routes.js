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

// My tasks routes
router.get('/my', tasksController.getMyTasks);
router.get('/my/stats', tasksController.getTaskStats);
router.get('/my/dashboard', tasksController.getDashboardTasks);

// Tasks assigned by me routes
router.get('/assigned', tasksController.getMyAssignedTasks);

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
router.get('/:id/analysis', tasksController.getTaskAnalysis);

export default router;
