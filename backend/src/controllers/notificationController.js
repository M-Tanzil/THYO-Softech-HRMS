const notificationService = require('../services/notificationService');

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const recipientId = req.user.employeeId;
      const { isRead, limit, offset } = req.query;

      const result = await notificationService.getNotifications(recipientId, { isRead, limit, offset });

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
}

module.exports = new NotificationController();
