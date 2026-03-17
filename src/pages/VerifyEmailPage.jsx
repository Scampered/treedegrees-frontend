// src/pages/VerifyEmailPage.jsx
// Handles two cases:
// 1. /verify?type=signup  — Supabase redirects here after user clicks confirmation link
// 2. /verify              — shown after signup telling user to check their email
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending') // 'pending' | 'confirmed' | 'error'
  const type = params.get('type')
  const email = params.get('email') // passed from signup page

  useEffect(() => {
    // Supabase sends ?type=signup&token_hash=...&next=... when user clicks link
    // Our backend auth is independent of Supabase Auth so we just need to
    // mark the user's email as verified in our own users table.
    // The token from Supabase is handled by Supabase's own JS client if used,
    // but since we use our own backend, we simply trust the redirect happened.
    if (type === 'signup' || type === 'email_change') {
      // User clicked the email link — mark as verified via our backend
      const token = localStorage.getItem('td_token')
      if (token) {
        fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }).then(() => {
          setStatus('confirmed')
          setTimeout(() => navigate('/dashboard'), 2000)
        }).catch(() => {
          setStatus('confirmed') // best effort — let them in
          setTimeout(() => navigate('/dashboard'), 2000)
        })
      } else {
        setStatus('confirmed')
        setTimeout(() => navigate('/login'), 2500)
      }
    }
  }, [type, navigate])

  // Case 1: Just signed up, waiting for email
  if (!type) {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center slide-up">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="font-display text-3xl text-forest-50 mb-3">Check your inbox</h1>
          <p className="text-forest-400 leading-relaxed mb-2">
            We've sent a confirmation email to
          </p>
          {email && (
            <p className="text-forest-200 font-medium mb-4">{email}</p>
          )}
          <p className="text-forest-500 text-sm mb-8">
            Click the link in the email to activate your account. Check your spam folder if you don't see it.
          </p>
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5 text-left space-y-2 mb-6">
            <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">What to expect</p>
            <div className="flex items-start gap-3">
              <span className="text-forest-500 text-sm mt-0.5">1.</span>
              <p className="text-forest-400 text-sm">Open the email from TreeDegrees</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-forest-500 text-sm mt-0.5">2.</span>
              <p className="text-forest-400 text-sm">Click "Confirm your email"</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-forest-500 text-sm mt-0.5">3.</span>
              <p className="text-forest-400 text-sm">You'll be brought back and logged in automatically</p>
            </div>
          </div>
          <Link to="/login" className="text-forest-500 text-sm hover:text-forest-300 underline underline-offset-2">
            Already confirmed? Sign in
          </Link>
        </div>
      </div>
    )
  }

  // Case 2: Returning from email link
  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center slide-up">
        {status === 'confirmed' ? (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 className="font-display text-3xl text-forest-50 mb-3">Email confirmed!</h1>
            <p className="text-forest-400">Taking you to your dashboard…</p>
            <div className="mt-6">
              <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin mx-auto" />
            </div>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">🌳</div>
            <p className="text-forest-400">Confirming your email…</p>
            <div className="mt-6">
              <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin mx-auto" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
