// src/utils/pwa.js
// PWA install prompt + notification utilities

// ── Device detection ──────────────────────────────────────────────────────────
export function getDeviceType() {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

// ── Install prompt (Android / Desktop) ───────────────────────────────────────
// The browser fires 'beforeinstallprompt' on Android & Desktop Chrome/Edge.
// We capture it so we can show it on demand.
let _deferredPrompt = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  _deferredPrompt = e
  // Notify any listeners
  window.dispatchEvent(new Event('pwa-installable'))
})

window.addEventListener('appinstalled', () => {
  _deferredPrompt = null
  window.dispatchEvent(new Event('pwa-installed'))
})

export function canShowInstallPrompt() {
  return !!_deferredPrompt
}

export async function triggerInstallPrompt() {
  if (!_deferredPrompt) return false
  _deferredPrompt.prompt()
  const { outcome } = await _deferredPrompt.userChoice
  _deferredPrompt = null
  return outcome === 'accepted'
}

// ── Notification permission ───────────────────────────────────────────────────
export function getNotifPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestNotifPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function notificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator
}

// ── Show a local notification via the service worker ─────────────────────────
export async function showNotification(title, body, url = '/dashboard', tag = 'td') {
  if (!notificationsEnabled()) return
  try {
    const reg = await navigator.serviceWorker.ready
    reg.showNotification(title, {
      body,
      icon: '/tree-icon.svg',
      badge: '/tree-icon.svg',
      tag,
      data: { url },
      vibrate: [200, 100, 200],
    })
  } catch {}
}

// ── Streak warning notification ───────────────────────────────────────────────
export async function notifyStreakWarning(friendName, fuelLeft) {
  if (fuelLeft === 1) {
    await showNotification(
      '⌛ Streak about to break!',
      `Your streak with ${friendName} has 1 fuel left. Send a letter before midnight!`,
      '/letters',
      `streak-${friendName}`
    )
  }
}

// ── Letter arrived notification ───────────────────────────────────────────────
export async function notifyLetterArrived(senderName, vehicleEmoji) {
  await showNotification(
    `${vehicleEmoji} Letter arrived!`,
    `${senderName} sent you a letter. Open it now!`,
    '/letters',
    `letter-${senderName}-${Date.now()}`
  )
}

// Polling: check for arrived letters and fire notifications
let _letterPollInterval = null
let _lastKnownLetterIds = new Set()

export function startLetterPolling(getLettersFn, intervalMs = 60000) {
  if (_letterPollInterval) return
  _letterPollInterval = setInterval(async () => {
    try {
      const letters = await getLettersFn()
      for (const l of letters) {
        if (!l.isInbox || l.inTransit) continue
        if (_lastKnownLetterIds.has(l.id)) continue
        // New arrived letter we haven't seen
        _lastKnownLetterIds.add(l.id)
        await notifyLetterArrived(l.senderName, l.vehicleEmoji || '✉️')
      }
    } catch {}
  }, intervalMs)
}

export function stopLetterPolling() {
  if (_letterPollInterval) {
    clearInterval(_letterPollInterval)
    _letterPollInterval = null
  }
}
