const notificationRepository = require('../repositories/notificationRepository');

class NotificationService {
  async createNotification(data) {
    // Check preferences if notification category has a corresponding toggle
    if (data.recipientId && data.category) {
      const prefs = await notificationRepository.getPreferences(data.recipientId);
      if (prefs) {
        if (data.category === 'WFH' && prefs.wfhAlerts === false) return null;
        if (data.category === 'RECRUITMENT' && prefs.recruitmentAlerts === false) return null;
        if (data.category === 'PERFORMANCE' && prefs.performanceAlerts === false) return null;
        if (data.category === 'TASK' && prefs.taskAlerts === false) return null;
        if (data.category === 'ANNOUNCEMENT' && prefs.announcementAlerts === false) return null;
        if (data.category === 'PAYROLL' && prefs.payrollAlerts === false) return null;
        if (data.category === 'LEAVE' && prefs.leaveAlerts === false) return null;
      }
    }

    return await notificationRepository.createNotification(data);
  }

  async createBulkNotifications(recipientIds, baseNotification) {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) return [];

    const notifications = recipientIds.map(recipientId => ({
      ...baseNotification,
      recipientId
    }));

    return await notificationRepository.createBulkNotifications(notifications);
  }

  async getNotifications(recipientId, options = {}) {
    return await notificationRepository.getNotifications(recipientId, options);
  }

  async getUnreadCount(recipientId) {
    return await notificationRepository.getUnreadCount(recipientId);
  }

  async markAsRead(id, recipientId) {
    return await notificationRepository.markAsRead(id, recipientId);
  }

  async markAllAsRead(recipientId) {
    return await notificationRepository.markAllAsRead(recipientId);
  }

  async deleteNotification(id) {
    return await notificationRepository.deleteNotification(id);
  }

  async getPreferences(employeeId) {
    return await notificationRepository.getPreferences(employeeId);
  }

  async updatePreferences(employeeId, data) {
    return await notificationRepository.updatePreferences(employeeId, data);
  }

  // ==========================================================================
  // SHARED NOTIFICATION DISPATCHERS (Cross-Module Integration)
  // ==========================================================================

  async notifyWfh({ recipientId, title, message, requestId, type = 'INFO' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'WFH',
      entityType: 'WFH_REQUEST',
      entityId: requestId,
      link: '/wfh'
    });
  }

  async notifyRecruitment({ recipientId, title, message, applicationId, type = 'INFO' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'RECRUITMENT',
      entityType: 'JOB_APPLICATION',
      entityId: applicationId,
      link: '/recruitment'
    });
  }

  async notifyPerformance({ recipientId, title, message, cycleId, type = 'INFO' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'PERFORMANCE',
      entityType: 'PERFORMANCE_CYCLE',
      entityId: cycleId,
      link: '/performance'
    });
  }

  async notifyAnnouncement({ recipientIds, title, message, announcementId }) {
    return await this.createBulkNotifications(recipientIds, {
      title: `Company Announcement: ${title}`,
      message: message.length > 150 ? message.substring(0, 147) + '...' : message,
      type: 'INFO',
      category: 'ANNOUNCEMENT',
      entityType: 'ANNOUNCEMENT',
      entityId: announcementId,
      link: '/announcements'
    });
  }

  async notifyTask({ recipientId, title, message, taskId, type = 'INFO' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'TASK',
      entityType: 'TASK',
      entityId: taskId,
      link: `/tasks/${taskId}`
    });
  }

  async notifyLeave({ recipientId, title, message, leaveId, type = 'INFO' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'LEAVE',
      entityType: 'LEAVE',
      entityId: leaveId,
      link: '/leaves'
    });
  }

  async notifyPayroll({ recipientId, title, message, payrollId, type = 'SUCCESS' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'PAYROLL',
      entityType: 'PAYROLL',
      entityId: payrollId,
      link: '/payroll'
    });
  }

  async notifyExpense({ recipientId, title, message, expenseId, type = 'INFO' }) {
    return await this.createNotification({
      recipientId,
      title,
      message,
      type,
      category: 'EXPENSE',
      entityType: 'EXPENSE',
      entityId: expenseId,
      link: '/wallet'
    });
  }
}

module.exports = new NotificationService();
