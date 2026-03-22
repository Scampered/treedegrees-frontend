// src/components/Layout.jsx
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { registerSW } from '../utils/notifications'
import NotificationPrompt from './NotificationPrompt'
import { lettersApi } from '../api/client'
import PopupSystem from './PopupSystem'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const sidebarItems = [
  { to: '/dashboard', icon: '🌿', fullLabel: 'Dashboard'   },
  { to: '/grove',     icon: '🪴',  fullLabel: 'Grove'       },
  { to: '/map',       icon: '🗺️',  fullLabel: 'Globe Map'   },
  { to: '/friends',   icon: '🌱',  fullLabel: 'Connections' },
  { to: '/groups',    icon: '☘️',  fullLabel: 'Groups',     extra: '🎮', extraTo: '/games' },
  { to: '/letters',   icon: '✉️',   fullLabel: 'Letters'     },
  { to: '/feed',      icon: '📝',  fullLabel: 'Notes'       },
  { to: '/guide',     icon: '📖',  fullLabel: 'Guide'       },
]

const mobileNavItems = [
  { to: '/grove',     icon: '🪴', label: 'Grove'   },
  { to: '/map',       icon: '🗺️', label: 'Map'     },
  { to: '/dashboard', icon: '🌳', label: 'Home',   isCenter: true },
  { to: '/letters',   icon: '✉️',  label: 'Letters' },
  { key: 'more',      icon: '☰',  label: 'More',   isMore: true },
]

