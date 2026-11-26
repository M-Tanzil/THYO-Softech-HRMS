const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { requireRole } = require('../middleware/authMiddleware');
const { validateCreateAnnouncement } = require('../validators/announcementValidator');

// Read announcements (available to all active employees and administrators, filtered by audience)
router.get('/', announcementController.getAnnouncements);

// Publishing announcements (Admin only)
router.post(
  '/',
  requireRole('ADMIN'),
  validateCreateAnnouncement,
  announcementController.createAnnouncement
);

// Acknowledge announcement (All authenticated employees)
router.post('/:id/acknowledge', announcementController.acknowledgeAnnouncement);
router.patch('/:id/acknowledge', announcementController.acknowledgeAnnouncement);
router.put('/:id/acknowledge', announcementController.acknowledgeAnnouncement);

// Deleting announcements (Admin only)
router.delete( 
  '/:id',
  requireRole('ADMIN'),
  announcementController.deleteAnnouncement
);

module.exports = router;
