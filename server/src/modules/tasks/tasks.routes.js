import { Router } from 'express';
import { tasksController } from './tasks.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole, ROLES } from '../../middleware/roles.js';

const router = Router();

// Protected routes - requires authentication
router.use(requireAuth);

// My tasks routes
router.get('/my', tasksController.getMyTasks);
router.get('/my/stats', tasksController.getTaskStats);
router.get('/my/dashboard', tasksController.getDashboardTasks);

// Admin/HR only routes (before general routes to maintain priority)
// Get all tasks - admin/hr only
router.get('/', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.getAllTasks);

// Create task - admin/hr only
router.post('/', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.createTask);

// Update task - admin/hr only
router.patch('/:id', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.updateTask);

// Delete task - admin/hr only
router.delete('/:id', requireRole([ROLES.ADMIN, ROLES.HR]), tasksController.deleteTask);

// Update task status - self or admin/hr
router.patch('/:id/status', tasksController.updateTaskStatus);

export default router;
