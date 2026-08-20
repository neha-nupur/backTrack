import apiClient from './apiClient';

/**
 * List participants with search, status filtering, and pagination
 */
export const listParticipants = async (params = {}) => {
  return await apiClient.get('/admin/participants', { params });
};

/**
 * Get single participant by ID
 */
export const getParticipantById = async (id) => {
  return await apiClient.get(`/admin/participants/${id}`);
};

/**
 * Create a new participant
 */
export const createParticipant = async (data) => {
  return await apiClient.post('/admin/participants', data);
};

/**
 * Update an existing participant (name, email, status)
 */
export const updateParticipant = async (id, data) => {
  return await apiClient.patch(`/admin/participants/${id}`, data);
};

/**
 * Update participant status only (ACTIVE / DISABLED)
 */
export const updateParticipantStatus = async (id, status) => {
  return await apiClient.patch(`/admin/participants/${id}/status`, { status });
};

/**
 * Delete a participant
 */
export const deleteParticipant = async (id) => {
  return await apiClient.delete(`/admin/participants/${id}`);
};

export default {
  listParticipants,
  getParticipantById,
  createParticipant,
  updateParticipant,
  updateParticipantStatus,
  deleteParticipant,
};
