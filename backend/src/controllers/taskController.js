const taskService = require('../services/taskService');

class TaskController {
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Task created and assigned successfully.',
        data: task
      });
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req, res, next) {
    try {
      const query = { ...req.query };

      // RBAC Enforcement: If caller is regular employee, strictly scope results to their own assignments
      if (req.user && req.user.role === 'EMPLOYEE') {
        query.employeeId = req.user.employeeId;
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
        message: `Task status updated to ${req.body.status}.`,
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
      const employeeId = req.user.employeeId;
      const tasks = await taskService.getEmployeeTasks(employeeId, req.query);
      res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeTasks(req, res, next) {
    try {
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
}

module.exports = new TaskController();
