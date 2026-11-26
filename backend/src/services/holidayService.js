const holidayRepository = require('../repositories/holidayRepository');
const { normalizeCalendarDate } = require('../utils/dateUtils');

class HolidayService {
  async createHoliday(data) {
    const { name, date, type, description, isAllBranches, branches, id, campus, passed, isNext } = data;
    if (!date) {
      const error = new Error('Date is required for holiday.');
      error.statusCode = 400;
      throw error;
    }
    const normalized = normalizeCalendarDate(date);
    if (!normalized) {
      const error = new Error('Invalid holiday date format.');
      error.statusCode = 400;
      throw error;
    }

    return await holidayRepository.createHoliday(
      {
        id,
        name,
        date: normalized.date,
        day: normalized.dayOfWeek,
        year: normalized.year,
        type: type ? type.toUpperCase() : 'NATIONAL',
        campus: campus || 'All Campuses',
        description,
        passed,
        isNext,
        isAllBranches: isAllBranches !== undefined ? isAllBranches : true
      },
      branches || []
    );
  }

  async getHolidays({ year, branch, type, user } = {}) {
    // If no year passed, default to current year (2026)
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    // If branch not explicitly provided in query, infer from user's location/department if available
    let targetBranch = branch;
    if (!targetBranch && user && user.role === 'EMPLOYEE') {
      targetBranch = user.branch || null;
    }

    return await holidayRepository.getHolidays({
      year: targetYear,
      branch: targetBranch,
      type
    });
  }

  async getHolidayById(id) {
    const holiday = await holidayRepository.getHolidayById(id);
    if (!holiday) {
      const error = new Error('Holiday not found');
      error.statusCode = 404;
      throw error;
    }
    return holiday;
  }

  async updateHoliday(id, data) {
    await this.getHolidayById(id); // Ensure exists
    const updatePayload = { ...data };
    if (data.date) {
      const normalized = normalizeCalendarDate(data.date);
      if (!normalized) {
        const error = new Error('Invalid holiday date format.');
        error.statusCode = 400;
        throw error;
      }
      updatePayload.date = normalized.date;
      updatePayload.day = normalized.dayOfWeek;
      updatePayload.year = normalized.year;
    }
    if (data.type) {
      updatePayload.type = data.type.toUpperCase();
    }
    return await holidayRepository.updateHoliday(id, updatePayload, data.branches !== undefined ? data.branches : null);
  }

  async deleteHoliday(id) {
    await this.getHolidayById(id); // Ensure exists
    return await holidayRepository.deleteHoliday(id);
  }
}

module.exports = new HolidayService();
