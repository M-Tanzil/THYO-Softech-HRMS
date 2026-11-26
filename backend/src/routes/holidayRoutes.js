const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const { requireRole } = require('../middleware/authMiddleware');
const { validateHoliday, validateUpdateHoliday } = require('../validators/holidayValidator');

// Read Holidays - Available to all authenticated employees
router.get('/', holidayController.getHolidays);
router.get('/:id', holidayController.getHolidayById);

// Create Holiday - Admin only
router.post(
  '/',
  requireRole('ADMIN'),
  validateHoliday,
  holidayController.createHoliday
);

// Update Holiday - Admin only
router.put(
  '/:id',
  requireRole('ADMIN'),
  validateUpdateHoliday,
  holidayController.updateHoliday
);

// Delete Holiday - Admin only
router.delete(
  '/:id',
  requireRole('ADMIN'),
  holidayController.deleteHoliday
);

module.exports = router;
