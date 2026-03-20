// src/components/Layout.jsx
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { registerSW } from '../utils/notifications'
import { startLetterPolling, notificationsEnabled } from '../utils/pwa'
import NotificationPrompt from './NotificationPrompt'
import { lettersApi } from '../api/client'
import PopupSystem from './PopupSystem'
import { useAuth } from '../context/AuthContext'

// Desktop sidebar nav — full list
const sidebarItems = [
  { to: '/dashboard', icon: '🌿', fullLabel: 'Dashboard'   },
  { to: '/map',       icon: '🗺️',  fullLabel: 'Globe Map'   },
  { to: '/friends',   icon: '🌱',  fullLabel: 'Connections' },
  { to: '/groups',    icon: '☘️',  fullLabel: 'Groups'      },
  { to: '/feed',      icon: '📋',  fullLabel: 'Daily Notes' },
  { to: '/letters',   icon: '✉️',   fullLabel: 'Letters'     },
  { to: '/settings',  icon: '⚙️',  fullLabel: 'Settings'    },
  { to: '/guide',     icon: '📖',  fullLabel: 'Guide'       },
]

// Mobile bottom nav — 5 items, Home dead centre, NO Letters (moved to topbar)
const mobileNavItems = [
  { to: '/map',      icon: '🗺️',  label: 'Map'      },
  { to: '/friends',  icon: '🌱',  label: 'Friends', altTo: '/groups', altIcon: '☘️', altLabel: 'Groups' },
  { to: '/dashboard',icon: '🌳',  label: 'Home', isCenter: true },
  { to: '/feed',     icon: '📋',  label: 'Notes'    },
  { to: '/settings', icon: '⚙️',  label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadLetters, setUnreadLetters] = useState(0)
  const [friendsToggled, setFriendsToggled] = useState(false)

  useEffect(() => { registerSW() }, [])

  useEffect(() => {
    function checkUnread() {
      lettersApi.list().then(r => {
        const count = r.data.filter(l => l.isInbox && !l.openedAt && !l.inTransit).length
        setUnreadLetters(count)
        // Update app icon badge (Android PWA / desktop)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SET_BADGE', count })
        } else if ('setAppBadge' in navigator) {
          count > 0 ? navigator.setAppBadge(count).catch(() => {}) : navigator.clearAppBadge().catch(() => {})
        }
      }).catch(() => {})
    }
    if (user) {
      checkUnread()
      const iv = setInterval(checkUnread, 30000)
      // Instant refresh when LettersPage marks a letter as read
      window.addEventListener('letter-read', checkUnread)

      // Check streaks for ⌛ warning notifications (once on load)
      import('../api/client').then(({ lettersApi: la }) => {
        la.streaks().then(r => {
          const atRisk = (r.data || []).filter(s => s.streakDays > 0 && s.fuel === 1)
          for (const s of atRisk) {
            import('../utils/pwa').then(({ notifyStreakWarning }) => {
              notifyStreakWarning(s.displayName, 1)
            })
          }
        }).catch(() => {})
      })

      // Poll for new friend requests to notify about
      async function checkFriendNotifications() {
        try {
          const { default: ax } = await import('../api/client')
          const res = await ax.lettersApi?.notifications?.()
          // notifications endpoint is on groups route
        } catch {}
      }

      // Import and poll friend request notifications
      import('../api/client').then(m => {
        const fn = async () => {
          try {
            const res = await m.default.get('/api/groups/notifications')
            for (const n of (res.data || [])) {
              import('../utils/pwa').then(({ showNotification, notificationsEnabled }) => {
                if (notificationsEnabled()) {
                  showNotification(
                    '🌱 New connection request!',
                    `${n.fromName} wants to connect with you.`,
                    '/friends', `friend-req-${n.friendshipId}`
                  )
                }
              })
            }
          } catch {}
        }
        fn()
        const fiv = setInterval(fn, 60000)
        return fiv
      }).then(fiv => {
        // store interval id for cleanup — handled by outer scope
      })

      return () => {
        clearInterval(iv)
        window.removeEventListener('letter-read', checkUnread)
      }
    }
  }, [user])

  const handleLogout = () => { logout(); navigate('/') }
  const isMap = location.pathname === '/map'

  return (
    <div className="flex h-screen overflow-hidden bg-forest-950">

      {/* ── Desktop Sidebar (lg+) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 glass-dark border-r border-forest-800">
        <Link to="/dashboard" className="block p-6 border-b border-forest-800 hover:bg-forest-900/40 transition-colors">
          <div className="flex items-center gap-3">
            <img src="/tree-icon.svg" alt="TreeDegrees" className="w-9 h-9 rounded-lg" />
            <div>
              <h1 className="font-display text-forest-100 text-lg leading-none">TreeDegrees</h1>
              <p className="text-forest-500 text-xs mt-0.5">Social Graph</p>
            </div>
          </div>
        </Link>

        <div className="px-4 py-3 mx-4 mt-4 rounded-xl bg-forest-900/60 border border-forest-800">
          <p className="text-forest-200 font-medium text-sm truncate">{user?.nickname || user?.fullName}</p>
          <p className="text-forest-500 text-xs mt-0.5">{user?.city}, {user?.country}</p>
          <p className="friend-code text-forest-400 text-xs mt-1.5 tracking-widest">{user?.friendCode}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map(({ to, icon, fullLabel }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                 ${isActive ? 'bg-forest-700 text-forest-100' : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`
              }
            >
              <span className="text-base">{icon}</span>
              <span className="flex-1">{fullLabel}</span>
              {to === '/letters' && unreadLetters > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {unreadLetters > 9 ? '9+' : unreadLetters}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-forest-800">
          <button onClick={handleLogout} className="btn-ghost w-full text-sm">Sign out</button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-w-0 ${isMap ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        {/* Mobile top bar — logo left, letters button right */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-forest-800 glass-dark flex-shrink-0 z-20">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/tree-icon.svg" alt="TreeDegrees" className="w-7 h-7 rounded-lg" />
            <span className="font-display text-forest-200 text-base">TreeDegrees</span>
          </Link>

          {/* Letters button with unread badge */}
          <Link to="/letters"
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors
              ${location.pathname === '/letters'
                ? 'bg-forest-700 text-forest-100'
                : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`}>
            <span className="text-lg">✉️</span>
            <span className="text-sm font-medium hidden xs:inline">Letters</span>
            {unreadLetters > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
                {unreadLetters > 9 ? '9+' : unreadLetters}
              </span>
            )}
          </Link>
        </div>

        {/* Page content */}
        <div className={`flex-1 min-h-0
          ${isMap ? 'overflow-hidden' : 'overflow-y-auto'}
          lg:pb-0 pb-16`}>
          <Outlet />
        </div>
      </main>

      <PopupSystem />
      <NotificationPrompt />

      {/* ── Mobile Bottom Nav (5 items, Home centred) ─────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16
        bg-forest-950/95 backdrop-blur-md border-t border-forest-800 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mobileNavItems.map(({ to, icon, label, isCenter, altTo, altIcon, altLabel }) => {
          const effectiveTo    = (altTo && friendsToggled) ? altTo    : to
          const effectiveIcon  = (altTo && friendsToggled) ? altIcon  : icon
          const effectiveLabel = (altTo && friendsToggled) ? altLabel : label
          const isCurrentPath  = location.pathname === effectiveTo || (altTo && location.pathname === to && !friendsToggled) || (altTo && location.pathname === altTo && friendsToggled)

          return (
            <NavLink
              key={to}
              to={effectiveTo}
              onClick={altTo ? (e) => {
                // If already on friends or groups, toggle to the other
                if (location.pathname === to) {
                  e.preventDefault()
                  setFriendsToggled(t => !t)
                  import('react-router-dom').then(m => {})
                  window.location.href = friendsToggled ? to : altTo
                } else {
                  setFriendsToggled(location.pathname === altTo)
                }
              } : undefined}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 relative
                 ${isCenter ? 'relative' : ''}
                 ${(isActive || location.pathname === effectiveTo)
                   ? isCenter ? 'text-white' : 'text-forest-300'
                   : isCenter ? 'text-forest-400' : 'text-forest-600 hover:text-forest-400'}`
              }
            >
              {({ isActive }) => (
                <>
                  {(isActive || location.pathname === effectiveTo) && !isCenter && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-forest-400" />
                  )}

                  {isCenter ? (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                      shadow-lg transition-all duration-150 -mt-5 border-2
                      ${(isActive || location.pathname === '/dashboard')
                        ? 'bg-forest-500 border-forest-300 scale-110 shadow-forest-500/50'
                        : 'bg-forest-800 border-forest-600 hover:bg-forest-700'}`}>
                      {effectiveIcon}
                    </div>
                  ) : (
                    <div className="relative">
                      <span className={`text-xl transition-transform duration-150 block ${(isActive || location.pathname === effectiveTo) ? 'scale-110' : 'scale-100'}`}>
                        {effectiveIcon}
                      </span>
                      {to === '/letters' && unreadLetters > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                          {unreadLetters > 9 ? '9+' : unreadLetters}
                        </span>
                      )}
                    </div>
                  )}

                  <span className={`font-medium leading-none ${isCenter ? 'text-[9px] mt-1' : 'text-[10px]'}`}>
                    {effectiveLabel}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

    </div>
  )
}
