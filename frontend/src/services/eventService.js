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
 * Get LIVE events available to participants
 */
export const getLiveEvents = async () => {
  return await apiClient.get('/events/live');
};

/**
 * Get UPCOMING events available to participants
 */
export const getUpcomingEvents = async () => {
  return await apiClient.get('/events/upcoming');
};

/**
 * Attempt to start a LIVE event (PARTICIPANT)
 */
export const startEvent = async (eventId) => {
  return await apiClient.post(`/events/${eventId}/start`);
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
