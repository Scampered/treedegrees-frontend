// public/sw.js — TreeDegrees Service Worker
const CACHE_NAME = 'treedegrees-v2'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(clients.claim()))

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title || 'TreeDegrees', {
      body: data.body || '',
      icon: '/tree-icon.svg',
      badge: '/tree-icon.svg',
      tag: data.tag || 'treedegrees',
      data: { url: data.url || '/dashboard' },
      vibrate: [200, 100, 200],
    })
  )
})

// ── Notification click → open/focus app ──────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})

// ── Message from page: update badge count ────────────────────────────────────
// Pages send { type: 'SET_BADGE', count: N } to update the app icon badge
self.addEventListener('message', e => {
  if (e.data?.type === 'SET_BADGE') {
    const count = e.data.count || 0
    // Navigator Badge API (supported on Android PWA, some desktop)
    if ('setAppBadge' in navigator) {
      if (count > 0) navigator.setAppBadge(count).catch(() => {})
      else navigator.clearAppBadge().catch(() => {})
    }
  }
})
