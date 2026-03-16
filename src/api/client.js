// src/api/client.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('td_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 → clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('td_token')
      localStorage.removeItem('td_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  deleteAccount: (password) => api.delete('/api/auth/account', { data: { password } }),
}

// ── Friends ───────────────────────────────────────────────────────────────────
export const friendsApi = {
  list: () => api.get('/api/friends'),
  requests: () => api.get('/api/friends/requests'),
  add: (friendCode) => api.post('/api/friends/add', { friendCode }),
  respond: (requestId, action) => api.patch(`/api/friends/respond/${requestId}`, { action }),
  remove: (userId) => api.delete(`/api/friends/${userId}`),
}

// ── Graph ─────────────────────────────────────────────────────────────────────
export const graphApi = {
  mapData: () => api.get('/api/graph/map'),
  path: (targetId) => api.get(`/api/graph/path/${targetId}`),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  updateProfile: (data) => api.patch('/api/users/profile', data),
  postDailyNote: (note) => api.post('/api/users/daily-note', { note }),
  feed: () => api.get('/api/users/feed'),
}
