import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cloudvault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cloudvault_token');
      localStorage.removeItem('cloudvault_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ──────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgotpassword', data),
  resetPassword: (token, data) => api.put(`/auth/resetpassword/${token}`, data),
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  passwordlessLogin: (data) => api.post('/auth/passwordless-login', data),
  logout: () => api.post('/auth/logout'),
};

// ── Documents API ─────────────────────────────────────────
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getOne: (id) => api.get(`/documents/${id}`),
  upload: (formData, onUploadProgress) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  move: (data) => api.put('/documents/move', data),
  delete: (id) => api.delete(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`),
  preview: (id) => api.get(`/documents/${id}/preview`),
  restore: (id) => api.put(`/documents/${id}/restore`),
  permanentDelete: (id) => api.delete(`/documents/${id}/permanent`),
  getTrash: () => api.get('/documents/trash'),
  getStats: () => api.get('/documents/stats'),
  checkExists: (params) => api.get('/documents/check', { params }),
};

// ── Notifications API ─────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ── Folders API ───────────────────────────────────────────
export const foldersAPI = {
  getAll: (params) => api.get('/folders', { params }),
  create: (data) => api.post('/folders', data),
  delete: (id) => api.delete(`/folders/${id}`),
};

// ── Shares API ────────────────────────────────────────────
export const sharesAPI = {
  create: (data) => api.post('/shares', data),
  getLinkInfo: (params) => api.get('/shares/link/info', { params }),
  copyLink: (data) => api.post('/shares/link/copy', data),
  updateLinkSettings: (data) => api.patch('/shares/link/settings', data),
  getSharedItemByToken: (token) => api.get(`/shares/link/${token}`),
};

// ── Shared With Me API ────────────────────────────────────
export const sharedWithMeAPI = {
  getAll: (params) => api.get('/share/shared-with-me', { params }),
};

// ── Shared Links API ──────────────────────────────────────
export const sharedLinksAPI = {
  getAll: (params) => api.get('/share/links', { params }),
  update: (id, data) => api.patch(`/share/link/${id}`, data),
  delete: (id) => api.delete(`/share/link/${id}`),
  disable: (id) => api.post(`/share/link/${id}/disable`),
  enable: (id) => api.post(`/share/link/${id}/enable`),
};

// ── Versions API ──────────────────────────────────────────
export const versionsAPI = {
  upload: (formData, onUploadProgress) => 
    api.post('/versions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  getHistory: (documentId) => api.get(`/versions/${documentId}`),
  download: (versionId) => api.get(`/versions/download/${versionId}`),
  delete: (versionId) => api.delete(`/versions/${versionId}`),
};

export default api;
