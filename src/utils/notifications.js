// src/utils/notifications.js
export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch (err) {
    console.warn('SW registration failed:', err)
    return null
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

export function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator
}

export async function showLocalNotification(title, body, url = '/dashboard', tag = 'td') {
  if (!canNotify()) return
  try {
    const reg = await navigator.serviceWorker.ready
    reg.showNotification(title, {
      body, icon: '/tree-icon.svg', badge: '/tree-icon.svg',
      tag, data: { url }, vibrate: [200, 100, 200],
    })
  } catch {}
}

export function getPermissionAsked() {
  return localStorage.getItem('td_notif_asked')
}
export function setPermissionAsked() {
  localStorage.setItem('td_notif_asked', 'yes')
}

// ── Web Push subscription ─────────────────────────────────────────────────────
// Call after notification permission is granted to enable background push
export async function subscribeToPush(apiBase = '') {
  if (!('PushManager' in window)) return false
  try {
    const vapidRes = await fetch(`${apiBase}/api/push/vapid-key`)
    if (!vapidRes.ok) return false
    const { publicKey } = await vapidRes.json()
    if (!publicKey) return false

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    // Save subscription on backend
    const token = localStorage.getItem('td_token')
    await fetch(`${apiBase}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(sub.toJSON()),
    })
    return true
  } catch (e) { console.warn('[Push] subscribe failed:', e.message); return false }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
