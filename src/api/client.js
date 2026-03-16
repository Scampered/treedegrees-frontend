// src/api/client.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('td_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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

export const authApi = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  deleteAccount: (password) => api.delete('/api/auth/account', { data: { password } }),
}

export const friendsApi = {
  list: () => api.get('/api/friends'),
  requests: () => api.get('/api/friends/requests'),
  add: (friendCode, isPrivate = false) => api.post('/api/friends/add', { friendCode, isPrivate }),
  respond: (requestId, action, isPrivate = false) =>
    api.patch(`/api/friends/respond/${requestId}`, { action, isPrivate }),
  togglePrivacy: (friendshipId, isPrivate) =>
    api.patch(`/api/friends/${friendshipId}/privacy`, { isPrivate }),
  remove: (userId) => api.delete(`/api/friends/${userId}`),
}

export const graphApi = {
  mapData: () => api.get('/api/graph/map'),
  path: (targetId) => api.get(`/api/graph/path/${targetId}`),
}

export const usersApi = {
  updateProfile: (data) => api.patch('/api/users/profile', data),
  postDailyNote: (note) => api.post('/api/users/daily-note', { note }),
  feed: () => api.get('/api/users/feed'),
}

// ── Nicknames ─────────────────────────────────────────────────────────────────
export const nicknamesApi = {
  list:   ()                    => api.get('/api/nicknames'),
  set:    (targetId, nickname)  => api.put(`/api/nicknames/${targetId}`, { nickname }),
  remove: (targetId)            => api.delete(`/api/nicknames/${targetId}`),
}
