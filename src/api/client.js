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
  signup:        (data)              => api.post('/api/auth/signup', data),
  login:         (data)              => api.post('/api/auth/login', data),
  me:            ()                  => api.get('/api/auth/me'),
  deleteAccount: (password)          => api.delete('/api/auth/account', { data: { password } }),
  forgotPassword:(email)             => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, email, p)   => api.post('/api/auth/reset-password', { token, email, newPassword: p }),
}

export const friendsApi = {
  togglePrivacy: (friendshipId, isPrivate) =>
                   api.patch(`/api/friends/${friendshipId}/privacy`, { isPrivate }),
  remove:        (userId)                 => api.delete(`/api/friends/${userId}`),
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
  updateProfile: (data)   => api.patch('/api/users/profile', data),
  postDailyNote: (note, momentId, momentCdnUrl) => api.post('/api/users/daily-note', { note, momentId, momentCdnUrl }),
  feed:          ()       => api.get('/api/users/feed'),
  setMood:       (mood)   => api.post('/api/users/daily-mood', { mood }),
  clearMood:     ()       => api.delete('/api/users/daily-mood'),
}

export const nicknamesApi = {
  list:   ()                   => api.get('/api/nicknames'),
  set:    (targetId, nickname) => api.put(`/api/nicknames/${targetId}`, { nickname }),
  remove: (targetId)           => api.delete(`/api/nicknames/${targetId}`),
}

// ── Letters ───────────────────────────────────────────────────────────────────
export const lettersApi = {
  send:      (recipientId, content, momentId, momentCdnUrl) => api.post('/api/letters', { recipientId, content, momentId, momentCdnUrl, senderLocalDate: new Date().toLocaleDateString('sv-SE') }),
  list:      ()                     => api.get('/api/letters'),
  stats:     ()                     => api.get('/api/letters/stats'),
  inTransit: ()                     => api.get('/api/letters/in-transit'),
  streaks:   ()                     => api.get('/api/letters/streaks'),
  open:      (id)                   => api.patch(`/api/letters/${id}/open`),
  arrived:   (id)                   => api.patch(`/api/letters/${id}/arrived`),
  recall:    (id)                   => api.delete(`/api/letters/${id}`),
  notifications: ()                => api.get('/api/groups/notifications'),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  me:               ()                     => api.get('/api/admin/me'),
  stats:            ()                     => api.get('/api/admin/stats'),
  users:            (search, page)         => api.get('/api/admin/users', { params: { search, page } }),
  editUser:         (id, data)             => api.patch(`/api/admin/users/${id}`, data),
  banUser:          (id)                   => api.delete(`/api/admin/users/${id}`),
  maintenance:      ()                     => api.get('/api/admin/maintenance'),
  setMaintenance:   (page, isDown, msg)    => api.patch(`/api/admin/maintenance/${page}`, { isDown, message: msg }),
  log:              ()                     => api.get('/api/admin/log'),
  popups:           ()                     => api.get('/api/admin/popups'),
  createPopup:      (data)                 => api.post('/api/admin/popups', data),
  deletePopup:      (id)                   => api.delete(`/api/admin/popups/${id}`),
}

export const maintenanceApi = {
  check: () => fetch(`${import.meta.env.VITE_API_URL || ''}/api/maintenance`).then(r => r.json()).catch(() => ({})),
}

// ── Groups ────────────────────────────────────────────────────────────────────
export const groupsApi = {
  list:           ()                          => api.get('/api/groups'),
  create:         (data)                      => api.post('/api/groups', data),
  update:         (id, data)                  => api.patch(`/api/groups/${id}`, data),
  delete:         (id)                        => api.delete(`/api/groups/${id}`),
  members:        (id)                        => api.get(`/api/groups/${id}/members`),
  invite:         (id, userId)                => api.post(`/api/groups/${id}/members`, { userId }),
  removeMember:   (id, userId)                => api.delete(`/api/groups/${id}/members/${userId}`),
  invites:        ()                          => api.get('/api/groups/invites'),
  respondInvite:  (groupId, action)           => api.post(`/api/groups/invites/${groupId}/respond`, { action }),
  outbound:       ()                          => api.get('/api/groups/outbound'),
  recallInvite:   (groupId, userId)           => api.delete(`/api/groups/outbound/${groupId}/${userId}`),
  sendLetter:     (id, content)               => api.post(`/api/groups/${id}/letters`, { content }),
  letters:        (id)                        => api.get(`/api/groups/${id}/letters`),
  inTransit:      ()                          => api.get('/api/groups/in-transit'),
  mapData:        ()                          => api.get('/api/groups/map-data'),
  openLetter:     (letterId)                  => api.patch(`/api/groups/letters/${letterId}/open`),
  toggleMute:     (id, muted)                => api.patch(`/api/groups/${id}/mute`, { muted }),
}

