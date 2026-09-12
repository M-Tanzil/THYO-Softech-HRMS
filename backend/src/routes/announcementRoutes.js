const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { requireRole } = require('../middleware/authMiddleware');
const { validateAnnouncement } = require('../middleware/validation');

// Read announcements (available to all active employees and administrators)
router.get('/', announcementController.getAnnouncements);

// Publishing announcements (strictly Admin / HR / Manager)
router.post(
  '/',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  validateAnnouncement,
  announcementController.createAnnouncement
);

// Deleting announcements (strictly Admin / HR / Manager)
router.delete(
  '/:id',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  announcementController.deleteAnnouncement
);

module.exports = router;
