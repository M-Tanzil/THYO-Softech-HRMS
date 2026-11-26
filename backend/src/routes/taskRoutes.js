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
router.get('/employee/:employeeId', requireRole('ADMIN', 'MANAGER'), taskController.getEmployeeTasks);

// Task Creation (Strictly Admin / Manager within authorized department)
router.post(
  '/',
  requireRole('ADMIN', 'MANAGER'),
  validateCreateTask,
  taskController.createTask
);

// All Tasks (Supervisory list for Admin; automatically scoped for Manager and Employee)
router.get('/', taskController.getTasks);

// Single Task details (Guarded: Admin view all; Manager within scope; Employee only assigned tasks)
router.get('/:id', requireTaskAccess('view'), taskController.getTaskById);

// Task Modification (Admin / Manager within authorized scope)
router.put(
  '/:id',
  requireRole('ADMIN', 'MANAGER'),
  validateUpdateTask,
  taskController.updateTask
);

// Task Deletion (Strictly reserved for ADMIN - Managers and Employees cannot delete tasks)
router.delete(
  '/:id',
  requireRole('ADMIN'),
  taskController.deleteTask
);

// Task Reassignment / Assignment (Admin / Manager within authorized scope)
router.post(
  '/:id/assign',
  requireRole('ADMIN', 'MANAGER'),
  taskController.assignTask
);

// Status and Progress Update (Admin/Super Admin/Manager or the assigned Employee updating their own progress)
router.patch(
  '/:id/status',
  requireTaskAccess('update status on'),
  validateStatusUpdate,
  taskController.updateStatus
);

// Task Comments (Admin/HR/Manager or the assigned Employee)
router.get(
  '/:id/comments',
  requireTaskAccess('view comments on'),
  taskController.getComments
);

router.post(
  '/:id/comments',
  requireTaskAccess('comment on'),
  validateComment,
  taskController.addComment
);

module.exports = router;
