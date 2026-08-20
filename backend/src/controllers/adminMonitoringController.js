const adminMonitoringService = require('../services/adminMonitoringService');
const { Types } = require('mongoose');

class AdminMonitoringController {
  async getDashboard(req, res, next) {
    try {
      const stats = await adminMonitoringService.getDashboardStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttempts(req, res, next) {
    try {
      const { page = 1, limit = 20, eventId, challengeId, participantId, status } = req.query;
      
      const filters = {};
      if (eventId && Types.ObjectId.isValid(eventId)) filters.eventId = eventId;
      if (challengeId && Types.ObjectId.isValid(challengeId)) filters.challengeId = challengeId;
      if (participantId && Types.ObjectId.isValid(participantId)) filters.participantId = participantId;
      if (status) filters.status = status;

      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20
      };

      const result = await adminMonitoringService.getAttempts(filters, options);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getAttemptDetail(req, res, next) {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: 'Invalid attempt ID format' });
      }

      const attempt = await adminMonitoringService.getAttemptById(id);
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }

      res.status(200).json({
        success: true,
        data: { attempt }
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventActivity(req, res, next) {
    try {
      const { eventId } = req.params;
      if (!Types.ObjectId.isValid(eventId)) {
        return res.status(400).json({ success: false, error: 'Invalid event ID format' });
      }

      const activity = await adminMonitoringService.getEventActivity(eventId);
      if (!activity) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }

      res.status(200).json({
        success: true,
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminMonitoringController();
