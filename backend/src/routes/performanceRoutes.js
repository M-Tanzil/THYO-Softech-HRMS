const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');
const { requireRole } = require('../middleware/authMiddleware');

// ============================================================================
// 1. CYCLES
// ============================================================================
router.get('/cycles', performanceController.getCycles);
router.get('/cycles/:id', performanceController.getCycleById);
router.post(
  '/cycles',
  requireRole('ADMIN'),
  performanceController.createCycle
);
router.put(
  '/cycles/:id',
  requireRole('ADMIN'),
  performanceController.updateCycle
);
router.patch(
  '/cycles/:id',
  requireRole('ADMIN'),
  performanceController.updateCycle
);

// ============================================================================
// 2. GOALS & PROGRESS
// ============================================================================
router.get('/goals', performanceController.getGoals);
router.post('/goals', performanceController.createGoal);
router.patch('/goals/:id/progress', performanceController.updateGoalProgress);
router.put('/goals/:id/progress', performanceController.updateGoalProgress);
router.patch('/goals/:id/status', performanceController.updateGoalStatus);
router.patch('/goals/:id', performanceController.updateGoal);
router.put('/goals/:id', performanceController.updateGoal);
router.delete('/goals/:id', performanceController.deleteGoal);

// ============================================================================
// 3. REVIEWS
// ============================================================================
router.get('/reviews', performanceController.getReviews);
router.get('/reviews/:id', performanceController.getReviewById);
router.post('/reviews/self', performanceController.submitSelfReview);
router.patch(
  '/reviews/:id/evaluate',
  requireRole('ADMIN', 'MANAGER'),
  performanceController.submitManagerReview
);
router.put(
  '/reviews/:id/evaluate',
  requireRole('ADMIN', 'MANAGER'),
  performanceController.submitManagerReview
);
router.post(
  '/reviews/:id',
  requireRole('ADMIN', 'MANAGER'),
  performanceController.submitAppraisalReview
);
router.patch('/reviews/:id/acknowledge', performanceController.acknowledgeReview);
router.put('/reviews/:id/acknowledge', performanceController.acknowledgeReview);

// ============================================================================
// 4. CONTINUOUS FEEDBACK & KUDOS
// ============================================================================
router.get('/feedback', performanceController.getFeedbacks);
router.post('/feedback', performanceController.createFeedback);
router.patch('/feedback/:id/like', performanceController.toggleFeedbackLike);
router.post('/feedback/:id/like', performanceController.toggleFeedbackLike);

module.exports = router;