// ── Games ─────────────────────────────────────────────────────────────────────
export const gamesApi = {
  list:       ()                    => api.get('/api/games'),
  create:     (groupId)             => api.post('/api/games', { groupId }),
  join:       (id)                  => api.post(`/api/games/${id}/join`),
  start:      (id)                  => api.post(`/api/games/${id}/start`),
  leaveLobby: (id)                  => api.delete(`/api/games/${id}/lobby`),
  state:      (id)                  => api.get(`/api/games/${id}`),
  action:     (id, type, payload)   => api.post(`/api/games/${id}/action`, { type, payload }),
}

// ── Grove (Seeds / Stocks) ────────────────────────────────────────────────────
export const jobActionsApi = {
  // Courier
  courierQueue:      ()                         => api.get('/api/job-actions/courier/queue'),
  courierRequest:    (courierId)                => api.post('/api/job-actions/courier/request', { courierId }),
  courierRespond:    (id, action)               => api.patch(`/api/job-actions/courier/request/${id}`, { action }),
  // Writer
  writerCommissions: ()                         => api.get('/api/job-actions/writer/commissions'),
  myCommissions:     ()                         => api.get('/api/job-actions/writer/my-commissions'),
  hireWriter:        (writerId, prompt, fee)    => api.post('/api/job-actions/writer/commission', { writerId, prompt, feeSeeds: fee }),
  submitCommission:  (id, content)              => api.patch(`/api/job-actions/writer/commission/${id}/submit`, { content }),
  resolveCommission: (id, action)               => api.patch(`/api/job-actions/writer/commission/${id}/resolve`, { action }),
  // Broker
  brokerSession:     ()                         => api.get('/api/job-actions/broker/session'),
  openBrokerSession: (brokerId, seeds, hours)   => api.post('/api/job-actions/broker/open', { brokerId, seeds, durationHours: hours }),
  brokerInvest:      (sessionId, targetId, t)   => api.post('/api/job-actions/broker/invest', { sessionId, targetId, targetType: t }),
  closeBrokerSession:(sessionId)                => api.post('/api/job-actions/broker/close', { sessionId }),
  // Accountant
  accountantClients: ()                         => api.get('/api/job-actions/accountant/clients'),
  hireAccountant:    (accountantId)             => api.post('/api/job-actions/accountant/hire', { accountantId }),
  sendAdvice:        (sId, action, amt, note, idx) => api.post('/api/job-actions/accountant/advice', { sessionId: sId, action, amount: amt, note, investmentIdx: idx }),
  myAdvice:          ()                         => api.get('/api/job-actions/accountant/my-advice'),
  // Steward
  stewardDashboard:  ()                         => api.get('/api/job-actions/steward/dashboard'),
  hireSteward:       (stewardId, days)          => api.post('/api/job-actions/steward/hire', { stewardId, retainerDays: days }),
  stewardNudge:      (clientId)                 => api.post('/api/job-actions/steward/nudge', { clientId }),
  // Forecaster
  forecasterPosts:   (userId)                   => api.get(`/api/job-actions/forecaster/posts/${userId}`),
  forecasterFeed:    ()                         => api.get('/api/job-actions/forecaster/feed'),
  forecasterPost:    (content)                  => api.post('/api/job-actions/forecaster/post', { content }),
  forecasterSub:     (id, action)               => api.post('/api/job-actions/forecaster/subscribe', { forecasterId: id, action }),
  // Farmer
  farmerPlot:        ()                         => api.get('/api/job-actions/farmer/plot'),
  farmerPlant:       (slot, seeds)              => api.post('/api/job-actions/farmer/plant', { slotIndex: slot, seeds }),
  farmerDeposit:     (farmerId, seeds)           => api.post('/api/job-actions/farmer/deposit', { farmerId, seeds }),
  myFarmerDeposits:  ()                         => api.get('/api/job-actions/farmer/my-deposits'),
  farmerHarvest:     (slotId)                   => api.post('/api/job-actions/farmer/harvest', { slotId }),
  farmerBuyPlot:     ()                         => api.post('/api/job-actions/farmer/buy-plot'),
  markServicesRead:  ()                         => api.post('/api/job-actions/mark-services-read'),
}

