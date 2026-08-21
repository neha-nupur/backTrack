const eventService = require('../services/eventService');

/**
 * POST /api/admin/events
 * Create new event (ADMIN)
 */
const create = async (req, res, next) => {
  try {
    const { name, type, description, startTime, endTime, status, isActive, password } = req.body;
    const event = await eventService.createEvent({ name, type, description, startTime, endTime, status, isActive, password });
    return res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/events
 * List events for administration (ADMIN)
 */
const listAdmin = async (req, res, next) => {
  try {
    const result = await eventService.listAdminEvents(req.query);
    return res.status(200).json({
      success: true,
      message: 'Events fetched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/events/:id
 * Get single event details (ADMIN)
 */
const getById = async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Event fetched successfully',
      data: { event },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/events/:id
 * Update event details (ADMIN)
 */
const update = async (req, res, next) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: { event },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/events/:id/status
 * Update event status (ADMIN)
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const event = await eventService.updateEventStatus(req.params.id, status);
    return res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`,
      data: { event },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/events/:id
 * Delete event (ADMIN)
 */
const remove = async (req, res, next) => {
  try {
    const deleted = await eventService.deleteEvent(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
      data: { deleted },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events/live
 * Retrieve LIVE events (PARTICIPANT) - supports optional ?type=DEMO or ?type=CONTEST
 */
const getLive = async (req, res, next) => {
  try {
    const { type } = req.query;
    const result = await eventService.getParticipantLiveEvents(type);
    return res.status(200).json({
      success: true,
      message: 'Live events fetched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/events/upcoming
 * Retrieve UPCOMING events (PARTICIPANT) - supports optional ?type=DEMO or ?type=CONTEST
 */
const getUpcoming = async (req, res, next) => {
  try {
    const { type } = req.query;
    const result = await eventService.getParticipantUpcomingEvents(type);
    return res.status(200).json({
      success: true,
      message: 'Upcoming events fetched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/events/:eventId/start
 * Start event session (PARTICIPANT) - verifies optional event password
 */
const start = async (req, res, next) => {
  try {
    const participantId = req.user.id;
    const { eventId } = req.params;
    const { password } = req.body || {};
    const session = await eventService.startEvent(eventId, participantId, password);
    return res.status(200).json({
      success: true,
      message: 'Event started successfully',
      data: session,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  listAdmin,
  getById,
  update,
  updateStatus,
  remove,
  getLive,
  getUpcoming,
  start,
};
