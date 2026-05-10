const API_BASE = "/api";

async function apiCall(path, method, body) {
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

  return response;
}

const api = {

  async request(path, method = 'GET', body = null) {
    let response = await apiCall(path, method, body);

    if (response.status === 401) {
      const refresh_token = localStorage.getItem('refresh_token');

      if (!refresh_token) {
        window.location.href = '/login';
        return;
      }

      const refresh_headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refresh_token}`
      };

      const refresh_response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: refresh_headers
      });

      if (refresh_response.ok) {
        const data = await refresh_response.json();

        localStorage.setItem('access_token', data.access_token);

        response = await apiCall(path, method, body);
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return;
      }

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return response;
  },

  login: (username, password) => api.request('/auth/login', 'POST', { username, password }),
  getStats: () => api.request('/dashboard/stats'),
  getUsers: () => api.request('/users'),
  createUser: (data) => api.request('/users', 'POST', data),
  deleteUser: (id) => api.request('/users/' + id, 'DELETE'),
  createUser: (userData) => api.request('/users', 'POST', userData),
  updateUser: (id, data) => api.request(`/users/${id}`, 'PUT', data),
  getLogs: () => api.request('/all_logs'),
};

export default api;
