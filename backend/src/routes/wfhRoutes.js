const express = require('express');
const router = express.Router();
const wfhController = require('../controllers/wfhController');
const { requireRole } = require('../middleware/authMiddleware');
const { validateCreateWfh, validateReviewWfh } = require('../validators/wfhValidator');

// Employee applies for WFH
router.post('/', validateCreateWfh, wfhController.createRequest);

// WFH Stats
router.get('/stats', wfhController.getStats);

// Employee's own requests
router.get('/my', wfhController.getMyRequests);

// List requests (auto-scoped by role)
router.get('/', wfhController.getRequests);

// Single request detail
router.get('/:id', wfhController.getRequestById);

// Manager / Admin review (Approve / Reject)
router.patch(
  '/:id/review',
  requireRole('ADMIN', 'MANAGER'),
  validateReviewWfh,
  wfhController.reviewRequest
);
router.put(
  '/:id/review',
  requireRole('ADMIN', 'MANAGER'),
  validateReviewWfh,
  wfhController.reviewRequest
);

// Employee cancels own pending request
router.patch('/:id/cancel', wfhController.cancelRequest);
router.put('/:id/cancel', wfhController.cancelRequest);

module.exports = router;
