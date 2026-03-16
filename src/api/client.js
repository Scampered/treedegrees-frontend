// src/api/client.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 45000, // 45s — handles Render cold start wake-up (~30s)
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('td_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Only log out on a GENUINE 401 with a specific error message.
// Network timeouts, 500 errors, CORS etc. must NOT trigger logout —
// those are server/connectivity issues, not expired sessions.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isGenuine401 = err.response?.status === 401
    const isTokenError = err.response?.data?.error
      ?.toLowerCase()
      .includes('token') ||
      err.response?.data?.error?.toLowerCase().includes('invalid') ||
      err.response?.data?.error?.toLowerCase().includes('expired')

    // Only force-logout if the server explicitly rejected the token
    if (isGenuine401 && isTokenError) {
      localStorage.removeItem('td_token')
      localStorage.removeItem('td_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authApi = {
  signup:        (data)     => api.post('/api/auth/signup', data),
  login:         (data)     => api.post('/api/auth/login', data),
  me:            ()         => api.get('/api/auth/me'),
  deleteAccount: (password) => api.delete('/api/auth/account', { data: { password } }),
}

export const friendsApi = {
  list:          ()                       => api.get('/api/friends'),
  requests:      ()                       => api.get('/api/friends/requests'),
  add:           (friendCode, isPrivate = false) => api.post('/api/friends/add', { friendCode, isPrivate }),
  respond:       (requestId, action, isPrivate = false) =>
                   api.patch(`/api/friends/respond/${requestId}`, { action, isPrivate }),
  togglePrivacy: (friendshipId, isPrivate) =>
                   api.patch(`/api/friends/${friendshipId}/privacy`, { isPrivate }),
  remove:        (userId)                 => api.delete(`/api/friends/${userId}`),
}

export const graphApi = {
  mapData: ()         => api.get('/api/graph/map'),
  path:    (targetId) => api.get(`/api/graph/path/${targetId}`),
}

export const usersApi = {
  updateProfile: (data) => api.patch('/api/users/profile', data),
  postDailyNote: (note) => api.post('/api/users/daily-note', { note }),
  feed:          ()     => api.get('/api/users/feed'),
}

export const nicknamesApi = {
  list:   ()                   => api.get('/api/nicknames'),
  set:    (targetId, nickname) => api.put(`/api/nicknames/${targetId}`, { nickname }),
  remove: (targetId)           => api.delete(`/api/nicknames/${targetId}`),
}

// ── Letters ───────────────────────────────────────────────────────────────────
export const lettersApi = {
  send:      (recipientId, content) => api.post('/api/letters', { recipientId, content }),
  list:      ()                     => api.get('/api/letters'),
  inTransit: ()                     => api.get('/api/letters/in-transit'),
  streaks:   ()                     => api.get('/api/letters/streaks'),
  open:      (id)                   => api.patch(`/api/letters/${id}/open`),
}
