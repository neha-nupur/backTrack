import apiClient from './apiClient';

// --- ADMIN CHALLENGE SERVICES ---

/**
 * List challenges for a specific event with search/filter/pagination (ADMIN)
 */
export const adminListChallenges = async (eventId, params = {}) => {
  return await apiClient.get(`/admin/events/${eventId}/challenges`, { params });
};

/**
 * Get challenge details by ID (ADMIN - includes hiddenCode)
 */
export const adminGetChallengeById = async (id) => {
  return await apiClient.get(`/admin/challenges/${id}`);
};

/**
 * Create a new challenge assigned to an event (ADMIN)
 */
export const adminCreateChallenge = async (eventId, data) => {
  return await apiClient.post(`/admin/events/${eventId}/challenges`, data);
};

/**
 * Update challenge details (ADMIN)
 */
export const adminUpdateChallenge = async (id, data) => {
  return await apiClient.patch(`/admin/challenges/${id}`, data);
};

/**
 * Update challenge status (ENABLED / DISABLED) (ADMIN)
 */
export const adminUpdateChallengeStatus = async (id, status) => {
  return await apiClient.patch(`/admin/challenges/${id}/status`, { status });
};

/**
 * Delete challenge (ADMIN)
 */
export const adminDeleteChallenge = async (id) => {
  return await apiClient.delete(`/admin/challenges/${id}`);
};

// --- PARTICIPANT CHALLENGE SERVICES ---

/**
 * Retrieve participant-safe challenge list for an event (PARTICIPANT)
 * Excludes hiddenCode
 */
export const getParticipantChallenges = async (eventId) => {
  return await apiClient.get(`/events/${eventId}/challenges`);
};

export default {
  adminListChallenges,
  adminGetChallengeById,
  adminCreateChallenge,
  adminUpdateChallenge,
  adminUpdateChallengeStatus,
  adminDeleteChallenge,
  getParticipantChallenges,
};
