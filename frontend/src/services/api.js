const API_BASE = "/api";

const api = {
  // Helper to handle requests
  async request(path, method = 'GET', body = null) {
    const token = localStorage.getItem('access_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    });

    if (response.status === 401) {
      // Logic for token refresh or redirect to login could go here
      window.location.href = '/login';
    }

    return response.json();
  },

  login: (username, password) => api.request('/auth/login', 'POST', { username, password }),
  getStats: () => api.request('/dashboard/stats'),
  getUsers: () => api.request('/users'),
  createUser: (data) => api.request('/users', 'POST', data),
  deleteUser: (id) => api.request('/users/' + id, 'DELETE'),
  createUser: (userData) => api.request('/users', 'POST',userData),
  updateUser: (id, data) => api.request(`/users/${id}`,'PUT', data),
  getLogs: () => api.request('/all_logs'),
};

export default api;
