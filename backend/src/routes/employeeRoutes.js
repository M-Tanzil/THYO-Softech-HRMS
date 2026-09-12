const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.get('/', employeeController.getEmployees);
router.get('/meta', employeeController.getEmployeeMetadata);

module.exports = router;
