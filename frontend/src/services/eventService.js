import apiClient from './apiClient';

// --- ADMIN EVENT SERVICES ---

/**
 * List events for admin with pagination, search, and status filtering
 */
export const adminListEvents = async (params = {}) => {
  return await apiClient.get('/admin/events', { params });
};

/**
 * Get event details by ID (ADMIN)
 */
export const adminGetEventById = async (id) => {
  return await apiClient.get(`/admin/events/${id}`);
};

/**
 * Create a new event (ADMIN)
 */
export const adminCreateEvent = async (data) => {
  return await apiClient.post('/admin/events', data);
};

/**
 * Update event details (ADMIN)
 */
export const adminUpdateEvent = async (id, data) => {
  return await apiClient.patch(`/admin/events/${id}`, data);
};

/**
 * Update event status (ADMIN)
 */
export const adminUpdateEventStatus = async (id, status) => {
  return await apiClient.patch(`/admin/events/${id}/status`, { status });
};

/**
 * Delete event (ADMIN)
 */
export const adminDeleteEvent = async (id) => {
  return await apiClient.delete(`/admin/events/${id}`);
};

// --- PARTICIPANT EVENT SERVICES ---

/**
 * Get LIVE events available to participants (optional ?type=DEMO or ?type=CONTEST)
 */
export const getLiveEvents = async (type = null) => {
  const params = type ? { type } : {};
  return await apiClient.get('/events/live', { params });
};

/**
 * Get UPCOMING events available to participants (optional ?type=DEMO or ?type=CONTEST)
 */
export const getUpcomingEvents = async (type = null) => {
  const params = type ? { type } : {};
  return await apiClient.get('/events/upcoming', { params });
};

/**
 * Attempt to start a LIVE event (PARTICIPANT) - sends optional common event password
 */
export const startEvent = async (eventId, password = null) => {
  const body = password ? { password } : {};
  return await apiClient.post(`/events/${eventId}/start`, body);
};

export default {
  adminListEvents,
  adminGetEventById,
  adminCreateEvent,
  adminUpdateEvent,
  adminUpdateEventStatus,
  adminDeleteEvent,
  getLiveEvents,
  getUpcomingEvents,
  startEvent,
};
