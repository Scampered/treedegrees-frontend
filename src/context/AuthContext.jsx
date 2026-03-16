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
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      localStorage.removeItem('td_token')
      localStorage.removeItem('td_user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password })
    localStorage.setItem('td_token', data.token)
    setUser(data.user)
    return data.user
  }

  const signup = async (formData) => {
    const { data } = await authApi.signup(formData)
    localStorage.setItem('td_token', data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('td_token')
    localStorage.removeItem('td_user')
    setUser(null)
  }

  const updateUser = (partial) => setUser(prev => ({ ...prev, ...partial }))

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
