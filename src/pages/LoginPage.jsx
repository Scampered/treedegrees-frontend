// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-forest-800/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-forest-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm slide-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="text-2xl">🌳</span>
          <span className="font-display text-forest-200 text-xl">TreeDegrees</span>
        </Link>

        <div className="glass rounded-2xl p-8">
          <h2 className="font-display text-2xl text-forest-50 mb-1">Welcome back</h2>
          <p className="text-forest-500 text-sm mb-6">Sign in to your social graph</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="text-center text-forest-500 text-sm mt-6">
          No account yet?{' '}
          <Link to="/signup" className="text-forest-300 hover:text-forest-100 underline underline-offset-2">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
