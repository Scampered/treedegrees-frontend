// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { usersApi, authApi, friendsApi } from '../api/client'

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

const LOCATION_PRIVACY_OPTIONS = [
  { value: 'exact',   label: 'Exact location',            desc: 'Everyone sees your precise city pin', icon: '📍' },
  { value: 'private', label: 'Direct friends only',       desc: 'Friends see exact; others see your country capital', icon: '🔒' },
  { value: 'hidden',  label: 'Approximate for everyone',  desc: 'Everyone sees only your country capital', icon: '🌐' },
]

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-forest-200 text-sm">{label}</p>
        {desc && <p className="text-forest-600 text-xs mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
          ${checked ? 'bg-forest-600' : 'bg-forest-800'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

// ── Connections Manager Modal ─────────────────────────────────────────────────
function ConnectionsModal({ onClose }) {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [privacy, setPrivacy] = useState({})

  useEffect(() => {
    friendsApi.list().then(r => {
      setFriends(r.data)
      const init = {}
      r.data.forEach(f => { init[f.friendshipId] = f.isPrivate })
      setPrivacy(init)
    }).finally(() => setLoading(false))
  }, [])

  const publicFriends = friends.filter(f => !privacy[f.friendshipId])
  const privateFriends = friends.filter(f => privacy[f.friendshipId])

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('')
    try {
      const original = {}
      friends.forEach(f => { original[f.friendshipId] = f.isPrivate })
      const changed = Object.entries(privacy).filter(([id, val]) => original[id] !== val)
      await Promise.all(changed.map(([id, val]) => friendsApi.togglePrivacy(id, val)))
      setSaveStatus('✓ Saved!')
      setTimeout(() => onClose(), 800)
    } catch {
      setSaveStatus('Failed to save — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-xl rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-forest-800">
          <h2 className="font-display text-forest-100 text-xl">Manage Connections</h2>
          <button onClick={onClose} className="text-forest-500 hover:text-forest-300 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800 transition-colors">✕</button>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12 text-forest-600">Loading…</div>
        ) : friends.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12 text-forest-600">No connections yet</div>
        ) : (
          <>
            <p className="px-6 pt-4 pb-2 text-forest-500 text-xs">Hover a name and use the arrow to move it between columns. Click Save when done.</p>
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="grid grid-cols-2 gap-4 min-h-[200px]">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">🌐</span>
                    <p className="text-forest-300 text-sm font-medium">Public ({publicFriends.length})</p>
                  </div>
                  <div className="space-y-2">
                    {publicFriends.length === 0 && <p className="text-forest-700 text-xs italic py-4 text-center border border-dashed border-forest-800 rounded-xl">Empty</p>}
                    {publicFriends.map(f => (
                      <div key={f.friendshipId} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-forest-900/60 border border-forest-800 group">
                        <div className="w-7 h-7 rounded-full bg-forest-700 flex items-center justify-center text-xs text-forest-200 flex-shrink-0">{f.displayName?.[0]?.toUpperCase()}</div>
                        <p className="text-forest-200 text-xs flex-1 truncate">{f.displayName}</p>
                        <button onClick={() => setPrivacy(p => ({ ...p, [f.friendshipId]: true }))} title="Make private"
                          className="text-forest-600 hover:text-forest-300 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0">→</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">🔒</span>
                    <p className="text-forest-300 text-sm font-medium">Private ({privateFriends.length})</p>
                  </div>
                  <div className="space-y-2">
                    {privateFriends.length === 0 && <p className="text-forest-700 text-xs italic py-4 text-center border border-dashed border-forest-800 rounded-xl">Empty</p>}
                    {privateFriends.map(f => (
                      <div key={f.friendshipId} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-forest-900/60 border border-forest-800 group">
                        <button onClick={() => setPrivacy(p => ({ ...p, [f.friendshipId]: false }))} title="Make public"
                          className="text-forest-600 hover:text-forest-300 opacity-0 group-hover:opacity-100 transition-all text-sm flex-shrink-0">←</button>
                        <div className="w-7 h-7 rounded-full bg-forest-700 flex items-center justify-center text-xs text-forest-200 flex-shrink-0">{f.displayName?.[0]?.toUpperCase()}</div>
                        <p className="text-forest-200 text-xs flex-1 truncate">{f.displayName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-forest-800 flex items-center justify-between">
              <span className={`text-sm ${saveStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{saveStatus}</span>
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost text-sm py-2 px-5">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2 px-5 rounded-full">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Locked field with edit button ─────────────────────────────────────────────
function LockedField({ label, value, hint, onChange, maxLength = 120 }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)

  const handleEdit = () => { setLocal(value); setEditing(true) }
  const handleCancel = () => { setEditing(false); setLocal(value) }
  const handleDone = () => { onChange(local); setEditing(false) }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-forest-400 text-xs uppercase tracking-wide">{label}</label>
        {!editing
          ? <button type="button" onClick={handleEdit}
              className="text-forest-500 hover:text-forest-300 text-xs px-3 py-1 rounded-lg border border-forest-800 hover:border-forest-600 transition-colors">
              ✏️ Edit
            </button>
          : <div className="flex gap-2">
              <button type="button" onClick={handleDone}
                className="text-forest-300 hover:text-forest-100 text-xs px-3 py-1 rounded-lg bg-forest-700 hover:bg-forest-600 transition-colors">
                Done
              </button>
              <button type="button" onClick={handleCancel}
                className="text-forest-600 hover:text-forest-400 text-xs px-2 py-1 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
        }
      </div>
      <input
        type="text"
        className={`input text-sm transition-all ${editing ? '' : 'opacity-60 cursor-not-allowed bg-forest-950/30'}`}
        value={editing ? local : value}
        onChange={e => editing && setLocal(e.target.value)}
        readOnly={!editing}
        maxLength={maxLength}
      />
      {hint && <p className="text-forest-700 text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { pref: themePref, active: activeTheme, loading: themeLoading, setPreference } = useTheme()
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [showConnectionsModal, setShowConnectionsModal] = useState(false)

  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    nickname: user?.nickname || '',
    city: user?.city || '',
    country: user?.country || '',
    isPublic: user?.isPublic ?? true,
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
    if (!navigator.geolocation) { setGpsStatus('GPS not supported'); return }
    setGpsLoading(true)
    setGpsStatus('Requesting location…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setGpsStatus('Looking up your city…')
        const place = await reverseGeocode(latitude, longitude)
        if (place) {
          setProfile(p => ({ ...p, city: place.city, country: place.country, latitude, longitude }))
          setGpsStatus('✓ Location updated! Save to apply.')
        } else {
          setProfile(p => ({ ...p, latitude, longitude }))
          setGpsStatus('✓ Got GPS — verify city/country and save.')
        }
        setGpsLoading(false)
      },
      () => { setGpsStatus('Permission denied'); setGpsLoading(false) },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  const saveProfile = async (e) => {
    if (e) e.preventDefault()
    setProfileLoading(true)
    setProfileStatus('')
    try {
      const payload = { ...profile }
      if (!payload.latitude && profile.city) {
        try {
          const q = encodeURIComponent(`${profile.city}, ${profile.country}`)
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { 'Accept-Language': 'en' } })
          const data = await res.json()
          if (data.length > 0) { payload.latitude = parseFloat(data[0].lat); payload.longitude = parseFloat(data[0].lon) }
        } catch {}
      }
      const { data } = await usersApi.updateProfile(payload)
      updateUser({ ...data, locationPrivacy: profile.locationPrivacy })
      setProfileStatus('✓ Saved!')
    } catch (err) {
      setProfileStatus(err.response?.data?.error || 'Failed to save')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletePassword) return
    setDeleteLoading(true)
    try {
      await authApi.deleteAccount(deletePassword)
      logout(); navigate('/')
    } catch (err) {
      setDeleteStatus(err.response?.data?.error || 'Failed to delete')
      setDeleteLoading(false)
    }
  }

  return (
    <div className="p-5 sm:p-8 max-w-xl mx-auto space-y-5">
      <h1 className="font-display text-3xl text-forest-50">⚙️ Settings</h1>

      {/* Guide link — top of settings for both mobile and PC */}
      <Link to="/guide"
        className="flex items-center gap-4 rounded-2xl bg-forest-900/40 border border-forest-800 px-5 py-4 hover:border-forest-600 transition-colors group">
        <span className="text-3xl">📖</span>
        <div className="flex-1 min-w-0">
          <p className="text-forest-200 font-medium group-hover:text-forest-100 transition-colors">How to use TreeDegrees</p>
          <p className="text-forest-600 text-xs mt-0.5">Tips on connections, letters, streaks, the map, and more</p>
        </div>
        <span className="text-forest-600 group-hover:text-forest-400 text-lg transition-colors">→</span>
      </Link>

      {/* Profile */}

      {/* ── Theme / Appearance ── */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-forest-800">
          <p className="text-forest-200 font-medium">Appearance</p>
          <p className="text-forest-600 text-xs mt-0.5">How the app looks and feels</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-col gap-2">
            {[
              {
                key: 'dark',
                label: '🪨 Dark',
                desc: 'Slate dark — calm, desaturated, easy on the eyes',
              },
              {
                key: 'light',
                label: '🌿 Light',
                desc: 'Soft sage — bright, airy, mint greens',
              },
              {
                key: 'adaptive',
                label: '🌦️ Adaptive',
                desc: 'Changes with your local weather — rain, sun, snow and more',
              },
            ].map(({ key, label, desc }) => (
              <button key={key}
                onClick={() => setPreference(key, user)}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all
                  ${themePref === key
                    ? 'border-forest-500 bg-forest-800/60'
                    : 'border-forest-800 bg-forest-900/30 hover:border-forest-700'}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5
                  ${themePref === key ? 'border-forest-400 bg-forest-400' : 'border-forest-600'}`}/>
                <div>
                  <p className="text-forest-200 text-sm font-medium">{label}</p>
                  <p className="text-forest-600 text-xs mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          {themePref === 'adaptive' && (
            <div className="flex items-center gap-2 px-1">
              {themeLoading
                ? <p className="text-forest-600 text-xs">Checking your weather…</p>
                : <p className="text-forest-500 text-xs">
                    Current theme: <span className="text-forest-300 font-medium">{activeTheme}</span>
                    {' '}· based on weather in {user?.city || user?.country || 'your location'}
                  </p>
              }
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
        <h2 className="text-forest-200 font-medium mb-4">Profile</h2>
        <form onSubmit={saveProfile} className="space-y-4">

          {/* Full name — locked behind edit button */}
          <LockedField
            label="Full name"
            value={profile.fullName}
            hint="Only visible to you and direct connections who you allow"
            onChange={(val) => setProfile(p => ({ ...p, fullName: val }))}
          />

          {/* Nickname — always editable */}
          <div>
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Nickname</label>
            <input type="text" className="input text-sm" placeholder="What people call you"
              value={profile.nickname}
              onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))}
              maxLength={50} />
            <p className="text-forest-700 text-xs mt-1">The name everyone will see, except those you allow</p>
          </div>

          {/* Bio — always editable */}
          <div>
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Bio</label>
            <textarea className="input resize-none h-20 text-sm" placeholder="A few words about yourself… (shown on connection requests)"
              value={profile.bio}
              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
              maxLength={200} />
            <p className="text-forest-700 text-xs mt-1">Shown to people who receive or send you a connection request</p>
          </div>

          {/* Location */}
          <div className="rounded-xl bg-forest-950/60 border border-forest-800 p-3">
            <button type="button" onClick={handleGPS} disabled={gpsLoading}
              className="w-full text-center text-forest-300 hover:text-forest-100 text-sm py-2 transition-colors">
              {gpsLoading ? '⏳ Detecting…' : '📍 Check my location'}
            </button>
            {gpsStatus && <p className={`text-xs mt-1 text-center ${gpsStatus.startsWith('✓') ? 'text-forest-400' : 'text-forest-600'}`}>{gpsStatus}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">City</label>
              <input type="text" className="input text-sm" value={profile.city}
                onChange={e => setProfile(p => ({ ...p, city: e.target.value, latitude: null, longitude: null }))} />
            </div>
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Country</label>
              <input type="text" className="input text-sm" value={profile.country}
                onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm ${profileStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{profileStatus}</span>
            <button type="submit" className="btn-primary text-sm rounded-full px-6" disabled={profileLoading}>
              {profileLoading ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Privacy */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
        <h2 className="text-forest-200 font-medium mb-4">Privacy Controls</h2>
        <div className="space-y-5">
          <Toggle
            checked={profile.isPublic}
            onChange={(val) => setProfile(p => ({ ...p, isPublic: val }))}
            label="Public profile"
            desc="Your nickname, bio, and daily notes are visible to your network"
          />
          <div className="flex items-start justify-between gap-4 pt-1 border-t border-forest-800">
            <div>
              <p className="text-forest-200 text-sm">Manage private connections</p>
              <p className="text-forest-600 text-xs mt-0.5">Move connections between public and private visibility</p>
            </div>
            <button onClick={() => setShowConnectionsModal(true)}
              className="flex-shrink-0 bg-forest-800 hover:bg-forest-700 text-forest-200 text-xs px-4 py-2 rounded-xl transition-colors">
              Manage →
            </button>
          </div>
          <div className="pt-1 border-t border-forest-800">
            <p className="text-forest-300 text-sm font-medium mb-1">📍 Location Privacy</p>
            <p className="text-forest-600 text-xs mb-3">Approximate = your country capital is shown instead.</p>
            <div className="space-y-2">
              {LOCATION_PRIVACY_OPTIONS.map(opt => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors
                  ${profile.locationPrivacy === opt.value ? 'border-forest-600 bg-forest-800/50' : 'border-forest-800 hover:border-forest-700 bg-forest-900/30'}`}>
                  <input type="radio" name="locationPrivacy" value={opt.value}
                    checked={profile.locationPrivacy === opt.value}
                    onChange={() => setProfile(p => ({ ...p, locationPrivacy: opt.value }))}
                    className="mt-0.5 text-forest-500 border-forest-700 bg-forest-950" />
                  <div>
                    <p className="text-forest-200 text-sm">{opt.icon} {opt.label}</p>
                    <p className="text-forest-500 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 text-right">
          <button onClick={saveProfile} className="btn-primary text-sm rounded-full px-6" disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save privacy settings'}
          </button>
        </div>
      </div>

      {/* Friend code */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
        <h2 className="text-forest-200 font-medium mb-1">Your Friend Code</h2>
        <p className="text-forest-600 text-xs mb-3">Generated with SHA-256 — cannot be reverse-engineered.</p>
        {/* Code on its own row, always full width */}
        <div className="bg-forest-900 rounded-xl px-4 py-3 mb-3 overflow-hidden">
          <p className="friend-code text-forest-100 text-xl tracking-[0.18em] text-center break-all">
            {user?.friendCode}
          </p>
        </div>
        {/* Copy button full width on mobile */}
        <button
          onClick={() => {
            navigator.clipboard?.writeText(user?.friendCode)
          }}
          className="btn-ghost text-sm py-2.5 rounded-xl w-full"
        >
          📋 Copy friend code
        </button>
      </div>

      {/* Account */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
        <h2 className="text-forest-200 font-medium mb-3">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-forest-500">Email</span><span className="text-forest-300">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-forest-500">Member since</span><span className="text-forest-300">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span></div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl p-5 border border-red-900/50 bg-red-950/20">
        <h2 className="font-medium text-red-300 mb-1">⚠️ Delete Account</h2>
        <p className="text-red-400/70 text-xs mb-4">Anonymizes all your data permanently (GDPR). Cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger text-sm">Delete my account</button>
        ) : (
          <div className="space-y-3">
            <input type="password" className="input border-red-800 bg-red-950/30 text-red-100 placeholder-red-800"
              placeholder="Your password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
            {deleteStatus && <p className="text-red-400 text-sm">{deleteStatus}</p>}
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger text-sm" disabled={deleteLoading || !deletePassword}>
                {deleteLoading ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteStatus('') }} className="btn-ghost text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {showConnectionsModal && <ConnectionsModal onClose={() => setShowConnectionsModal(false)} />}
    </div>
  )
}
