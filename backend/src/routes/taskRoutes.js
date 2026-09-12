const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireRole, requireTaskAccess } = require('../middleware/authMiddleware');
const {
  validateCreateTask,
  validateUpdateTask,
  validateStatusUpdate,
  validateComment
} = require('../middleware/validation');

// Specific sub-routes first
router.get('/my', taskController.getMyTasks);
router.get('/employee/:employeeId', requireRole('ADMIN', 'HR', 'MANAGER'), taskController.getEmployeeTasks);

// Task Creation (Strictly Admin / HR / Manager)
router.post(
  '/',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  validateCreateTask,
  taskController.createTask
);

// All Tasks (Supervisory list; regular employees automatically scoped in controller)
router.get('/', taskController.getTasks);

// Single Task details (Guarded: Admin/HR/Manager can view all; Employee can only view assigned tasks)
router.get('/:id', requireTaskAccess('view'), taskController.getTaskById);

// Task Modification (Strictly Admin / HR / Manager)
router.put(
  '/:id',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  validateUpdateTask,
  taskController.updateTask
);

// Task Deletion (Strictly Admin / HR / Manager)
router.delete(
  '/:id',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  taskController.deleteTask
);

// Task Reassignment / Assignment (Strictly Admin / HR / Manager)
router.post(
  '/:id/assign',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  taskController.assignTask
);

// Status and Progress Update (Admin/HR/Manager or the assigned Employee)
router.patch(
  '/:id/status',
  requireTaskAccess('update status on'),
  validateStatusUpdate,
  taskController.updateStatus
);

// Task Comments (Admin/HR/Manager or the assigned Employee)
router.post(
  '/:id/comments',
  requireTaskAccess('comment on'),
  validateComment,
  taskController.addComment
);

module.exports = router;
