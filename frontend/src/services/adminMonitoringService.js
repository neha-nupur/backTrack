import apiClient from './apiClient';

/**
 * Fetch dashboard statistics
 */
export const getDashboardStats = async () => {
  const response = await apiClient.get('/admin/dashboard');
  return response.data;
};

/**
 * Fetch paginated attempts for admin
 * @param {Object} params - { page, limit, eventId, challengeId, participantId, status }
 */
export const getAdminAttempts = async (params = {}) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key]) query.append(key, params[key]);
  });
  const response = await apiClient.get(`/admin/attempts?${query.toString()}`);
  return response.data;
};

/**
 * Fetch a specific attempt detail
 */
export const getAdminAttemptById = async (attemptId) => {
  const response = await apiClient.get(`/admin/attempts/${attemptId}`);
  return response.data;
};

/**
 * Fetch activity statistics for a specific event
 */
export const getEventActivity = async (eventId) => {
  const response = await apiClient.get(`/admin/events/${eventId}/activity`);
  return response.data;
};
