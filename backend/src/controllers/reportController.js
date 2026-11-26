const reportService = require('../services/reportService');

class ReportController {
  async getReports(req, res, next) {
    try {
      const filters = { ...req.query };

      // RBAC: Managers only see analytics for their authorized department
      if (req.user && req.user.role === 'MANAGER') {
        filters.department = req.user.department;
      }

      const analytics = await reportService.getTaskAnalytics(filters);
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const filters = { ...req.query };

      // RBAC: Managers only export analytics for their authorized department
      if (req.user && req.user.role === 'MANAGER') {
        filters.department = req.user.department;
      }

      const csv = await reportService.generateCsvExport(filters);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="thyo_task_management_report.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
