import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.API_BASE_URL ||
  'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 20000
});

// Request interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('thyo_task_token') ||
      localStorage.getItem('thyo_auth_token') ||
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const empId = localStorage.getItem('thyo_active_emp_id');
    const role = localStorage.getItem('thyo_active_role');
    if (empId) {
      config.headers['x-employee-id'] = empId;
    }
    if (role) {
      config.headers['x-user-role'] = role;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Retry transient GET errors, extract error messages, handle session expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isIdempotentGet = config && (config.method || 'get').toLowerCase() === 'get';
    const isTransient =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.response.status === 502 ||
      error.response.status === 503 ||
      error.response.status === 504;

    if (isIdempotentGet && isTransient && (config._retryCount || 0) < 2) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 400 * config._retryCount));
      return apiClient(config);
    }

    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      const msg = String(error.response.data?.message || '').toLowerCase();
      if (
        url.includes('/auth/me') ||
        url.includes('/auth/refresh') ||
        msg.includes('token expired') ||
        msg.includes('jwt expired') ||
        msg.includes('invalid token')
      ) {
        localStorage.removeItem('thyo_auth_token');
        localStorage.removeItem('thyo_task_token');
        localStorage.removeItem('token');
        localStorage.removeItem('thyo_user_data');
      }
    }

    let message = 'An unexpected error occurred.';
    if (error.response) {
      if (error.response.data && error.response.data.message) {
        message = error.response.data.message;
      } else if (error.response.data && error.response.data.errors) {
        message = Array.isArray(error.response.data.errors)
          ? error.response.data.errors.join(' ')
          : error.response.data.errors;
      } else {
        message = `Server responded with status ${error.response.status}`;
      }
    } else if (error.request) {
      message = 'Cannot connect to backend server. Please ensure the backend is running on port 5000.';
    }

    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export default apiClient;
