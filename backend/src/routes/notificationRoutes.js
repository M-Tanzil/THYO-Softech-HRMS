const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { validatePreferences } = require('../validators/notificationValidator');

// GET unread notifications count fast endpoint
router.get('/unread-count', notificationController.getUnreadCount);

// GET all notifications for the authenticated employee
router.get('/', notificationController.getNotifications);

// Create notification
router.post('/', notificationController.createNotification);

// Mark single notification as read
router.patch('/:id/read', notificationController.markAsRead);
router.put('/:id/read', notificationController.markAsRead);

// Delete single notification
router.delete('/:id', notificationController.deleteNotification);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);
router.put('/read-all', notificationController.markAllAsRead);

// Preferences
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', validatePreferences, notificationController.updatePreferences);
router.patch('/preferences', validatePreferences, notificationController.updatePreferences);

module.exports = router;
