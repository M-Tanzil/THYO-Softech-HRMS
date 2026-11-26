const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { requireRole } = require('../middleware/authMiddleware');
const {
  validateCreateLeaveRequest,
  validateReviewLeaveRequest
} = require('../validators/leaveValidator');

// 1. Leave Types Catalog & Management
router.get('/types', leaveController.getLeaveTypes);
router.post('/types', requireRole('ADMIN'), leaveController.createLeaveType);
router.put('/types/:id', requireRole('ADMIN'), leaveController.updateLeaveType);
router.delete('/types/:id', requireRole('ADMIN'), leaveController.deleteLeaveType);

// 2. Employee Leave Balances
router.get('/balances', leaveController.getLeaveBalances);

// 3. Leave Overview Statistics
router.get('/stats', leaveController.getStats);

// 4. Employee applies for leave
router.post('/', validateCreateLeaveRequest, leaveController.createRequest);

// 5. Employee's personal leave requests history
router.get('/my', leaveController.getMyRequests);

// 6. Organization / Department Leave Requests (Scoped by RBAC)
router.get('/', leaveController.getRequests);

// 7. Single leave request details
router.get('/:id', leaveController.getRequestById);

// 8. Manager / Admin review (Approve / Reject)
router.patch(
  '/:id/review',
  requireRole('ADMIN', 'MANAGER'),
  validateReviewLeaveRequest,
  leaveController.reviewRequest
);
router.put(
  '/:id/review',
  requireRole('ADMIN', 'MANAGER'),
  validateReviewLeaveRequest,
  leaveController.reviewRequest
);

// 9. Employee cancels own pending leave request
router.patch('/:id/cancel', leaveController.cancelRequest);
router.put('/:id/cancel', leaveController.cancelRequest);

module.exports = router;
