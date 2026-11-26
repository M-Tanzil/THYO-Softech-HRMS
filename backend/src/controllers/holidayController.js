const holidayService = require('../services/holidayService');

class HolidayController {
  async getHolidays(req, res, next) {
    try {
      const { year, branch, type } = req.query;
      const holidays = await holidayService.getHolidays({
        year,
        branch,
        type,
        user: req.user
      });

      res.status(200).json({
        success: true,
        data: holidays,
        count: holidays.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getHolidayById(req, res, next) {
    try {
      const holiday = await holidayService.getHolidayById(req.params.id);
      res.status(200).json({
        success: true,
        data: holiday
      });
    } catch (error) {
      next(error);
    }
  }

  async createHoliday(req, res, next) {
    try {
      const holiday = await holidayService.createHoliday(req.validatedData || req.body);
      res.status(201).json({
        success: true,
        message: 'Holiday added successfully.',
        data: holiday
      });
    } catch (error) {
      next(error);
    }
  }

  async updateHoliday(req, res, next) {
    try {
      const holiday = await holidayService.updateHoliday(req.params.id, req.validatedData || req.body);
      res.status(200).json({
        success: true,
        message: 'Holiday updated successfully.',
        data: holiday
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteHoliday(req, res, next) {
    try {
      await holidayService.deleteHoliday(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Holiday deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HolidayController();
