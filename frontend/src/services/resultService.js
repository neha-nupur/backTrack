import apiClient from './apiClient';

/**
 * Fetch attempt history for a specific event
 */
export const getAttempts = async (eventId, params = {}) => {
  const { challengeId } = params;
  let url = `/events/${eventId}/attempts`;
  if (challengeId) {
    url += `?challengeId=${challengeId}`;
  }
  const response = await apiClient.get(url);
  return response.data;
};

/**
 * Fetch result summary for a specific event
 */
export const getEventResult = async (eventId) => {
  const response = await apiClient.get(`/events/${eventId}/results`);
  return response.data;
};