export const jobsApi = {
  listings:   ()                        => api.get('/api/jobs/listings'),
  my:         ()                        => api.get('/api/jobs/my'),
  register:   (role, bio, hourlyRate)   => api.post('/api/jobs/register', { role, bio, hourlyRate }),
  update:     (bio, hourlyRate)         => api.patch('/api/jobs/my', { bio, hourlyRate }),
  unregister: ()                        => api.delete('/api/jobs/my'),
  rate:       (jobId, rating, review)   => api.post(`/api/jobs/${jobId}/rate`, { rating, review }),
  markServicesRead: ()                  => api.post('/api/jobs/mark-services-read'),
}

export const marketApi = {
  state:      ()                  => api.get('/api/market/state'),
  history:    (market, window)    => api.get(`/api/market/history/${market}?window=${window}`),
  positions:  ()                  => api.get('/api/market/my-positions'),
  invest:     (market, amount)    => api.post('/api/market/invest', { market, amount }),
  withdraw:   (market, amt)       => api.post('/api/market/withdraw', { market, ...(amt !== undefined && { withdrawAmount: amt }) }),
}

export const groveApi = {
  seedsLog:    ()                     => api.get('/api/grove/seeds-log'),
  seeds:       ()                       => api.get('/api/grove/seeds'),
  me:          ()                    => api.get('/api/grove/me'),
  connections: ()                    => api.get('/api/grove/connections'),
  leaderboard: ()                    => api.get('/api/grove/leaderboard'),
  invest:      (targetId, amount)    => api.post('/api/grove/invest', { targetId, amount }),
  withdraw:    (targetId, amount)     => api.post('/api/grove/withdraw', { targetId, ...(amount !== undefined && { withdrawAmount: amount }) }),
  history:     (userId, window)      => api.get(`/api/grove/history/${userId}?window=${window}`),
  spendSeeds:  (amount, reason, themeId) => api.post('/api/grove/spend', { amount, reason, themeId }),
}

export const profileApi = {
  me:      ()   => api.get('/api/profile/me'),
  get:     (id) => api.get(`/api/profile/${id}`),
}

export const momentsApi = {
  upload:      (data)   => api.post('/api/moments', data),
  mine:        ()       => api.get('/api/moments/mine'),
  tagged:      ()       => api.get('/api/moments/tagged'),
  connections: ()       => api.get('/api/moments/connections'),
  byUser:      (userId) => api.get(`/api/moments/by/${userId}`),
  like:        (id)     => api.post(`/api/moments/${id}/like`),
  comment:     (id, text) => api.post(`/api/moments/${id}/comment`, { text }),
  delComment:  (id)     => api.delete(`/api/moments/${id}/comment`),
  remove:      (id)     => api.delete(`/api/moments/${id}`),
}

export const notesApi = {
  feed:       ()              => api.get('/api/users/feed'),
  post:       (note, emoji)   => api.post('/api/users/daily-note', { note, noteEmoji: emoji }),
  like:       (userId, emoji) => api.post(`/api/users/${userId}/like-note`, { emoji }),
  friendNotes:()              => api.get('/api/users/friend-notes'),
}

export const notificationsApi = {
  get:     () => api.get('/api/notifications'),
  readAll: () => api.patch('/api/notifications/read'),
  readType: (type) => api.patch(`/api/notifications/read/${type}`),
  clear:   () => api.delete('/api/notifications/clear'),
  unread:  () => api.get('/api/notifications/unread-count'),
}
