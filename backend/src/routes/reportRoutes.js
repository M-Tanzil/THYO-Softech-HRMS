const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireRole } = require('../middleware/authMiddleware');

// Task Reports are strictly restricted to Administrative / Management personnel
router.get('/', requireRole('ADMIN', 'HR', 'MANAGER'), reportController.getReports);
router.get('/export', requireRole('ADMIN', 'HR', 'MANAGER'), reportController.exportCsv);

module.exports = router;
