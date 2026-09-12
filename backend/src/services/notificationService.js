const prisma = require('../config/prisma');

class NotificationService {
  async createNotification({ recipientId, title, message, type = 'INFO', link = null }) {
    try {
      return await prisma.notification.create({
        data: {
          recipientId,
          title,
          message,
          type,
          link,
          isRead: false
        }
      });
    } catch (error) {
      console.error('Failed to create notification for:', recipientId, error.message);
      return null;
    }
  }

  async createBulkNotifications(recipientIds, { title, message, type = 'INFO', link = null }) {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) return [];

    const data = recipientIds.map(recipientId => ({
      recipientId,
      title,
      message,
      type,
      link,
      isRead: false
    }));

    return await prisma.notification.createMany({ data });
  }

  async getNotifications(recipientId, { isRead, limit = 20, offset = 0 } = {}) {
    const where = { recipientId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true' || isRead === true;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset)
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientId, isRead: false } })
    ]);

    return { notifications, total, unreadCount };
  }

  async markAsRead(id, recipientId) {
    return await prisma.notification.updateMany({
      where: { id, recipientId },
      data: { isRead: true }
    });
  }

  async markAllAsRead(recipientId) {
    return await prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true }
    });
  }
}

module.exports = new NotificationService();
