// src/components/InstallAppCard.jsx
// Shows platform-appropriate install instructions + notification toggle
import { useState, useEffect } from 'react'
import {
  getDeviceType, isStandalone, canShowInstallPrompt,
  triggerInstallPrompt, getNotifPermission, requestNotifPermission,
  notificationsEnabled, startLetterPolling, stopLetterPolling,
} from '../utils/pwa'
import { lettersApi } from '../api/client'

export default function InstallAppCard() {
  const [device]          = useState(getDeviceType)
  const [standalone]      = useState(isStandalone)
  const [installable, setInstallable] = useState(canShowInstallPrompt)
  const [installed, setInstalled]     = useState(false)
  const [notifPerm, setNotifPerm]     = useState(getNotifPermission)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    const onInstallable = () => setInstallable(true)
    const onInstalled   = () => { setInstalled(true); setInstallable(false) }
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed',   onInstalled)
    return () => {
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed',   onInstalled)
    }
  }, [])

  // Start letter arrival polling when notifications are granted
  useEffect(() => {
    if (notificationsEnabled()) {
      startLetterPolling(() => lettersApi.list().then(r => r.data))
      return () => stopLetterPolling()
    }
  }, [notifPerm])

  const handleInstall = async () => {
    if (device === 'ios') {
      setShowIOSGuide(true)
      return
    }
    const accepted = await triggerInstallPrompt()
    if (accepted) setInstalled(true)
  }

  const handleNotifToggle = async () => {
    if (notifPerm === 'granted') {
      // Can't revoke programmatically — tell user how
      alert('To disable notifications, go to your browser or phone settings and revoke permission for this site.')
      return
    }
    const result = await requestNotifPermission()
    setNotifPerm(result)
  }

  // Already running as standalone app — only show notification toggle
  const alreadyInstalled = standalone || installed

  // Install section copy per platform
  const installInfo = {
    ios: {
      icon: '🍎',
      label: 'Add to Home Screen',
      desc: 'Install TreeDegrees as an iOS app',
    },
    android: {
      icon: '🤖',
      label: 'Install as Android App',
      desc: 'Add TreeDegrees to your home screen',
    },
    desktop: {
      icon: '💻',
      label: 'Install as Desktop App',
      desc: 'Run TreeDegrees in its own window like an app',
    },
  }

  const info = installInfo[device]

  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-forest-800">
        <p className="text-forest-200 font-medium">📲 App & Notifications</p>
        <p className="text-forest-600 text-xs mt-0.5">Install TreeDegrees and stay up to date</p>
      </div>

      <div className="divide-y divide-forest-800/50">

        {/* ── Install section ── */}
        {!alreadyInstalled && (
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <p className="text-forest-200 text-sm font-medium">{info.label}</p>
                  <p className="text-forest-500 text-xs mt-0.5">{info.desc}</p>
                </div>
              </div>
              {(installable || device === 'ios') && (
                <button onClick={handleInstall}
                  className="flex-shrink-0 bg-forest-600 hover:bg-forest-500 text-white text-xs font-medium px-4 py-2 rounded-full transition-colors">
                  {device === 'ios' ? 'How to' : 'Install'}
                </button>
              )}
              {device !== 'ios' && !installable && (
                <span className="text-forest-700 text-xs">Open in Chrome/Edge to install</span>
              )}
            </div>

            {/* iOS step-by-step guide */}
            {showIOSGuide && device === 'ios' && (
              <div className="mt-4 rounded-xl bg-forest-800/50 border border-forest-700 p-4 space-y-3">
                <p className="text-forest-300 text-xs font-medium uppercase tracking-wide">How to install on iPhone / iPad</p>
                {[
                  { step: '1', text: 'Tap the Share button at the bottom of Safari (the box with an arrow up)' },
                  { step: '2', text: 'Scroll down and tap "Add to Home Screen"' },
                  { step: '3', text: 'Tap "Add" in the top right corner' },
                  { step: '4', text: 'TreeDegrees will appear on your home screen like any other app!' },
                ].map(s => (
                  <div key={s.step} className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-forest-700 border border-forest-600 flex items-center justify-center text-forest-300 text-xs flex-shrink-0 mt-0.5">{s.step}</span>
                    <p className="text-forest-400 text-sm leading-relaxed">{s.text}</p>
                  </div>
                ))}
                <button onClick={() => setShowIOSGuide(false)} className="text-forest-600 text-xs hover:text-forest-400 transition-colors">
                  Got it ✓
                </button>
              </div>
            )}
          </div>
        )}

        {alreadyInstalled && (
          <div className="px-5 py-3 flex items-center gap-2">
            <span className="text-forest-500 text-sm">✅ Running as app</span>
          </div>
        )}

        {/* ── Notifications toggle ── */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-forest-200 text-sm font-medium">🔔 Push Notifications</p>
              <p className="text-forest-500 text-xs mt-0.5">
                {notifPerm === 'granted'
                  ? 'You\'ll be notified for letters and streak warnings'
                  : notifPerm === 'denied'
                  ? 'Blocked — enable in your browser/phone settings'
                  : 'Get notified when letters arrive or streaks are at risk'}
              </p>
            </div>

            {notifPerm === 'denied' ? (
              <span className="text-red-500 text-xs flex-shrink-0">Blocked</span>
            ) : notifPerm === 'unsupported' ? (
              <span className="text-forest-700 text-xs flex-shrink-0">Not supported</span>
            ) : (
              <button onClick={handleNotifToggle}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200
                  ${notifPerm === 'granted' ? 'bg-forest-600' : 'bg-forest-800'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                  ${notifPerm === 'granted' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            )}
          </div>

          {/* What you'll get notified about */}
          {notifPerm === 'granted' && (
            <div className="mt-3 space-y-1.5">
              {[
                ['✉️', 'Letters arriving in your mailbox'],
                ['⌛', 'Streaks with only 1 fuel left'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-2 text-xs text-forest-500">
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
