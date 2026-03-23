// src/utils/pwa.js — PWA install prompt + notification utilities
import { lettersApi } from '../api/client'

// ── Install prompt ────────────────────────────────────────────────────────────
let _deferredPrompt = null
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _deferredPrompt = e; window.dispatchEvent(new Event('pwa-installable')) })
window.addEventListener('appinstalled', () => { _deferredPrompt = null; window.dispatchEvent(new Event('pwa-installed')) })

export function isPWAInstallable() { return !!_deferredPrompt }
export async function triggerInstallPrompt() {
  if (!_deferredPrompt) return false
  _deferredPrompt.prompt()
  const { outcome } = await _deferredPrompt.userChoice
  _deferredPrompt = null
  return outcome === 'accepted'
}
export function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

// ── Notification permission ───────────────────────────────────────────────────
export function notificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator
}

// ── Show a local notification via the service worker ─────────────────────────
// tag deduplication: same tag replaces the previous notification silently
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

// ── Streak warning ────────────────────────────────────────────────────────────
export async function notifyStreakWarning(friendName) {
  await showNotification(
    '⌛ Streak at risk!',
    `Send a letter to ${friendName} before midnight.`,
    '/letters',
    'streak-warning'
  )
}

// ── Letter arrival notification ───────────────────────────────────────────────
export async function notifyLetterArrived(senderName, vehicleEmoji) {
  await showNotification(
    `${vehicleEmoji} Letter arrived!`,
    `${senderName} sent you a letter. Open it now!`,
    '/letters',
    `letter-arrived-${senderName}` // stable tag so same sender doesn't stack
  )
}

// ── Letter polling — persists seen IDs in localStorage ───────────────────────
// This is the ONLY place letter arrival notifications are fired.
// IDs are stored in localStorage so they survive page refreshes.
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
// Seed the seen set from current letter list on startup — prevents spam on app open
async function seedSeenIds() {
  try {
    const r = await lettersApi.list()
    const letters = r.data || []
    // Mark ALL currently arrived inbox letters as already seen
    // Only NEW arrivals after this point will trigger a notification
    for (const l of letters) {
      if (l.isInbox && !l.inTransit) addSeenId(l.id)
    }
  } catch {}
}

export function startLetterPolling(intervalMs = 60000) {
  if (_letterPollInterval) return
  // Seed seen IDs first — this prevents the "spam on open" bug
  seedSeenIds().then(() => {
    _letterPollInterval = setInterval(async () => {
      if (!notificationsEnabled()) return
      try {
        const r = await lettersApi.list()
        const letters = r.data || []
        const seen = getSeenIds()
        for (const l of letters) {
          if (!l.isInbox || l.inTransit) continue
          if (seen.has(l.id)) continue
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
