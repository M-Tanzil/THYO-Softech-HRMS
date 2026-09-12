const reportService = require('../services/reportService');

class ReportController {
  async getReports(req, res, next) {
    try {
      const analytics = await reportService.getTaskAnalytics(req.query);
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
      const csv = await reportService.generateCsvExport(req.query);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="thyo_task_management_report.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
