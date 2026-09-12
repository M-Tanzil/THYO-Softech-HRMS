const prisma = require('../config/prisma');
const notificationService = require('./notificationService');

class AnnouncementService {
  async createAnnouncement(data, creator) {
    const {
      title,
      message,
      audience = 'ALL',
      targetValue = null,
      expiryDate = null
    } = data;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        audience: audience.toUpperCase(),
        targetValue,
        publishDate: new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        createdById: creator.employeeId || 'EMP001'
      }
    });

    let targetEmployees = [];
    const aud = audience.toUpperCase();

    if (aud === 'ALL') {
      targetEmployees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { employeeId: true }
      });
    } else if (aud === 'DEPARTMENT' && targetValue) {
      targetEmployees = await prisma.employee.findMany({
        where: { department: { equals: targetValue, mode: 'insensitive' }, status: 'ACTIVE' },
        select: { employeeId: true }
      });
    } else if (aud === 'POSITION' && targetValue) {
      targetEmployees = await prisma.employee.findMany({
        where: {
          OR: [
            { position: { equals: targetValue, mode: 'insensitive' } },
            { designation: { equals: targetValue, mode: 'insensitive' } }
          ],
          status: 'ACTIVE'
        },
        select: { employeeId: true }
      });
    } else if (aud === 'INDIVIDUAL' && targetValue) {
      targetEmployees = [{ employeeId: targetValue }];
    }

    if (targetEmployees.length > 0) {
      const ids = targetEmployees.map(e => e.employeeId);
      await notificationService.createBulkNotifications(ids, {
        title: `Announcement: ${title}`,
        message: message.length > 100 ? message.substring(0, 97) + '...' : message,
        type: 'ANNOUNCEMENT',
        link: '/announcements'
      });
    }

    return announcement;
  }

  async getAnnouncements(user = null) {
    const now = new Date();

    const where = {
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: now } }
      ]
    };

    if (user && user.role !== 'ADMIN') {
      where.AND = [
        {
          OR: [
            { audience: 'ALL' },
            { audience: 'DEPARTMENT', targetValue: { equals: user.department, mode: 'insensitive' } },
            { audience: 'POSITION', targetValue: { equals: user.position, mode: 'insensitive' } },
            { audience: 'INDIVIDUAL', targetValue: user.employeeId }
          ]
        }
      ];
    }

    return await prisma.announcement.findMany({
      where,
      orderBy: { publishDate: 'desc' }
    });
  }

  async deleteAnnouncement(id) {
    return await prisma.announcement.delete({
      where: { id }
    });
  }
}

module.exports = new AnnouncementService();
