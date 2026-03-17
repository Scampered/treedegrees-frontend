// src/components/NotificationPrompt.jsx
// Shows a gentle "Allow notifications?" prompt on mobile for first-time users
import { useState, useEffect } from 'react'
import { requestNotificationPermission, getPermissionAsked, setPermissionAsked } from '../utils/notifications'

export default function NotificationPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show on mobile, only if not asked before, only if supported
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const notAsked = !getPermissionAsked()
    const supported = 'Notification' in window && Notification.permission === 'default'
    if (isMobile && notAsked && supported) {
      // Delay slightly so it doesn't pop up instantly
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  const allow = async () => {
    setPermissionAsked()
    setShow(false)
    await requestNotificationPermission()
  }

  const dismiss = () => {
    setPermissionAsked()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9998] slide-up">
      <div className="rounded-2xl bg-forest-900 border border-forest-700 shadow-2xl p-4 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-forest-100 text-sm font-medium">Enable notifications?</p>
          <p className="text-forest-500 text-xs mt-0.5">Get notified when letters arrive and streaks are at risk.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={allow}
              className="bg-forest-600 hover:bg-forest-500 text-white text-xs font-medium px-4 py-1.5 rounded-full transition-colors">
              Allow
            </button>
            <button onClick={dismiss}
              className="text-forest-500 hover:text-forest-300 text-xs px-3 py-1.5 transition-colors">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-forest-700 hover:text-forest-500 flex-shrink-0 text-lg">✕</button>
      </div>
    </div>
  )
}
