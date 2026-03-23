// src/utils/pwa.js — PWA install + notifications
import { lettersApi } from '../api/client'

// ── Device & install helpers ──────────────────────────────────────────────────
export function getDeviceType() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

let _deferredPrompt = null
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); _deferredPrompt = e
  window.dispatchEvent(new Event('pwa-installable'))
})
window.addEventListener('appinstalled', () => {
  _deferredPrompt = null
  window.dispatchEvent(new Event('pwa-installed'))
})

export function canShowInstallPrompt() { return !!_deferredPrompt }

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
  if (result === 'granted') {
    // Subscribe to Web Push for background notifications
    import('./notifications').then(({ subscribeToPush }) => {
      subscribeToPush().catch(() => {})
    })
  }
  return result
}

export function notificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator
}

// ── Show notification via service worker ─────────────────────────────────────
export async function showNotification(title, body, url = '/dashboard', tag = 'td') {
  if (!notificationsEnabled()) return
  try {
    const reg = await navigator.serviceWorker.ready
    reg.showNotification(title, {
      body, icon: '/tree-icon.svg', badge: '/tree-icon.svg',
      tag, data: { url }, vibrate: [200, 100, 200],
    })
  } catch {}
}

export async function notifyLetterArrived(senderName, vehicleEmoji) {
  await showNotification(
    `${vehicleEmoji} Letter arrived!`,
    `${senderName} sent you a letter. Open it now!`,
    '/letters',
    `letter-arrived-${senderName}`
  )
}

// ── Letter polling — persists seen IDs across refreshes ──────────────────────
let _letterPollInterval = null

function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem('td_notif_seen') || '[]')) }
  catch { return new Set() }
}
function addSeenId(id) {
  try {
    const ids = getSeenIds(); ids.add(id)
    localStorage.setItem('td_notif_seen', JSON.stringify([...ids].slice(-500)))
  } catch {}
}

// Seed all currently-arrived letters as seen so we don't spam on app open
async function seedSeenIds() {
  try {
    const r = await lettersApi.list()
    for (const l of (r.data || [])) {
      if (l.isInbox && !l.inTransit) addSeenId(l.id)
    }
  } catch {}
}

export function startLetterPolling(intervalMs = 60000) {
  if (_letterPollInterval) return
  seedSeenIds().then(() => {
    _letterPollInterval = setInterval(async () => {
      if (!notificationsEnabled()) return
      try {
        const r = await lettersApi.list()
        const seen = getSeenIds()
        for (const l of (r.data || [])) {
          if (!l.isInbox || l.inTransit || seen.has(l.id)) continue
          addSeenId(l.id)
          await notifyLetterArrived(l.senderName, l.vehicleEmoji || '✉️')
        }
      } catch {}
    }, intervalMs)
  })
}

export function stopLetterPolling() {
  if (_letterPollInterval) { clearInterval(_letterPollInterval); _letterPollInterval = null }
}
