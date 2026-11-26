const leaveService = require('../services/leaveService');

class LeaveController {
  async getLeaveTypes(req, res, next) {
    try {
      const types = await leaveService.getLeaveTypes();
      res.status(200).json({
        success: true,
        data: types
      });
    } catch (error) {
      next(error);
    }
  }

  async createLeaveType(req, res, next) {
    try {
      const type = await leaveService.createLeaveType(req.body);
      res.status(201).json({
        success: true,
        message: 'Leave type created successfully.',
        data: type
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLeaveType(req, res, next) {
    try {
      const type = await leaveService.updateLeaveType(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Leave type updated successfully.',
        data: type
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteLeaveType(req, res, next) {
    try {
      await leaveService.deleteLeaveType(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Leave type deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeaveBalances(req, res, next) {
    try {
      const targetEmpId = req.query.employeeId || req.user.employeeId;
      if (req.user.role === 'EMPLOYEE' && targetEmpId !== req.user.employeeId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Employees can only view their own leave balances.',
          error: 'Forbidden'
        });
      }
      const year = req.query.year || 2026;
      const balances = await leaveService.getLeaveBalances(targetEmpId, year);
      res.status(200).json({
        success: true,
        data: balances
      });
    } catch (error) {
      next(error);
    }
  }

  async createRequest(req, res, next) {
    try {
      const request = await leaveService.createLeaveRequest(req.validatedData || req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully.',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  async getRequests(req, res, next) {
    try {
      const { status, department, leaveTypeId, year, limit, offset } = req.query;
      const result = await leaveService.getLeaveRequests(req.user, {
        status,
        department,
        leaveTypeId,
        year,
        limit,
        offset
      });

      res.status(200).json({
        success: true,
        data: result.requests,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyRequests(req, res, next) {
    try {
      const { status, leaveTypeId, year, limit, offset } = req.query;
      const result = await leaveService.getMyRequests(req.user, {
        status,
        leaveTypeId,
        year,
        limit,
        offset
      });

      res.status(200).json({
        success: true,
        data: result.requests,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  async getRequestById(req, res, next) {
    try {
      const request = await leaveService.getLeaveRequestById(req.params.id, req.user);
      res.status(200).json({
        success: true,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewRequest(req, res, next) {
    try {
      const updated = await leaveService.reviewLeaveRequest(
        req.params.id,
        req.validatedData || req.body,
        req.user
      );
      res.status(200).json({
        success: true,
        message: `Leave request ${req.body.status?.toLowerCase() || 'reviewed'} successfully.`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req, res, next) {
    try {
      const cancelled = await leaveService.cancelLeaveRequest(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Leave request cancelled successfully.',
        data: cancelled
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await leaveService.getStats(req.user);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LeaveController();
