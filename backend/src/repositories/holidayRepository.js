const prisma = require('../config/prisma');
const { normalizeCalendarDate } = require('../utils/dateUtils');
const cache = require('../utils/cache');

class HolidayRepository {
  async createHoliday(data, branchNames = []) {
    cache.delPrefix('holidays_');
    let dateObj;
    let dayOfWeek;
    let year;

    if (data.date instanceof Date) {
      dateObj = data.date;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayOfWeek = data.day || days[dateObj.getUTCDay()];
      year = data.year || dateObj.getUTCFullYear();
    } else {
      const normalized = normalizeCalendarDate(data.date);
      dateObj = normalized.date;
      dayOfWeek = data.day || normalized.dayOfWeek;
      year = data.year || normalized.year;
    }

    return await prisma.holiday.create({
      data: {
        id: data.id || undefined,
        name: data.name,
        date: dateObj,
        day: dayOfWeek,
        year: parseInt(year, 10),
        type: data.type || 'NATIONAL',
        campus: data.campus || 'All Campuses',
        description: data.description || null,
        passed: Boolean(data.passed),
        isNext: Boolean(data.isNext),
        isAllBranches: data.isAllBranches !== undefined ? data.isAllBranches : true,
        branches: {
          create: (!data.isAllBranches && Array.isArray(branchNames))
            ? branchNames.map(b => ({ branch: b }))
            : []
        }
      },
      include: {
        branches: true
      }
    });
  }

  async getHolidays({ year, branch, type } = {}) {
    const cacheKey = `holidays_${year || 'ALL'}_${branch || 'ALL'}_${type || 'ALL'}`;
    return await cache.wrapSWR(cacheKey, 600000, 1800000, async () => {
      const params = [];
      const conditions = [];

      if (year) {
        params.push(parseInt(year, 10));
        conditions.push(`h.year = $${params.length}`);
      }
      if (type && type !== 'ALL') {
        params.push(type);
        conditions.push(`LOWER(h.type) = LOWER($${params.length})`);
      }
      if (branch && branch !== 'ALL') {
        params.push(branch);
        conditions.push(`(h."isAllBranches" = true OR EXISTS (SELECT 1 FROM "HolidayBranch" hb2 WHERE hb2."holidayId" = h.id AND LOWER(hb2.branch) = LOWER($${params.length})))`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `
        SELECT
          h.id, h.name, h.date, h.day, h.year, h.type, h.campus, h.description,
          h.passed, h."isNext", h."isAllBranches", h."createdAt", h."updatedAt",
          COALESCE(
            json_agg(json_build_object('id', hb.id, 'holidayId', hb."holidayId", 'branch', hb.branch))
            FILTER (WHERE hb.id IS NOT NULL),
            '[]'::json
          ) AS branches
        FROM "Holiday" h
        LEFT JOIN "HolidayBranch" hb ON hb."holidayId" = h.id
        ${whereSql}
        GROUP BY h.id, h.name, h.date, h.day, h.year, h.type, h.campus, h.description, h.passed, h."isNext", h."isAllBranches", h."createdAt", h."updatedAt"
        ORDER BY h.date ASC
      `;

      return await prisma.$queryRawUnsafe(sql, ...params);
    });
  }

  async getHolidayById(id) {
    return await prisma.holiday.findUnique({
      where: { id },
      include: {
        branches: true
      }
    });
  }

  async updateHoliday(id, data, branchNames = null) {
    cache.delPrefix('holidays_');
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.date) {
      let dateObj;
      let dayOfWeek;
      let year;

      if (data.date instanceof Date) {
        dateObj = data.date;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        dayOfWeek = data.day || days[dateObj.getUTCDay()];
        year = data.year || dateObj.getUTCFullYear();
      } else {
        const normalized = normalizeCalendarDate(data.date);
        dateObj = normalized.date;
        dayOfWeek = data.day || normalized.dayOfWeek;
        year = data.year || normalized.year;
      }

      updateData.date = dateObj;
      updateData.day = dayOfWeek;
      updateData.year = parseInt(year, 10);
    } else if (data.year) {
      updateData.year = parseInt(data.year, 10);
    }
    if (data.day && !updateData.day) updateData.day = data.day;
    if (data.type) updateData.type = data.type;
    if (data.campus) updateData.campus = data.campus;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.passed !== undefined) updateData.passed = Boolean(data.passed);
    if (data.isNext !== undefined) updateData.isNext = Boolean(data.isNext);
    if (data.isAllBranches !== undefined) updateData.isAllBranches = data.isAllBranches;

    if (branchNames !== null) {
      await prisma.holidayBranch.deleteMany({ where: { holidayId: id } });
      if (!data.isAllBranches && Array.isArray(branchNames) && branchNames.length > 0) {
        updateData.branches = {
          create: branchNames.map(b => ({ branch: b }))
        };
      }
    }

    return await prisma.holiday.update({
      where: { id },
      data: updateData,
      include: { branches: true }
    });
  }

  async deleteHoliday(id) {
    cache.delPrefix('holidays_');
    return await prisma.holiday.delete({
      where: { id }
    });
  }
}

module.exports = new HolidayRepository();
