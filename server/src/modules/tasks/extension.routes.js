import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { extensionController } from './extension.controller.js';

const router = express.Router();

// Request extension (assigned user can request)
router.post('/request', requireAuth, extensionController.requestExtension);

// Approve extension (only task assigner can approve)
router.put('/:extensionId/approve', requireAuth, extensionController.approveExtension);

// Reject extension (only task assigner can reject)
router.put('/:extensionId/reject', requireAuth, extensionController.rejectExtension);

// Get pending extension requests for current user to approve (task assigners only)
router.get('/pending-approvals', requireAuth, extensionController.getPendingForApproval);

// Get all extension requests for viewing (HR/Admin/Assigners for reporting)
router.get('/all', requireAuth, extensionController.getAllExtensionRequests);

// Get my extension requests (both requested and assigned)
router.get('/my-requests', requireAuth, extensionController.getMyExtensionRequests);

export default router;
