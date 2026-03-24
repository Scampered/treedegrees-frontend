// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email) return setError('Enter your email')
    setLoading(true); setError('')
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-forest-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/tree-icon.svg" className="w-12 h-12 rounded-xl mx-auto mb-3" alt="TreeDegrees"/>
          <h1 className="font-display text-2xl text-forest-50">Forgot password</h1>
          <p className="text-forest-500 text-sm mt-1">We'll send a reset link to your email</p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-700 p-6 text-center">
            <p className="text-4xl mb-3">📬</p>
            <p className="text-forest-200 font-medium mb-1">Check your inbox</p>
            <p className="text-forest-500 text-sm">If an account exists for <strong className="text-forest-300">{email}</strong>, you'll receive a reset link shortly.</p>
            <Link to="/login" className="block mt-4 text-forest-400 text-sm hover:text-forest-200 underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-forest-400 text-xs block mb-1">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input w-full"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium transition-colors">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-forest-600 text-sm">
              <Link to="/login" className="hover:text-forest-400 underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