const moreItems = [
  { to: '/friends',  icon: '🌿', label: 'Connections' },
  { to: '/groups',   icon: '☘️', label: 'Groups'      },
  { to: '/games',    icon: '🎮', label: 'Games'       },
  { to: '/guide',    icon: '📖', label: 'Guide'       },
  { to: '/settings', icon: '⚙️', label: 'Settings'    },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { applyForUser } = useTheme()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [unreadLetters, setUnreadLetters] = useState(0)
  const [groupInvites, setGroupInvites]   = useState(0)
  const [showMore, setShowMore]           = useState(false)

  useEffect(() => { registerSW() }, [])
  useEffect(() => { if (user) applyForUser(user) }, [user?.id]) // eslint-disable-line
  useEffect(() => { setShowMore(false) }, [location.pathname])

  useEffect(() => {
    function checkUnread() {
      lettersApi.list().then(r => {
        const count = r.data.filter(l => l.isInbox && !l.openedAt && !l.inTransit).length
        setUnreadLetters(count)
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
      window.addEventListener('letter-read', checkUnread)

      import('../api/client').then(({ lettersApi: la }) => {
        la.streaks().then(r => {
          const atRisk = (r.data || []).filter(s => s.streakDays > 0 && s.fuel === 1)
          if (atRisk.length === 0) return
          import('../utils/notifications').then(({ showLocalNotification }) => {
            if (atRisk.length === 1) {
              showLocalNotification(
                '⌛ Streak about to break!',
                `Send a letter to ${atRisk[0].displayName} before midnight to keep your streak alive.`,
                '/letters', 'streak-warning'
              )
            } else {
              showLocalNotification(
                `⌛ ${atRisk.length} streaks about to break!`,
                `Send letters to ${atRisk.map(s=>s.displayName).join(', ')} before midnight.`,
                '/letters', 'streak-warning'
              )
            }
          })
        }).catch(() => {})
      })

      import('../api/client').then(m => {
        const fn = async () => {
          try {
            const res = await m.default.get('/api/groups/notifications')
            const data = res.data || {}
            const friendReqs   = data.friendRequests || []
            const groupInvs    = data.groupInvites   || []
            const groupLetters = data.groupLetters   || []

            if (groupInvs.length > 0) setGroupInvites(n => n + groupInvs.length)

            import('../utils/pwa').then(({ showNotification, notificationsEnabled }) => {
              if (!notificationsEnabled()) return
              for (const n of friendReqs)
                showNotification('🌱 New connection request!', `${n.fromName} wants to connect with you.`, '/friends', `freq-${n.friendshipId}`)
              for (const n of groupInvs)
                showNotification('☘️ Group invite!', `${n.inviterName} invited you to "${n.groupName}"`, '/groups', `ginv-${n.groupId}`)
              for (const n of groupLetters)
                showNotification(`☘️ ${n.groupName}`, `${n.senderName} sent a message`, '/groups', `gltr-${n.groupId}-${Date.now()}`)
            })
          } catch {}
        }
        fn()
        const fiv = setInterval(fn, 60000)
        return () => clearInterval(fiv)
      })

      return () => {
        clearInterval(iv)
        window.removeEventListener('letter-read', checkUnread)
      }
    }
  }, [user])

  const handleLogout = () => { logout(); navigate('/') }
  const isMap = location.pathname === '/map'

  const badgeFor = (to) => {
    if (to === '/letters') return unreadLetters
    if (to === '/groups')  return groupInvites
    return 0
  }

  return (
    <div className="flex h-screen overflow-hidden bg-forest-950">

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
          {sidebarItems.map(({ to, icon, fullLabel, extra, extraTo }) => (
            <div key={to} className="flex items-center gap-1">
              <NavLink to={to}
                className={({ isActive }) =>
                  `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                   ${isActive ? 'bg-forest-700 text-forest-100' : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`
                }>
                <span className="text-base">{icon}</span>
                <span className="flex-1">{fullLabel}</span>
                {badgeFor(to) > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                    {badgeFor(to) > 9 ? '9+' : badgeFor(to)}
                  </span>
                )}
              </NavLink>
              {extra && extraTo && (
                <NavLink to={extraTo} title="Games"
                  className={({ isActive }) =>
                    `w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors flex-shrink-0
                     ${isActive ? 'bg-forest-700 text-forest-100' : 'text-forest-600 hover:text-forest-300 hover:bg-forest-900'}`
                  }>
                  {extra}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-forest-800 flex items-center gap-2">
          <NavLink to="/settings"
            className={({ isActive }) =>
              `w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-colors
               ${isActive ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-200 hover:bg-forest-900'}`
            }
            title="Settings">
            ⚙️
          </NavLink>
          <button onClick={handleLogout} className="btn-ghost flex-1 text-sm">Sign out</button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 ${isMap ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-forest-800 glass-dark flex-shrink-0 z-20">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/tree-icon.svg" alt="TreeDegrees" className="w-7 h-7 rounded-lg" />
            <span className="font-display text-forest-200 text-base">TreeDegrees</span>
          </Link>
          <Link to="/feed"
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors
              ${location.pathname === '/feed'
                ? 'bg-forest-700 text-forest-100'
                : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`}>
            <span className="text-lg">📝</span>
            <span className="text-sm font-medium">Notes</span>
          </Link>
        </div>

        <div className={`flex-1 min-h-0 ${isMap ? 'overflow-hidden' : 'overflow-y-auto'} lg:pb-0 pb-16`}>
          <Outlet />
        </div>
      </main>

      <PopupSystem />
      <NotificationPrompt />

      {showMore && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-0 right-0 mx-3 mb-1" onClick={e => e.stopPropagation()}>
            <div className="rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-forest-800 flex items-center justify-between">
                <p className="text-forest-400 text-xs uppercase tracking-wide">More options</p>
                <button onClick={() => setShowMore(false)} className="text-forest-600 hover:text-forest-300 w-6 h-6 flex items-center justify-center">x</button>
              </div>
              <div className="p-2">
                {moreItems.map(item => (
                  <Link key={item.to} to={item.to}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors
                      ${location.pathname === item.to ? 'bg-forest-700' : 'hover:bg-forest-900'}`}>
                    <span className="text-2xl w-8 text-center">{item.icon}</span>
                    <span className="text-forest-100 font-medium flex-1">{item.label}</span>
                    {badgeFor(item.to) > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                        {badgeFor(item.to) > 9 ? '9+' : badgeFor(item.to)}
                      </span>
                    )}
                    <span className="text-forest-700">›</span>
                  </Link>
                ))}
              </div>
              <div className="px-5 pb-4 pt-1 border-t border-forest-800 mt-1">
                <button onClick={handleLogout}
                  className="w-full text-forest-500 hover:text-forest-300 text-sm py-2.5 rounded-xl hover:bg-forest-900 transition-colors">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16
        bg-forest-950/95 backdrop-blur-md border-t border-forest-800 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileNavItems.map(({ to, key, icon, label, isCenter, isMore }) => {
          const badge    = to ? badgeFor(to) : 0

          if (isCenter) return (
            <NavLink key={to} to={to}
              className={() => `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${location.pathname === to ? 'text-white' : 'text-forest-400'}`}>
              {({ isActive }) => (
                <>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all duration-150 -mt-5 border-2
                    ${isActive ? 'bg-forest-500 border-forest-300 scale-110 shadow-forest-500/50' : 'bg-forest-800 border-forest-600 hover:bg-forest-700'}`}>
                    {icon}
                  </div>
                  <span className="text-[9px] font-medium leading-none mt-1">{label}</span>
                </>
              )}
            </NavLink>
          )

          if (isMore) return (
            <button key="more" onClick={() => setShowMore(s => !s)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative
                ${showMore ? 'text-forest-300' : 'text-forest-600 hover:text-forest-400'}`}>
              {showMore && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-forest-400" />}
              <div className="relative">
                <span className={`text-xl block transition-transform ${showMore ? 'scale-110' : 'scale-100'}`}>{icon}</span>
                {groupInvites > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {groupInvites > 9 ? '9+' : groupInvites}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          )

          return (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative
                 ${isActive ? 'text-forest-300' : 'text-forest-600 hover:text-forest-400'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-forest-400" />}
                  <div className="relative">
                    <span className={`text-xl block transition-transform ${isActive ? 'scale-110' : 'scale-100'}`}>{icon}</span>
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

    </div>
  )
}
