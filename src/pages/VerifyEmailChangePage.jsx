// src/pages/VerifyEmailChangePage.jsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function VerifyEmailChangePage() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const { reload } = useAuth()
  const token = params.get('token')

  const [status, setStatus]   = useState('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid link — no token found.')
      return
    }

    api.get(`/api/auth/confirm-email-change?token=${token}`)
      .then(async () => {
        await reload() // refresh user in context so email updates everywhere
        setStatus('done')
        setTimeout(() => navigate('/settings', { replace: true }), 2500)
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Link is invalid or has expired.')
      })
  }, [token])

  if (status === 'verifying') return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-forest-400">Confirming your new email…</p>
      </div>
    </div>
  )

  if (status === 'done') return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
      <div className="text-center slide-up">
        <div className="text-6xl mb-5">✅</div>
        <h1 className="font-display text-3xl text-forest-50 mb-2">Email updated!</h1>
        <p className="text-forest-400">Taking you back to settings…</p>
        <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin mx-auto mt-6" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4">
      <div className="text-center slide-up">
        <div className="text-6xl mb-5">⚠️</div>
        <h1 className="font-display text-2xl text-forest-50 mb-2">Link expired</h1>
        <p className="text-forest-400 text-sm mb-6">{message}</p>
        <button onClick={() => navigate('/settings')} className="btn-primary rounded-full px-8 py-3">
          Back to Settings
        </button>
      </div>
    </div>
  )
}
