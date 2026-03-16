// src/pages/SettingsPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usersApi, authApi } from '../api/client'

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.suburb ||
      data.address?.county || ''
    const country = data.address?.country || ''
    return { city, country }
  } catch {}
  return null
}

// Location privacy options:
// 'exact'   — show real coordinates to everyone
// 'private' — show exact only to private (1st degree) connections; public sees capital/centre
// 'hidden'  — show approximate (capital) to everyone including private connections
const LOCATION_PRIVACY_OPTIONS = [
  {
    value: 'exact',
    label: 'Exact location',
    desc: 'Your precise city pin is visible to everyone in your network',
    icon: '📍',
  },
  {
    value: 'private',
    label: 'Private connections only',
    desc: 'Direct (1st degree) connections see your exact location. Public connections see your country capital.',
    icon: '🔒',
  },
  {
    value: 'hidden',
    label: 'Approximate for everyone',
    desc: 'Everyone — including direct connections — sees only your country capital, not your exact city.',
    icon: '🌐',
  },
]

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    bio: user?.bio || '',
    city: user?.city || '',
    country: user?.country || '',
    isPublic: user?.isPublic ?? true,
    connectionsPublic: user?.connectionsPublic ?? true,
    locationPrivacy: user?.locationPrivacy || 'exact',
  })
  const [profileStatus, setProfileStatus] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('')

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteStatus, setDeleteStatus] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleGPS = async () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS not supported by your browser')
      return
    }
    setGpsLoading(true)
    setGpsStatus('Requesting location…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setGpsStatus('Looking up your city…')
        const place = await reverseGeocode(latitude, longitude)
        if (place) {
          setProfile(p => ({ ...p, city: place.city, country: place.country, latitude, longitude }))
          setGpsStatus('✓ Location updated! Remember to save.')
        } else {
          setProfile(p => ({ ...p, latitude, longitude }))
          setGpsStatus('✓ Got GPS — please verify city/country and save.')
        }
        setGpsLoading(false)
      },
      () => {
        setGpsStatus('Permission denied — fill in manually')
        setGpsLoading(false)
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  const saveProfile = async (e) => {
    if (e) e.preventDefault()
    setProfileLoading(true)
    setProfileStatus('')
    try {
      const payload = { ...profile }
      // If city changed and no GPS coords, geocode it
      if (!payload.latitude && profile.city) {
        try {
          const q = encodeURIComponent(`${profile.city}, ${profile.country}`)
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } })
          const data = await res.json()
          if (data.length > 0) {
            payload.latitude = parseFloat(data[0].lat)
            payload.longitude = parseFloat(data[0].lon)
          }
        } catch {}
      }
      const { data } = await usersApi.updateProfile(payload)
      updateUser({ ...data, locationPrivacy: profile.locationPrivacy })
      setProfileStatus('✓ Profile saved')
    } catch (err) {
      setProfileStatus(err.response?.data?.error || 'Failed to save')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePassword) return
    setDeleteLoading(true)
    setDeleteStatus('')
    try {
      await authApi.deleteAccount(deletePassword)
      logout()
      navigate('/')
    } catch (err) {
      setDeleteStatus(err.response?.data?.error || 'Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="font-display text-3xl text-forest-50">⚙️ Settings</h1>

      {/* Profile */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-medium text-forest-200 mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Bio</label>
            <textarea
              className="input resize-none h-20 text-sm"
              placeholder="A few words about yourself…"
              value={profile.bio}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              maxLength={200}
            />
          </div>

          {/* GPS button */}
          <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
            <button type="button" onClick={handleGPS} disabled={gpsLoading} className="btn-ghost w-full text-sm py-2">
              {gpsLoading ? '⏳ Detecting…' : '📍 Check my location'}
            </button>
            {gpsStatus && (
              <p className={`text-xs mt-2 text-center ${gpsStatus.startsWith('✓') ? 'text-forest-400' : 'text-forest-500'}`}>
                {gpsStatus}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">City</label>
              <input
                type="text" className="input text-sm"
                value={profile.city}
                onChange={e => setProfile(p => ({ ...p, city: e.target.value, latitude: null, longitude: null }))}
              />
            </div>
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Country</label>
              <input
                type="text" className="input text-sm"
                value={profile.country}
                onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            {profileStatus && (
              <span className={`text-sm ${profileStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
                {profileStatus}
              </span>
            )}
            <button type="submit" className="btn-primary text-sm ml-auto" disabled={profileLoading}>
              {profileLoading ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Privacy controls */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-medium text-forest-200 mb-1">Privacy Controls</h2>
        <p className="text-forest-500 text-xs mb-4">Control what others see about you on the map.</p>

        <div className="space-y-4 mb-5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={profile.isPublic}
              onChange={e => setProfile(p => ({ ...p, isPublic: e.target.checked }))}
              className="mt-0.5 rounded border-forest-700 bg-forest-950 text-forest-500"
            />
            <div>
              <p className="text-forest-200 text-sm group-hover:text-forest-100">Public profile</p>
              <p className="text-forest-600 text-xs">Your name, bio, and daily notes are visible to your network</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={profile.connectionsPublic}
              onChange={e => setProfile(p => ({ ...p, connectionsPublic: e.target.checked }))}
              className="mt-0.5 rounded border-forest-700 bg-forest-950 text-forest-500"
            />
            <div>
              <p className="text-forest-200 text-sm group-hover:text-forest-100">Public connections</p>
              <p className="text-forest-600 text-xs">Connection lines on the map are visible to your network</p>
            </div>
          </label>
        </div>

        {/* Location privacy — 3-way radio */}
        <div className="border-t border-forest-800 pt-4">
          <p className="text-forest-300 text-sm font-medium mb-1">📍 Location Privacy</p>
          <p className="text-forest-600 text-xs mb-3">
            Controls where your pin appears on the map for different audiences.
            When approximate, you appear at your country's capital city instead of your real location.
          </p>
          <div className="space-y-2">
            {LOCATION_PRIVACY_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors
                ${profile.locationPrivacy === opt.value
                  ? 'border-forest-600 bg-forest-800/50'
                  : 'border-forest-800 hover:border-forest-700 bg-forest-900/30'}`}>
                <input
                  type="radio"
                  name="locationPrivacy"
                  value={opt.value}
                  checked={profile.locationPrivacy === opt.value}
                  onChange={() => setProfile(p => ({ ...p, locationPrivacy: opt.value }))}
                  className="mt-0.5 text-forest-500 border-forest-700 bg-forest-950"
                />
                <div>
                  <p className="text-forest-200 text-sm">{opt.icon} {opt.label}</p>
                  <p className="text-forest-500 text-xs mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 text-right">
          <button onClick={saveProfile} className="btn-primary text-sm" disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save privacy settings'}
          </button>
        </div>
      </div>

      {/* Friend code */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-medium text-forest-200 mb-1">Your Friend Code</h2>
        <p className="text-forest-500 text-xs mb-3">
          Generated from your name, date of birth, city, and a secret server salt using SHA-256.
          Cannot be reverse-engineered.
        </p>
        <div className="flex items-center gap-3">
          <p className="friend-code text-forest-200 text-xl tracking-[0.2em] bg-forest-900 px-4 py-2 rounded-lg">
            {user?.friendCode}
          </p>
          <button onClick={() => navigator.clipboard?.writeText(user?.friendCode)} className="btn-ghost text-xs py-2 px-3">
            Copy
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-medium text-forest-200 mb-3">Account Information</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-forest-500">Email</span>
            <span className="text-forest-300">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-forest-500">Member since</span>
            <span className="text-forest-300">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-5 border border-red-900/50 bg-red-950/20">
        <h2 className="font-medium text-red-300 mb-1">⚠️ Delete Account</h2>
        <p className="text-red-400/70 text-xs mb-4">
          Permanently deletes your account and anonymizes all personal data (GDPR right to erasure). Cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger text-sm">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-red-300 text-sm font-medium">Enter your password to confirm:</p>
            <input
              type="password"
              className="input border-red-800 bg-red-950/30 text-red-100 placeholder-red-800"
              placeholder="Your password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
            />
            {deleteStatus && <p className="text-red-400 text-sm">{deleteStatus}</p>}
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger text-sm" disabled={deleteLoading || !deletePassword}>
                {deleteLoading ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteStatus('') }} className="btn-ghost text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
