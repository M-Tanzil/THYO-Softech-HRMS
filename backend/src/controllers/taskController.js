const taskService = require('../services/taskService');
const prisma = require('../config/prisma');

class TaskController {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.body, req.user);
      const assignedCount = task.assignments ? task.assignments.length : 0;
      res.status(201).json({
        success: true,
        message: 'Task created successfully and assigned to all selected employees.',
        assignedCount,
        data: task
      });
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req, res, next) {
    try {
      const query = { ...req.query };

      // RBAC Enforcement:
      // Regular employees can ONLY see tasks assigned to them
      if (req.user && req.user.role === 'EMPLOYEE') {
        query.employeeId = req.user.employeeId;
      } else if (req.user && req.user.role === 'MANAGER') {
        // Managers can only see tasks within their authorized department/team scope
        query.managerScope = {
          department: req.user.department,
          employeeId: req.user.employeeId
        };
      }

      const result = await taskService.getTasks(query);
      res.status(200).json({
        success: true,
        data: result.tasks,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req, res, next) {
    try {
      const task = await taskService.getTaskById(req.params.id);
      res.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const updated = await taskService.updateTask(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      await taskService.deleteTask(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Task deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const updated = await taskService.updateTaskStatus(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: `Task status updated successfully.`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async assignTask(req, res, next) {
    try {
      const updated = await taskService.assignTask(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Task assignment updated successfully.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTasks(req, res, next) {
    try {
      let targetEmployeeId = req.user.employeeId;

      // Allow Admin or Manager to preview a specific employee's dashboard if passed via query
      if (req.query.employeeId && ['ADMIN', 'MANAGER'].includes(req.user.role)) {
        if (req.user.role === 'MANAGER') {
          const targetEmp = await prisma.employee.findUnique({
            where: { employeeId: req.query.employeeId }
          });
          if (targetEmp && targetEmp.department?.toLowerCase() === req.user.department?.toLowerCase()) {
            targetEmployeeId = req.query.employeeId;
          }
        } else {
          // Admin can view any employee
          targetEmployeeId = req.query.employeeId;
        }
      }

      const tasks = await taskService.getEmployeeTasks(targetEmployeeId, req.query);
      res.status(200).json({
        success: true,
        data: tasks,
        targetEmployeeId
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeTasks(req, res, next) {
    try {
      // If caller is Manager, verify that target employee is in manager's department
      if (req.user && req.user.role === 'MANAGER') {
        const targetEmp = await prisma.employee.findUnique({
          where: { employeeId: req.params.employeeId }
        });
        if (!targetEmp || targetEmp.department?.toLowerCase() !== req.user.department?.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: `Forbidden: Managers can only view tasks of employees within their department (${req.user.department}).`
          });
        }
      }

      const tasks = await taskService.getEmployeeTasks(req.params.employeeId, req.query);
      res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const comment = await taskService.addComment(req.params.id, req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Comment added successfully.',
        data: comment
      });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req, res, next) {
    try {
      const comments = await taskService.getTaskComments(req.params.id);
      res.status(200).json({
        success: true,
        data: comments
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
