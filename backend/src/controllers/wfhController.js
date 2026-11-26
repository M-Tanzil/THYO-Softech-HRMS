const wfhService = require('../services/wfhService');

class WfhController {
  async createRequest(req, res, next) {
    try {
      const request = await wfhService.createRequest(req.validatedData || req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'WFH request submitted successfully.',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  async getRequests(req, res, next) {
    try {
      const { status, department, limit, offset } = req.query;
      const result = await wfhService.getRequests(req.user, {
        status,
        department,
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
      const { status, limit, offset } = req.query;
      const result = await wfhService.getMyRequests(req.user, { status, limit, offset });
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
      const request = await wfhService.getRequestById(req.params.id, req.user);
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
      const updated = await wfhService.reviewRequest(req.params.id, req.validatedData || req.body, req.user);
      res.status(200).json({
        success: true,
        message: `WFH request ${updated.status.toLowerCase()} successfully.`,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req, res, next) {
    try {
      const result = await wfhService.cancelRequest(req.params.id, req.user);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await wfhService.getStats(req.user);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WfhController();
