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
