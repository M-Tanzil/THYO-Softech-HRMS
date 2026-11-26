const prisma = require('../config/prisma');
const cache = require('../utils/cache');

class NotificationRepository {
  invalidateNotificationCaches() {
    cache.delPrefix('notification_');
  }

  async getUnreadCount(recipientId) {
    if (!recipientId) return 0;
    const cacheKey = `notification_unread_${recipientId}`;
    return await cache.wrapSWR(cacheKey, 120000, 600000, async () => {
      return await prisma.notification.count({
        where: {
          recipientId,
          AND: [{ isRead: false }, { read: false }]
        }
      });
    });
  }

  async createNotification(data) {
    this.invalidateNotificationCaches();
    return await prisma.notification.create({
      data: {
        id: data.id || undefined,
        recipientId: data.recipientId || 'EMP001',
        title: data.title,
        message: data.message,
        timestamp: data.timestamp || 'Just now',
        read: Boolean(data.read),
        isRead: Boolean(data.isRead || data.read),
        type: data.type || 'recruitment',
        category: data.category || 'Recruitment',
        actionLink: data.actionLink || null,
        targetTab: data.targetTab || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        link: data.link || null
      }
    });
  }

  async createBulkNotifications(notificationsData) {
    this.invalidateNotificationCaches();
    if (!Array.isArray(notificationsData) || notificationsData.length === 0) return [];
    return await prisma.notification.createMany({
      data: notificationsData.map(item => ({
        id: item.id || undefined,
        recipientId: item.recipientId || 'EMP001',
        title: item.title,
        message: item.message,
        timestamp: item.timestamp || 'Just now',
        read: Boolean(item.read),
        isRead: Boolean(item.isRead || item.read),
        type: item.type || 'recruitment',
        category: item.category || 'Recruitment',
        actionLink: item.actionLink || null,
        targetTab: item.targetTab || null,
        entityType: item.entityType || null,
        entityId: item.entityId || null,
        link: item.link || null
      }))
    });
  }

  async getNotifications(recipientId, filterParams = {}) {
    const { isRead, category, limit = 50, offset = 0 } = filterParams;
    const cacheKey = `notification_list_${recipientId || 'all'}_${JSON.stringify({ isRead, category, limit, offset })}`;

    return await cache.wrapSWR(cacheKey, 120000, 600000, async () => {
      // Fast-path for unread-count badge check (limit === 1)
      if (Number(limit) === 1 && isRead === undefined && !category && Number(offset) === 0) {
        const unreadCount = await this.getUnreadCount(recipientId);
        return { notifications: [], total: unreadCount, unreadCount };
      }

      const params = [];
      const conditions = [];

      if (recipientId) {
        params.push(recipientId);
        conditions.push(`n."recipientId" = $${params.length}`);
      }
      if (isRead !== undefined) {
        const boolVal = isRead === 'true' || isRead === true;
        params.push(boolVal);
        conditions.push(`(n."isRead" = $${params.length} OR n.read = $${params.length})`);
      }
      if (category) {
        params.push(category);
        conditions.push(`LOWER(n.category) = LOWER($${params.length})`);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const takeVal = Math.max(1, Math.min(200, Number(limit) || 50));
      const skipVal = Math.max(0, Number(offset) || 0);
      params.push(takeVal, skipVal);

      // Single SQL round-trip combining unread count, total match count, and paginated notifications
      const unreadCondition = recipientId
        ? `"recipientId" = $1 AND "isRead" = false AND read = false`
        : `"isRead" = false AND read = false`;

      const rows = await prisma.$queryRawUnsafe(
        `WITH unread AS (
           SELECT COUNT(*)::int AS cnt FROM "Notification" WHERE ${unreadCondition}
         ),
         filtered AS (
           SELECT n.id, n."recipientId", n.title, n.message, n.timestamp, n.read, n."isRead",
                  n.type, n.category, n."actionLink", n."targetTab", n."entityType", n."entityId",
                  n.link, n."readAt", n."createdAt", n."updatedAt",
                  COUNT(*) OVER()::int AS "_total"
           FROM "Notification" n
           ${whereSql}
           ORDER BY n."createdAt" DESC
           LIMIT $${params.length - 1} OFFSET $${params.length}
         )
         SELECT u.cnt AS "_unread", f.*
         FROM unread u
         LEFT JOIN filtered f ON true
         ORDER BY f."createdAt" DESC NULLS LAST`,
        ...params
      );

      const unreadCount = Number(rows[0]?._unread || 0);
      const validRows = rows.filter(r => r.id !== null && r.id !== undefined);
      const total = validRows.length > 0 ? Number(validRows[0]._total || 0) : 0;
      const notifications = validRows.map(({ _unread, _total, ...rest }) => rest);

      if (recipientId) {
        cache.set(`notification_unread_${recipientId}`, unreadCount, 120000, 600000);
      }

      return { notifications, total, unreadCount };
    });
  }

  async markAsRead(id, recipientId) {
    this.invalidateNotificationCaches();
    const where = { id };
    if (recipientId) where.recipientId = recipientId;
    return await prisma.notification.updateMany({
      where,
      data: { isRead: true, read: true, readAt: new Date() }
    });
  }

  async markAllAsRead(recipientId) {
    this.invalidateNotificationCaches();
    const where = {
      OR: [{ isRead: false }, { read: false }]
    };
    if (recipientId) where.recipientId = recipientId;
    return await prisma.notification.updateMany({
      where,
      data: { isRead: true, read: true, readAt: new Date() }
    });
  }

  async deleteNotification(id) {
    this.invalidateNotificationCaches();
    return await prisma.notification.deleteMany({
      where: { id }
    });
  }

  async getPreferences(employeeId) {
    const cacheKey = `notification_prefs_${employeeId}`;
    return await cache.wrapSWR(cacheKey, 300000, 900000, async () => {
      let prefs = await prisma.notificationPreference.findUnique({
        where: { employeeId }
      });
      if (!prefs) {
        prefs = await prisma.notificationPreference.create({
          data: { employeeId }
        });
      }
      return prefs;
    });
  }

  async updatePreferences(employeeId, data) {
    cache.del(`notification_prefs_${employeeId}`);
    // Views do not support PostgreSQL ON CONFLICT / Prisma upsert directly
    const existing = await prisma.notificationPreference.findFirst({
      where: { employeeId }
    });
    if (existing) {
      return await prisma.notificationPreference.update({
        where: { id: existing.id },
        data
      });
    }
    return await prisma.notificationPreference.create({
      data: { employeeId, ...data }
    });
  }
}

module.exports = new NotificationRepository();
