const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "nb-auth-token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  const data = contentType && contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = (data && data.error) || (data && data.message) || response.statusText || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.details = data && data.details;
    error.isPending = data && data.isPending;
    throw error;
  }

  return data;
}

// Notice API Methods
export async function getNotices() {
  return request("/notices");
}

export async function createNotice(noticeData) {
  return request("/notices", {
    method: "POST",
    body: JSON.stringify(noticeData),
  });
}

export async function updateNotice(id, updates) {
  return request(`/notices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function togglePin(id, pinned) {
  return updateNotice(id, { pinned });
}

export async function toggleRead(id, isRead) {
  return request(`/notices/${id}/read`, {
    method: "PATCH",
    body: JSON.stringify({ isRead }),
  });
}

export async function markAllNoticesRead() {
  return request("/notices/mark-all-read", {
    method: "POST",
  });
}

export async function deleteNotice(id) {
  return request(`/notices/${id}`, {
    method: "DELETE",
  });
}

export async function votePoll(noticeId, optionIndex) {
  return request(`/notices/${noticeId}/poll/vote`, {
    method: "POST",
    body: JSON.stringify({ optionIndex }),
  });
}

export async function getAnalytics() {
  return request("/notices/analytics");
}

// Auth API Methods
export async function loginUser(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function registerUser(userData) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  return request("/auth/me");
}

export async function logoutUser() {
  clearAuthToken();
}

// Approval Endpoints (Dean / HOD)
export async function getPendingApprovals() {
  return request("/auth/pending-approvals");
}

export async function approveStaffUser(userId) {
  return request(`/auth/approve-user/${userId}`, {
    method: "PATCH",
  });
}

export async function rejectStaffUser(userId) {
  return request(`/auth/reject-user/${userId}`, {
    method: "DELETE",
  });
}
