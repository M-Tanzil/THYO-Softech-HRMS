const announcementRepository = require('../repositories/announcementRepository');
const notificationService = require('./notificationService');
const prisma = require('../config/prisma');
const { normalizeCalendarDate } = require('../utils/dateUtils');

class AnnouncementService {
  async createAnnouncement(data, creator) {
    const {
      title,
      message,
      priority = 'NORMAL',
      category = 'GENERAL',
      publishDate = null,
      expiryDate = null,
      targets = []
    } = data;

    let normPublish = publishDate ? normalizeCalendarDate(publishDate)?.date : null;
    let normExpiry = expiryDate ? normalizeCalendarDate(expiryDate)?.date : null;
    if (normPublish && normExpiry && normPublish > normExpiry) {
      const error = new Error('Publish date cannot be after expiry date.');
      error.statusCode = 400;
      throw error;
    }

    // Ensure targets array is formed
    let normalizedTargets = targets;
    if (!normalizedTargets || normalizedTargets.length === 0) {
      if (data.audience) {
        normalizedTargets = [{ targetType: data.audience.toUpperCase(), targetValue: data.targetValue || null }];
      } else {
        normalizedTargets = [{ targetType: 'ALL', targetValue: null }];
      }
    }

    const announcement = await announcementRepository.createAnnouncement(
      {
        id: data.id,
        title,
        message: message || data.content,
        content: data.content || message,
        date: data.date,
        author: data.author || creator?.fullName || creator?.name,
        authorRole: data.authorRole || creator?.role || creator?.designation,
        authorAvatar: data.authorAvatar,
        priority,
        category,
        targetDepartment: data.targetDepartment || 'All Organization',
        pinned: data.pinned,
        publishDate,
        expiryDate,
        acknowledgedBy: data.acknowledgedBy || (creator?.employeeId ? [creator.employeeId] : []),
        createdById: creator?.employeeId || 'EMP001',
        audience: normalizedTargets[0]?.targetType || 'ALL',
        targetValue: normalizedTargets[0]?.targetValue || null
      },
      normalizedTargets
    );

    // Resolve target recipient employees for notification dispatch
    try {
      const recipientIds = new Set();

      for (const target of normalizedTargets) {
        if (target.targetType === 'ALL') {
          const allEmployees = await prisma.employee.findMany({
            where: { status: 'ACTIVE' },
            select: { employeeId: true }
          });
          allEmployees.forEach(e => recipientIds.add(e.employeeId));
          break; // Already includes everyone
        } else if (target.targetType === 'DEPARTMENT' && target.targetValue) {
          const deptEmployees = await prisma.employee.findMany({
            where: { department: { equals: target.targetValue, mode: 'insensitive' }, status: 'ACTIVE' },
            select: { employeeId: true }
          });
          deptEmployees.forEach(e => recipientIds.add(e.employeeId));
        } else if (target.targetType === 'ROLE' && target.targetValue) {
          const roleEmployees = await prisma.user.findMany({
            where: { role: target.targetValue.toUpperCase(), isActive: true, employeeId: { not: null } },
            select: { employeeId: true }
          });
          roleEmployees.forEach(u => u.employeeId && recipientIds.add(u.employeeId));
        } else if (target.targetType === 'EMPLOYEE_GROUP' && target.targetValue) {
          const ids = target.targetValue.split(',').map(s => s.trim());
          ids.forEach(id => id && recipientIds.add(id));
        }
      }

      if (recipientIds.size > 0) {
        notificationService.notifyAnnouncement({
          recipientIds: Array.from(recipientIds),
          title,
          message: message || data.content,
          announcementId: announcement.id
        }).catch(err => {
          console.warn('Background notification error on announcement:', err.message);
        });
      }
    } catch (err) {
      console.error('Error resolving announcement recipients:', err.message);
    }

    return announcement;
  }

  async getAnnouncements(user = null) {
    return await announcementRepository.getAnnouncements(user);
  }

  async acknowledgeAnnouncement(id, employeeId) {
    return await announcementRepository.acknowledgeAnnouncement(id, employeeId);
  }

  async deleteAnnouncement(id) {
    return await announcementRepository.deleteAnnouncement(id);
  }
}

module.exports = new AnnouncementService();
