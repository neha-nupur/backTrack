import apiClient from "./apiClient";

/**
 * Admin Results Service
 * Handles API calls for the Phase 8 Results & Statistics module.
 */
class AdminResultsService {
  /**
   * Get overall system statistics
   */
  async getOverallStatistics() {
    const response = await apiClient.get("/admin/results/overview");
    return response.data?.data ?? response.data;
  }

  /**
   * Get statistics for a specific event
   * @param {string} eventId
   */
  async getEventStatistics(eventId) {
    const response = await apiClient.get(`/admin/results/events/${eventId}`);
    return response.data?.data ?? response.data;
  }

  /**
   * Get participant results
   * @param {Object} params { eventId, search, page, limit, sort, order }
   */
  async getParticipantResults(params = {}) {
    const query = new URLSearchParams();
    if (params.eventId) query.append("eventId", params.eventId);
    if (params.search) query.append("search", params.search);
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.sort) query.append("sort", params.sort);
    if (params.order) query.append("order", params.order);

    const queryString = query.toString();
    const url = `/admin/results/participants${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get(url);
    return response.data?.data ?? response.data;
  }

  /**
   * Get detailed result for a specific participant
   * @param {string} participantId
   * @param {string} eventId (optional)
   */
  async getParticipantResult(participantId, eventId = null) {
    const url = eventId
      ? `/admin/results/participants/${participantId}?eventId=${eventId}`
      : `/admin/results/participants/${participantId}`;
    const response = await apiClient.get(url);
    return response.data?.data ?? response.data;
  }

  /**
   * Get challenge-wise statistics for an event
   * @param {string} eventId
   */
  async getChallengeStatistics(eventId) {
    const response = await apiClient.get(
      `/admin/results/challenges/${eventId}`,
    );
    return response.data?.data ?? response.data;
  }

  /**
   * Get leaderboard for an event
   * @param {string} eventId
   */
  async getLeaderboard(eventId) {
    const response = await apiClient.get(
      `/admin/results/leaderboard/${eventId}`,
    );
    return response.data?.data ?? response.data;
  }

  /**
   * Get recent attempts for an event
   * @param {string} eventId
   * @param {number} limit
   */
  async getRecentAttempts(eventId, limit = 50) {
    const response = await apiClient.get(
      `/admin/results/recent/${eventId}?limit=${limit}`,
    );
    return response.data?.data ?? response.data;
  }

  /**
   * Trigger CSV download for results
   * @param {string} eventId (optional)
   */
  async downloadExport(eventId = "") {
    const url = eventId
      ? `/admin/results/export/${eventId}`
      : "/admin/results/export";

    // Using fetch directly or configuring axios for blob response
    // apiClient usually expects JSON. For files we might need custom handling.
    // We can use the apiClient base URL and token directly.

    const token =
      localStorage.getItem("blackbox_admin_token") ||
      localStorage.getItem("blackbox_token");
    const baseURL = apiClient.defaults.baseURL;

    const response = await fetch(`${baseURL}${url}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    // Extract filename from Content-Disposition if possible
    let filename = "blackbox-results.csv";
    const disposition = response.headers.get("content-disposition");
    if (disposition && disposition.indexOf("filename=") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, "");
      }
    }

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  }
}

export default new AdminResultsService();
