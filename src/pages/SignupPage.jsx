// src/pages/SignupPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

async function geocodeCity(city, country) {
  try {
    const q = encodeURIComponent(`${city}, ${country}`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {}
  return null
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || ''
    return { city, country: data.address?.country || '' }
  } catch {}
  return null
}

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Read prefilled email from VerifyEmailPage go-back flow
  const prefillEmail = location.state?.prefillEmail
    || sessionStorage.getItem('td_prefill_email')
    || ''
  if (prefillEmail) sessionStorage.removeItem('td_prefill_email')

  const [form, setForm] = useState({
    fullName: '', nickname: '', email: prefillEmail, password: '', confirmPassword: '',
    dateOfBirth: '', city: '', country: '',
  })
  const [coords, setCoords] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')
  const [step, setStep] = useState(1)

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleGPS = async () => {
    if (!navigator.geolocation) { setGpsStatus('GPS not supported by your browser'); return }
    setGpsLoading(true)
    setGpsStatus('Requesting location…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lon: longitude })
        setGpsStatus('Looking up your city…')
        const place = await reverseGeocode(latitude, longitude)
        if (place) {
          setForm(p => ({ ...p, city: place.city, country: place.country }))
          setGpsStatus('✓ Location detected!')
        } else {
          setGpsStatus('✓ Got GPS — please fill city/country')
        }
        setGpsLoading(false)
      },
      () => { setGpsStatus('Permission denied — fill in manually'); setGpsLoading(false) },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      let finalCoords = coords
      if (!finalCoords) finalCoords = await geocodeCity(form.city, form.country)
      await signup({
        fullName: form.fullName,
        nickname: form.nickname || form.fullName.split(' ')[0],
        email: form.email,
        password: form.password,
        dateOfBirth: form.dateOfBirth,
        city: form.city,
        country: form.country,
        latitude: finalCoords?.lat || null,
        longitude: finalCoords?.lon || null,
      })
      navigate(`/verify?email=${encodeURIComponent(form.email)}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const step1Complete = form.fullName && form.email && form.password && form.confirmPassword

  return (
    <div className="min-h-screen bg-forest-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-forest-800/12 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm slide-up">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="text-2xl">🌳</span>
          <span className="font-display text-forest-200 text-xl">TreeDegrees</span>
        </Link>

        <div className="rounded-2xl bg-forest-900/50 border border-forest-800 p-7">
          {/* Step progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors duration-300
                ${s <= step ? 'bg-forest-500' : 'bg-forest-800'}`} />
            ))}
          </div>

          <h2 className="font-display text-2xl text-forest-50 mb-1">
            {step === 1 ? 'Create your account' : 'Where are you?'}
          </h2>
          <p className="text-forest-500 text-sm mb-6">
            {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2 — for your map pin'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={step === 1
            ? (e) => { e.preventDefault(); if (step1Complete) setStep(2) }
            : handleSubmit}
            className="space-y-4">

            {step === 1 && (
              <>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Full name</label>
                  <input type="text" className="input" placeholder="Jane Smith" value={form.fullName}
                    onChange={(e) => {
                      setForm(p => ({
                        ...p,
                        fullName: e.target.value,
                        // Auto-fill nickname with first name if user hasn't typed one yet
                        nickname: p.nickname === '' || p.nickname === p.fullName.split(' ')[0]
                          ? e.target.value.split(' ')[0]
                          : p.nickname
                      }))
                    }} required />
                  <p className="text-forest-700 text-xs mt-1">Your real name — only you can see this</p>
                </div>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Nickname</label>
                  <input type="text" className="input" placeholder="e.g. Jay, TreeGuy, Wanderer"
                    value={form.nickname} onChange={set('nickname')} maxLength={50} />
                  <p className="text-forest-700 text-xs mt-1">The name everyone will see, except those who you allow</p>
                </div>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Email</label>
                  <input type="email" className="input" placeholder="jane@example.com"
                    value={form.email} onChange={set('email')} required />
                </div>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Password</label>
                  <input type="password" className="input" placeholder="Min 8 chars, uppercase + number"
                    value={form.password} onChange={set('password')} required />
                </div>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Confirm password</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={form.confirmPassword} onChange={set('confirmPassword')} required />
                </div>
                <button type="submit" className="btn-primary w-full rounded-full mt-2" disabled={!step1Complete}>
                  Continue →
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Date of birth</label>
                  <input type="date" className="input" value={form.dateOfBirth} onChange={set('dateOfBirth')} required />
                  <p className="text-forest-700 text-xs mt-1">Used to generate your unique friend code — never displayed</p>
                </div>

                <div className="rounded-xl bg-forest-950/60 border border-forest-800 p-3">
                  <button type="button" onClick={handleGPS} disabled={gpsLoading}
                    className="w-full text-center text-forest-300 hover:text-forest-100 text-sm py-2 transition-colors">
                    {gpsLoading ? '⏳ Detecting…' : '📍 Check my location'}
                  </button>
                  {gpsStatus && (
                    <p className={`text-xs mt-1 text-center ${gpsStatus.startsWith('✓') ? 'text-forest-400' : 'text-forest-600'}`}>
                      {gpsStatus}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">City</label>
                  <input type="text" className="input" placeholder="Tokyo" value={form.city} onChange={set('city')} required />
                </div>
                <div>
                  <label className="block text-forest-400 text-xs mb-1.5 uppercase tracking-wide">Country</label>
                  <input type="text" className="input" placeholder="Japan" value={form.country} onChange={set('country')} required />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1 rounded-full">← Back</button>
                  <button type="submit" className="btn-primary flex-1 rounded-full" disabled={loading}>
                    {loading ? 'Creating…' : 'Plant my tree 🌱'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-forest-600 text-sm mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-forest-400 hover:text-forest-200 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
