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

// Request Interceptor: Attach JWT Token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('blackbox_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
