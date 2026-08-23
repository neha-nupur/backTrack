import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Resolves the appropriate JWT token based on the request endpoint or active page context.
 * This guarantees complete session isolation between Admin and Participant portals.
 */
export const getActiveAuthToken = (url = '') => {
  const adminToken = localStorage.getItem('blackbox_admin_token');
  const participantToken = localStorage.getItem('blackbox_participant_token');
  const legacyToken = localStorage.getItem('blackbox_token');

  // Admin-specific endpoints
  if (url.startsWith('/admin') || url.startsWith('/auth/admin')) {
    return adminToken || legacyToken;
  }

  // Participant-specific endpoints
  if (url.startsWith('/events') || url.startsWith('/auth/login')) {
    return participantToken || legacyToken;
  }

  // Context-dependent endpoints (like /auth/me or /auth/logout)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  if (currentPath.startsWith('/admin')) {
    return adminToken || legacyToken || participantToken;
  }

  return participantToken || legacyToken || adminToken;
};

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    if (!config.headers.Authorization) {
      const token = getActiveAuthToken(config.url || '');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Format error payloads cleanly
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const formattedError = {
      success: false,
      message: error.response?.data?.message || error.message || 'Network or Server Error',
      errorCode: error.response?.data?.errorCode || 'NETWORK_ERROR',
      statusCode: error.response?.status || 500,
    };
    return Promise.reject(formattedError);
  }
);

export default apiClient;

