// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('td_token')
    if (!token) { setLoading(false); return }

    // Optimistic restore: if we have cached user data, show it immediately
    // while the real /me request is in flight. This prevents a blank/loading
    // screen on Render cold start wakeup (which can take 30+ seconds).
    const cached = localStorage.getItem('td_user_cache')
    if (cached) {
      try { setUser(JSON.parse(cached)) } catch {}
    }

    try {
      const { data } = await authApi.me()
      setUser(data)
      // Update the cache with fresh data
      localStorage.setItem('td_user_cache', JSON.stringify(data))
    } catch (err) {
      // Only clear session if the token was genuinely rejected (401)
      // Network errors / timeouts (no err.response) keep the user logged in
      if (err.response?.status === 401) {
        localStorage.removeItem('td_token')
        localStorage.removeItem('td_user_cache')
        setUser(null)
      }
      // Any other error (500, timeout, offline) → stay logged in with cached data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    localStorage.setItem('td_token', data.token)
    localStorage.setItem('td_user_cache', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const signup = async (formData) => {
    const { data } = await authApi.signup(formData)
    localStorage.setItem('td_token', data.token)
    localStorage.setItem('td_user_cache', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('td_token')
    localStorage.removeItem('td_user_cache')
    setUser(null)
  }

  const updateUser = (partial) => {
    setUser(prev => {
      const updated = { ...prev, ...partial }
      localStorage.setItem('td_user_cache', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUser, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
