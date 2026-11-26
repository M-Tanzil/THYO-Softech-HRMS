const prisma = require('../config/prisma');
const { normalizeCalendarDate } = require('../utils/dateUtils');
const cache = require('../utils/cache');

const toDate = (v) => (v ? (v instanceof Date ? v : (normalizeCalendarDate(v)?.date || new Date(v))) : null);

class AnnouncementRepository {
  invalidateAnnouncementCaches() {
    cache.delPrefix('announcements_');
  }

  async createAnnouncement(data, targets = []) {
    this.invalidateAnnouncementCaches();
    const announcementData = {
      id: data.id || undefined,
      title: data.title,
      message: data.message || data.content || '',
      content: data.content || data.message || null,
      date: toDate(data.date) || new Date(),
      author: data.author || null,
      authorRole: data.authorRole || null,
      authorAvatar: data.authorAvatar || null,
      priority: data.priority || 'Normal',
      category: data.category || 'Company Event',
      targetDepartment: data.targetDepartment || 'All Organization',
      pinned: Boolean(data.pinned),
      publishDate: toDate(data.publishDate) || toDate(data.date) || new Date(),
      expiryDate: toDate(data.expiryDate),
      acknowledgedBy: data.acknowledgedBy || [],
      createdById: data.createdById || null,
      audience: data.audience || 'ALL',
      targetValue: data.targetValue || null
    };

    if (Array.isArray(targets) && targets.length > 0) {
      announcementData.targets = {
        create: targets.map(t => ({
          targetType: t.targetType,
          targetValue: t.targetValue || null
        }))
      };
    }

    return await prisma.announcement.create({
      data: announcementData,
      include: {
        targets: true,
        authorEmployee: {
          select: {
            employeeId: true,
            fullName: true,
            department: true,
            position: true
          }
        }
      }
    });
  }

  async getAnnouncements(user = null) {
    return await cache.wrapSWR('announcements_all', 300000, 900000, async () => {
      const sql = `
        SELECT
          a.id, a.title, a.message, a.content, a.date, a.author, a."authorRole", a."authorAvatar",
          a.audience, a."targetValue", a."targetDepartment", a.priority, a.category,
          a."publishDate", a."expiryDate", a.pinned, a."acknowledgedBy", a."createdById",
          a."createdAt", a."updatedAt",
          CASE WHEN e."employeeId" IS NOT NULL THEN
            json_build_object(
              'employeeId', e."employeeId",
              'fullName', e."fullName",
              'department', e.department,
              'position', e.position
            )
          ELSE NULL END AS "authorEmployee",
          COALESCE(
            (SELECT json_agg(json_build_object('id', at2.id, 'announcementId', at2."announcementId", 'targetType', at2."targetType", 'targetValue', at2."targetValue"))
             FROM "AnnouncementTarget" at2 WHERE at2."announcementId" = a.id),
            '[]'::json
          ) AS targets
        FROM "Announcement" a
        LEFT JOIN "Employee" e ON e."employeeId" = a."createdById"
        ORDER BY a.pinned DESC, a.date DESC
      `;
      return await prisma.$queryRawUnsafe(sql);
    });
  }

  async getAnnouncementById(id) {
    return await prisma.announcement.findUnique({
      where: { id },
      include: {
        targets: true,
        authorEmployee: {
          select: {
            employeeId: true,
            fullName: true,
            department: true,
            position: true
          }
        }
      }
    });
  }

  async acknowledgeAnnouncement(id, employeeId) {
    this.invalidateAnnouncementCaches();
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement) {
      const err = new Error('Announcement not found');
      err.statusCode = 404;
      throw err;
    }

    let acks = Array.isArray(announcement.acknowledgedBy) ? [...announcement.acknowledgedBy] : [];
    if (employeeId && !acks.includes(employeeId)) {
      acks.push(employeeId);
    }

    return await prisma.announcement.update({
      where: { id },
      data: { acknowledgedBy: acks },
      include: {
        targets: true,
        authorEmployee: {
          select: {
            employeeId: true,
            fullName: true,
            department: true,
            position: true
          }
        }
      }
    });
  }

  async deleteAnnouncement(id) {
    this.invalidateAnnouncementCaches();
    return await prisma.announcement.delete({
      where: { id }
    });
  }
}

module.exports = new AnnouncementRepository();
