const notificationService = require('../services/notificationService');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const recipientId = req.user.employeeId;
      const { isRead, category, limit, offset } = req.query;

      const result = await notificationService.getNotifications(recipientId, {
        isRead,
        category,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      });

      res.status(200).json({
        success: true,
        data: result.notifications,
        total: result.total,
        unreadCount: result.unreadCount
      });
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const recipientId = req.user.employeeId;
      const count = await notificationService.getUnreadCount(recipientId);
      res.status(200).json({
        success: true,
        unreadCount: count
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const recipientId = req.user.employeeId;
      await notificationService.markAsRead(req.params.id, recipientId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read.'
      });
    } catch (error) {
      next(error);
    }
  }

  async createNotification(req, res, next) {
    try {
      const payload = {
        ...req.body,
        recipientId: req.body.recipientId || req.user.employeeId
      };
      const notif = await notificationService.createNotification(payload);
      res.status(201).json({
        success: true,
        message: 'Notification created successfully.',
        data: notif
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const recipientId = req.user.employeeId;
      await notificationService.markAllAsRead(recipientId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read.'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      await notificationService.deleteNotification(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getPreferences(req, res, next) {
    try {
      const employeeId = req.user.employeeId;
      const preferences = await notificationService.getPreferences(employeeId);

      res.status(200).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const employeeId = req.user.employeeId;
      const preferences = await notificationService.updatePreferences(employeeId, req.validatedData || req.body);

      res.status(200).json({
        success: true,
        message: 'Notification preferences updated.',
        data: preferences
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
