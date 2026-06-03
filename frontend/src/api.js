const API_BASE = 'http://localhost:4000/api';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('xss_sandbox_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return response.json().then((body) => {
    if (!response.ok) {
      throw new Error(body.message || 'Ошибка API');
    }
    return body;
  });
}

export function saveToken(token, email, isAdmin = false) {
  localStorage.setItem('xss_sandbox_token', token);
  localStorage.setItem('xss_sandbox_email', email);
  localStorage.setItem('xss_sandbox_is_admin', isAdmin ? 'true' : 'false');
}

export function saveUser(email, isAdmin = false) {
  localStorage.setItem('xss_sandbox_email', email);
  localStorage.setItem('xss_sandbox_is_admin', isAdmin ? 'true' : 'false');
}

export function logout() {
  localStorage.removeItem('xss_sandbox_token');
  localStorage.removeItem('xss_sandbox_email');
  localStorage.removeItem('xss_sandbox_is_admin');
}

export function getToken() {
  return localStorage.getItem('xss_sandbox_token');
}

export function getUserEmail() {
  return localStorage.getItem('xss_sandbox_email');
}

export function getIsAdmin() {
  return localStorage.getItem('xss_sandbox_is_admin') === 'true';
}

export function loginRequest(credentials) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function fetchCurrentUser() {
  return apiFetch('/auth/me');
}

export function registerRequest(credentials) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function fetchLevels() {
  return apiFetch('/levels');
}

export function fetchLevel(id) {
  return apiFetch(`/levels/${id}`);
}

export function fetchLevelBestTime(id) {
  return apiFetch(`/levels/${id}/best`);
}

export function postLevelResult(id, durationSeconds) {
  return apiFetch(`/levels/${id}/record`, {
    method: 'POST',
    body: JSON.stringify({ durationSeconds }),
  });
}

export function fetchAdminResults() {
  return apiFetch('/admin/results');
}
