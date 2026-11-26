const announcementService = require('../services/announcementService');

class AnnouncementController {
  async createAnnouncement(req, res, next) {
    try {
      const data = req.validatedData || req.body;
      const announcement = await announcementService.createAnnouncement(data, req.user);
      res.status(201).json({
        success: true,
        message: 'Announcement published successfully.',
        data: announcement
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnnouncements(req, res, next) {
    try {
      const announcements = await announcementService.getAnnouncements(req.user);
      res.status(200).json({
        success: true,
        data: announcements
      });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeAnnouncement(req, res, next) {
    try {
      const employeeId = req.user.employeeId;
      const updated = await announcementService.acknowledgeAnnouncement(req.params.id, employeeId);
      res.status(200).json({
        success: true,
        message: 'Announcement acknowledged successfully.',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAnnouncement(req, res, next) {
    try {
      await announcementService.deleteAnnouncement(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnnouncementController();
