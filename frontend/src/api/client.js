import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request interceptor: Attach simulated employee identity & role headers
apiClient.interceptors.request.use(
  (config) => {
    // Read selected development identity from localStorage
    const savedEmpId = localStorage.getItem('thyo_active_emp_id') || 'EMP001';
    const savedRole = localStorage.getItem('thyo_active_role') || (savedEmpId === 'EMP001' ? 'ADMIN' : 'EMPLOYEE');

    config.headers['x-employee-id'] = savedEmpId;
    config.headers['x-user-role'] = savedRole;

    // NOTE FOR TEAM INTEGRATION:
    // When connecting to teammate's auth module, uncomment below:
    // const token = localStorage.getItem('thyo_auth_token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Extract error messages consistently
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred.';
    if (error.response) {
      if (error.response.data && error.response.data.message) {
        message = error.response.data.message;
      } else if (error.response.data && error.response.data.errors) {
        message = error.response.data.errors.join(' ');
      } else {
        message = `Server responded with status ${error.response.status}`;
      }
    } else if (error.request) {
      message = 'Cannot connect to backend server. Please ensure the backend is running on port 5000.';
    }
    
    // Attach friendly message to error object
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export default apiClient;
