// src/components/Layout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: '🌿', label: 'Dashboard' },
  { to: '/map',       icon: '🗺️',  label: 'Globe Map' },
  { to: '/friends',   icon: '🌱', label: 'Connections' },
  { to: '/feed',      icon: '📋', label: 'Daily Notes' },
  { to: '/settings',  icon: '⚙️',  label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-forest-950">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 flex-col glass-dark border-r border-forest-800
        transform transition-transform duration-300 lg:static lg:translate-x-0 lg:flex
        ${mobileOpen ? 'flex translate-x-0' : '-translate-x-full'}
      `}>
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
          <p className="text-forest-200 font-medium text-sm truncate">{user?.fullName}</p>
          <p className="text-forest-500 text-xs mt-0.5">{user?.city}, {user?.country}</p>
          <p className="friend-code text-forest-400 text-xs mt-1.5 tracking-widest">{user?.friendCode}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                 ${isActive
                   ? 'bg-forest-700 text-forest-100 shadow-sm'
                   : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-forest-800">
          <button onClick={handleLogout} className="btn-ghost w-full text-sm">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-forest-800 glass-dark sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-forest-400 hover:text-forest-200 hover:bg-forest-800 transition-colors"
          >
            ☰
          </button>
          <span className="font-display text-forest-200">🌳 TreeDegrees</span>
        </div>

        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
