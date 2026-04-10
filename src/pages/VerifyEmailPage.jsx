// src/pages/VerifyEmailPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { authApi } from '../api/client'

export default function VerifyEmailPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const { user, updateUser, reload } = useAuth()

  const token = params.get('token')
  const email = params.get('email')

  const [status, setStatus]     = useState('waiting') // waiting | verifying | done | error
  const [message, setMessage]   = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [showBack, setShowBack]   = useState(false)
  const [backErr, setBackErr]     = useState('')
  const [backing, setBacking]     = useState(false)

  // ── Block back navigation until verified ─────────────────────────────────────
  useEffect(() => {
    // Push a dummy history entry so "back" just stays here
    window.history.pushState(null, '', window.location.href)
    const handlePop = (e) => {
      if (!user?.emailVerified) {
        window.history.pushState(null, '', window.location.href)
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [user?.emailVerified])

  // ── If token present in URL → verify it ──────────────────────────────────────
  useEffect(() => {
    if (!token || !email) return
    setStatus('verifying')

    api.get(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then(async () => {
        // Mark verified in our auth context
        updateUser({ emailVerified: true })
        // Also reload from server to get fresh data
        await reload()
        setStatus('done')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Verification link is invalid or has expired.')
      })
  }, [token, email])


  // ── Go back — delete unverified account, return to register with email prefilled ──
  const handleGoBack = async () => {
    setBacking(true); setBackErr('')
    try {
      await api.delete('/api/auth/account/unverified')
      // Store their info in sessionStorage so register page can prefill it
      const savedEmail = user?.email || email || ''
      sessionStorage.setItem('td_prefill_email', savedEmail)
      navigate('/signup', { replace: true, state: { prefillEmail: savedEmail } })
    } catch (err) {
      setBackErr(err.response?.data?.error || 'Incorrect password. Try again.')
      setBacking(false)
    }
  }

  // ── Resend ───────────────────────────────────────────────────────────────────
  const resend = async () => {
    setResending(true)
    setResendMsg('')
    try {
      await api.post('/api/auth/resend-verification')
      setResendMsg('✓ New verification email sent! Check your inbox.')
      // Cooldown 60s
      setCountdown(60)
    } catch (err) {
      setResendMsg(err.response?.data?.error || 'Failed to resend. Try again.')
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // ── If user somehow got here already verified, redirect ──────────────────────
  useEffect(() => {
    if (user?.emailVerified && status !== 'done') {
      navigate('/dashboard', { replace: true })
    }
  }, [user?.emailVerified, status])

  // ── Verifying spinner ─────────────────────────────────────────────────────────
  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-forest-400">Verifying your email…</p>
        </div>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
        <div className="text-center slide-up">
          <div className="text-6xl mb-5">✅</div>
          <h1 className="font-display text-3xl text-forest-50 mb-2">Email verified!</h1>
          <p className="text-forest-400">Taking you to your dashboard…</p>
          <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin mx-auto mt-6" />
        </div>
      </div>
    )
  }

  // ── Error (bad/expired token) ─────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center slide-up">
          <div className="text-6xl mb-5">⚠️</div>
          <h1 className="font-display text-2xl text-forest-50 mb-2">Link expired</h1>
          <p className="text-forest-400 text-sm mb-6">{message}</p>
          <button onClick={resend} disabled={resending || countdown > 0}
            className="btn-primary rounded-full px-8 py-3 w-full">
            {resending ? 'Sending…'
             : countdown > 0 ? `Resend in ${countdown}s`
             : 'Send a new verification link'}
          </button>
          {resendMsg && <p className={`text-sm mt-3 ${resendMsg.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{resendMsg}</p>}
        </div>
      </div>
    )
  }

  // ── Default: waiting state (just signed up, no token in URL) ─────────────────
  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center slide-up">
        <div className="text-6xl mb-6">📬</div>
        <h1 className="font-display text-3xl text-forest-50 mb-2">Check your inbox</h1>
        <p className="text-forest-400 text-sm mb-2 leading-relaxed">
          We sent a verification link to
        </p>
        {(email || user?.email) && (
          <p className="text-forest-200 font-medium mb-5 break-all">{email || user?.email}</p>
        )}

        <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5 text-left space-y-3 mb-6">
          <p className="text-forest-500 text-xs uppercase tracking-wide">Steps</p>
          {['Open the TreeDegrees email', 'Click "Verify my email"', 'You\'ll be logged in automatically'].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-forest-800 border border-forest-700 flex items-center justify-center text-forest-500 text-xs flex-shrink-0 mt-0.5">{i+1}</span>
              <p className="text-forest-400 text-sm">{s}</p>
            </div>
          ))}
        </div>

        <p className="text-forest-600 text-xs mb-4">Didn't receive it? Check your spam folder or resend below.</p>

        <button onClick={resend} disabled={resending || countdown > 0}
          className="btn-ghost rounded-full px-6 py-2.5 w-full text-sm">
          {resending ? 'Sending…'
           : countdown > 0 ? `Resend in ${countdown}s`
           : '↺ Resend verification email'}
        </button>
        {resendMsg && <p className={`text-sm mt-3 ${resendMsg.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{resendMsg}</p>}

        {/* Wrong email option */}
        <div className="mt-5 border-t border-forest-800 pt-5">
          {!showBack ? (
            <button onClick={() => setShowBack(true)}
              className="text-forest-600 text-xs hover:text-forest-400 transition-colors underline">
              Wrong email address?
            </button>
          ) : (
            <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4 text-left space-y-3">
              <p className="text-forest-300 text-sm font-medium">Go back and re-register</p>
              <p className="text-forest-500 text-xs leading-relaxed">
                This deletes your unverified account so you can sign up with the correct email.
                Your email will be pre-filled on the signup page.
              </p>
              {backErr && <p className="text-red-400 text-xs">{backErr}</p>}
              <button onClick={handleGoBack} disabled={backing}
                className="btn-ghost rounded-full px-5 py-2 w-full text-sm disabled:opacity-40">
                {backing ? 'Deleting account…' : '← Delete & re-register'}
              </button>
              <button onClick={() => { setShowBack(false); setBackErr('') }}
                className="text-forest-700 text-xs w-full text-center hover:text-forest-500 transition-colors">
                Cancel
              </button>
              <p className="text-forest-700 text-xs text-center">
                Forgot your password?{' '}
                <button onClick={() => navigate('/login', { replace: true })}
                  className="text-forest-500 underline hover:text-forest-300">
                  Go to login
                </button>
                {' '}to reset it first.
              </p>
            </div>
          )}
        </div>

        <p className="text-forest-700 text-xs mt-5">
          You cannot access TreeDegrees until your email is verified.
        </p>
      </div>
    </div>
  )
}
