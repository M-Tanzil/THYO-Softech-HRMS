const express = require('express');
const router = express.Router();
const recruitmentController = require('../controllers/recruitmentController');
const { requireRole } = require('../middleware/authMiddleware');

// ============================================================================
// 1. REQUISITIONS
// ============================================================================
router.get('/requisitions', requireRole('ADMIN', 'MANAGER'), recruitmentController.getRequisitions);
router.get('/requisitions/:id', requireRole('ADMIN', 'MANAGER'), recruitmentController.getRequisitionById);
router.post(
  '/requisitions',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.createRequisition
);
router.patch(
  '/requisitions/:id',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.updateRequisition
);
router.put(
  '/requisitions/:id',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.updateRequisition
);
router.patch(
  '/requisitions/:id/approve',
  requireRole('ADMIN'),
  recruitmentController.approveRequisition
);
router.put(
  '/requisitions/:id/approve',
  requireRole('ADMIN'),
  recruitmentController.approveRequisition
);
router.patch(
  '/requisitions/:id/reject',
  requireRole('ADMIN'),
  recruitmentController.rejectRequisition
);
router.put(
  '/requisitions/:id/reject',
  requireRole('ADMIN'),
  recruitmentController.rejectRequisition
);

// ============================================================================
// 2. JOB POSTINGS (Accessible as /jobs and /postings)
// ============================================================================
router.get('/jobs', recruitmentController.getJobPostings);
router.get('/postings', recruitmentController.getJobPostings);
router.get('/jobs/:id', recruitmentController.getJobPostingById);
router.get('/postings/:id', recruitmentController.getJobPostingById);
router.post(
  '/jobs',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.createJobPosting
);
router.post(
  '/postings',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.createJobPosting
);
router.put(
  '/jobs/:id',
  requireRole('ADMIN'),
  recruitmentController.updateJobPosting
);
router.put(
  '/postings/:id',
  requireRole('ADMIN'),
  recruitmentController.updateJobPosting
);
router.patch(
  '/jobs/:id',
  requireRole('ADMIN'),
  recruitmentController.updateJobPosting
);
router.patch(
  '/postings/:id',
  requireRole('ADMIN'),
  recruitmentController.updateJobPosting
);
router.patch(
  '/jobs/:id/publish',
  requireRole('ADMIN'),
  recruitmentController.togglePublishPosting
);
router.patch(
  '/postings/:id/publish',
  requireRole('ADMIN'),
  recruitmentController.togglePublishPosting
);
router.patch(
  '/postings/:id/toggle-publish',
  requireRole('ADMIN'),
  recruitmentController.togglePublishPosting
);

// ============================================================================
// 3. CANDIDATES & APPLICATIONS
// ============================================================================
router.get('/candidates', requireRole('ADMIN', 'MANAGER'), recruitmentController.getCandidates);
router.get('/candidates/:id', requireRole('ADMIN', 'MANAGER'), recruitmentController.getCandidateById);
router.post(
  '/candidates',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.createCandidate
);
router.patch(
  '/candidates/:id/stage',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.advanceCandidateStage
);
router.patch(
  '/candidates/:id/advance-stage',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.advanceCandidateStage
);
router.patch(
  '/candidates/:id/reject',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.rejectCandidate
);

router.get('/applications', requireRole('ADMIN', 'MANAGER'), recruitmentController.getApplications);
router.get('/applications/:id', requireRole('ADMIN', 'MANAGER'), recruitmentController.getApplicationById);
router.post('/apply', recruitmentController.createCandidate); // Public/Candidate apply

// ============================================================================
// 4. SCREENING SCORECARDS
// ============================================================================
router.get('/screening', requireRole('ADMIN', 'MANAGER'), recruitmentController.getScreeningNotes);
router.post(
  '/screening',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.saveScreeningScorecard
);

// ============================================================================
// 5. INTERVIEWS
// ============================================================================
router.get('/interviews', requireRole('ADMIN', 'MANAGER'), recruitmentController.getInterviews);
router.post(
  '/interviews',
  requireRole('ADMIN', 'MANAGER'),
  recruitmentController.scheduleInterview
);
router.patch('/interviews/:id/feedback', requireRole('ADMIN', 'MANAGER'), recruitmentController.submitInterviewFeedback);
router.put('/interviews/:id/feedback', requireRole('ADMIN', 'MANAGER'), recruitmentController.submitInterviewFeedback);
router.post('/interviews/:id/feedback', requireRole('ADMIN', 'MANAGER'), recruitmentController.submitInterviewFeedback);

// ============================================================================
// 6. OFFERS & HIRING
// ============================================================================
router.get('/offers', requireRole('ADMIN'), recruitmentController.getOffers);
router.post(
  '/offers',
  requireRole('ADMIN'),
  recruitmentController.createOffer
);
router.patch(
  '/offers/:id/accept',
  requireRole('ADMIN'),
  recruitmentController.acceptOffer
);
router.put(
  '/offers/:id/accept',
  requireRole('ADMIN'),
  recruitmentController.acceptOffer
);
router.patch(
  '/offers/:id/reject',
  requireRole('ADMIN'),
  recruitmentController.rejectOffer
);
router.put(
  '/offers/:id/reject',
  requireRole('ADMIN'),
  recruitmentController.rejectOffer
);

router.get('/hired', requireRole('ADMIN'), recruitmentController.getHiredEmployees);
router.post(
  '/hire',
  requireRole('ADMIN'),
  recruitmentController.hireCandidate
);

module.exports = router;
