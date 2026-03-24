// src/pages/ResetPasswordPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../api/client'

export default function ResetPasswordPage() {
  const [params]            = useSearchParams()
  const navigate            = useNavigate()
  const [password, setPass] = useState('')
  const [confirm, setConf]  = useState('')
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)

  const token = params.get('token')
  const email = params.get('email')

  useEffect(() => {
    if (!token || !email) setError('Invalid reset link.')
  }, [token, email])

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoad(true); setError('')
    try {
      await authApi.resetPassword(token, email, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid or expired link.')
    } finally { setLoad(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-forest-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/tree-icon.svg" className="w-12 h-12 rounded-xl mx-auto mb-3" alt="TreeDegrees"/>
          <h1 className="font-display text-2xl text-forest-50">Set new password</h1>
        </div>

        {done ? (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-700 p-6 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-forest-200 font-medium">Password updated!</p>
            <p className="text-forest-500 text-sm mt-1">Redirecting to login…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-forest-400 text-xs block mb-1">New password</label>
              <input type="password" value={password} onChange={e => setPass(e.target.value)}
                placeholder="At least 8 characters" className="input w-full" autoFocus/>
            </div>
            <div>
              <label className="text-forest-400 text-xs block mb-1">Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConf(e.target.value)}
                placeholder="Repeat password" className="input w-full"/>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading || !token}
              className="w-full py-3 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium transition-colors">
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <p className="text-center">
              <Link to="/login" className="text-forest-600 text-sm hover:text-forest-400 underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
