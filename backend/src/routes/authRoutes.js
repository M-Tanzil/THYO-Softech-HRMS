const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Public authentication endpoint
router.post('/login', authController.login);

// Development dashboard session route (no passwords, authenticates real DB employee)
router.post('/dev-session', authController.devSession);

// Protected session check
router.get('/me', authenticateUser, authController.me);

// Logout endpoint
router.post('/logout', authenticateUser, authController.logout);

module.exports = router;
