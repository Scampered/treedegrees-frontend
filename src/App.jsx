// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import MapPage from './pages/MapPage'
import FriendsPage from './pages/FriendsPage'
import FeedPage from './pages/FeedPage'
import LettersPage from './pages/LettersPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import GuidePage from './pages/GuidePage'
import GroupsPage from './pages/GroupsPage'
import GrovePage from './pages/GrovePage'
import GamesPage from './pages/GamesPage'
import TrumpCardGame from './pages/TrumpCardGame'
import VerifyEmailPage from './pages/VerifyEmailPage'
import MaintenanceGuard from './components/MaintenanceGuard'
import { adminApi } from './api/client'
import Layout from './components/Layout'

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!user) { setChecking(false); return }
    adminApi.me().then(r => setIsAdmin(r.data.isAdmin)).catch(() => {}).finally(() => setChecking(false))
  }, [user])

  if (loading || checking) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  // Gate unverified users — send them to verify page
  if (user.emailVerified === false) return <Navigate to="/verify" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function FullScreenLoader() {
  return (
    <div style={{ position:'fixed', inset:0, background:'var(--bg,#070d09)',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ position:'relative', width:52, height:52 }}>
          <div style={{
            width:52, height:52, borderRadius:'50%',
            border:'2px solid var(--border,rgba(35,55,40,0.45))',
            borderTopColor:'var(--accent,#4a6b4f)',
            animation:'spin 1s linear infinite',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ position:'absolute', inset:0, display:'flex',
                        alignItems:'center', justifyContent:'center', fontSize:22 }}>🌳</div>
        </div>
        <p style={{ color:'var(--t2,#5e7862)', fontSize:13, fontFamily:'Dosis,sans-serif' }}>
          Growing your tree…
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider><AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

          {/* Email verification — public route */}
          <Route path="/verify" element={<VerifyEmailPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MaintenanceGuard pageKey="map"><MapPage /></MaintenanceGuard>} />
            <Route path="/friends" element={<MaintenanceGuard pageKey="friends"><FriendsPage /></MaintenanceGuard>} />
            <Route path="/grove" element={<GrovePage />} />
          <Route path="/games" element={<GamesPage />} />
            <Route path="/games/trump-card/:id" element={<TrumpCardGame />} />
            <Route path="/feed" element={<MaintenanceGuard pageKey="feed"><FeedPage /></MaintenanceGuard>} />
            <Route path="/letters" element={<MaintenanceGuard pageKey="letters"><LettersPage /></MaintenanceGuard>} />
            <Route path="/settings" element={<MaintenanceGuard pageKey="settings"><SettingsPage /></MaintenanceGuard>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/groups" element={<GroupsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider></ThemeProvider>
  )
}
