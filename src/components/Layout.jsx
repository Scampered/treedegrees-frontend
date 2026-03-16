// src/components/Layout.jsx
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Desktop sidebar + mobile bottom nav items
// Map gets a special full-label on desktop, short on mobile
const navItems = [
  { to: '/dashboard', icon: '🌿', label: 'Home',        fullLabel: 'Dashboard'    },
  { to: '/map',       icon: '🗺️',  label: 'Map',         fullLabel: 'Globe Map'    },
  { to: '/friends',   icon: '🌱',  label: 'Friends',     fullLabel: 'Connections'  },
  { to: '/feed',      icon: '📋',  label: 'Notes',       fullLabel: 'Daily Notes'  },
  { to: '/settings',  icon: '⚙️',  label: 'Settings',    fullLabel: 'Settings'     },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/') }
  const isMap = location.pathname === '/map'

  return (
    <div className="flex h-screen overflow-hidden bg-forest-950">

      {/* ── Desktop Sidebar (lg+) ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 glass-dark border-r border-forest-800">
        {/* Logo */}
        <div className="p-6 border-b border-forest-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-forest-700 flex items-center justify-center text-xl">🌳</div>
            <div>
              <h1 className="font-display text-forest-100 text-lg leading-none">TreeDegrees</h1>
              <p className="text-forest-500 text-xs mt-0.5">Social Graph</p>
            </div>
          </div>
        </div>

        {/* User chip */}
        <div className="px-4 py-3 mx-4 mt-4 rounded-xl bg-forest-900/60 border border-forest-800">
          <p className="text-forest-200 font-medium text-sm truncate">{user?.nickname || user?.fullName}</p>
          <p className="text-forest-500 text-xs mt-0.5">{user?.city}, {user?.country}</p>
          <p className="friend-code text-forest-400 text-xs mt-1.5 tracking-widest">{user?.friendCode}</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon, fullLabel }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                 ${isActive ? 'bg-forest-700 text-forest-100' : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`
              }
            >
              <span className="text-base">{icon}</span>
              {fullLabel}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-forest-800">
          <button onClick={handleLogout} className="btn-ghost w-full text-sm">Sign out</button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-w-0 ${isMap ? 'overflow-hidden' : 'overflow-y-auto'}`}>

        {/* Mobile top bar — just logo + nickname, no hamburger */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-forest-800 glass-dark flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌳</span>
            <span className="font-display text-forest-200 text-base">TreeDegrees</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-forest-400 text-sm">{user?.nickname || user?.fullName?.split(' ')[0]}</span>
            <div className="w-7 h-7 rounded-full bg-forest-700 flex items-center justify-center text-xs text-forest-200">
              {(user?.nickname || user?.fullName || '?')[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className={`flex-1 min-h-0
          ${isMap ? 'overflow-hidden' : 'overflow-y-auto'}
          lg:pb-0 pb-16`}>
          {/* pb-16 on mobile leaves room above the bottom nav bar */}
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav (< lg) ──────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch h-16
        bg-forest-950/95 backdrop-blur-md border-t border-forest-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 relative
               ${isActive ? 'text-forest-300' : 'text-forest-600 hover:text-forest-400'}`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator pill at top */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-forest-400" />
                )}
                <span className={`text-xl transition-transform duration-150 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  {icon}
                </span>
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
