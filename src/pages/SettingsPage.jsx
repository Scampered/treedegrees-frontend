// src/pages/SettingsPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usersApi, authApi } from '../api/client'

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    bio: user?.bio || '',
    city: user?.city || '',
    country: user?.country || '',
    isPublic: user?.isPublic ?? true,
    connectionsPublic: user?.connectionsPublic ?? true,
  })
  const [profileStatus, setProfileStatus] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteStatus, setDeleteStatus] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileStatus('')
    try {
      const { data } = await usersApi.updateProfile(profile)
      updateUser(data)
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">City</label>
              <input
                type="text"
                className="input text-sm"
                value={profile.city}
                onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Country</label>
              <input
                type="text"
                className="input text-sm"
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
        <p className="text-forest-500 text-xs mb-4">
          Control what others can see about you on the map and in search.
        </p>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={profile.isPublic}
              onChange={e => setProfile(p => ({ ...p, isPublic: e.target.checked }))}
              className="mt-0.5 rounded border-forest-700 bg-forest-950 text-forest-500"
            />
            <div>
              <p className="text-forest-200 text-sm group-hover:text-forest-100">Public profile</p>
              <p className="text-forest-600 text-xs">Your name, city, and daily notes are visible to people in your network</p>
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
              <p className="text-forest-600 text-xs">Your connection lines are visible on the map (identity still controlled by profile privacy)</p>
            </div>
          </label>
        </div>
        <div className="mt-4 text-right">
          <button onClick={saveProfile} className="btn-primary text-sm" disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save privacy settings'}
          </button>
        </div>
      </div>

      {/* Friend code info */}
      <div className="glass rounded-xl p-5">
        <h2 className="font-medium text-forest-200 mb-1">Your Friend Code</h2>
        <p className="text-forest-500 text-xs mb-3">
          Generated from your name, date of birth, city, and a secret server salt using SHA-256.
          It cannot be reverse-engineered from the code alone.
        </p>
        <div className="flex items-center gap-3">
          <p className="friend-code text-forest-200 text-xl tracking-[0.2em] bg-forest-900 px-4 py-2 rounded-lg">
            {user?.friendCode}
          </p>
          <button
            onClick={() => navigator.clipboard?.writeText(user?.friendCode)}
            className="btn-ghost text-xs py-2 px-3"
          >
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

      {/* Danger zone - account deletion */}
      <div className="rounded-xl p-5 border border-red-900/50 bg-red-950/20">
        <h2 className="font-medium text-red-300 mb-1">⚠️ Delete Account</h2>
        <p className="text-red-400/70 text-xs mb-4">
          Permanently deletes your account and anonymizes all your personal data (GDPR right to erasure).
          This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger text-sm"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-red-300 text-sm font-medium">Enter your password to confirm deletion:</p>
            <input
              type="password"
              className="input border-red-800 bg-red-950/30 text-red-100 placeholder-red-800"
              placeholder="Your password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
            />
            {deleteStatus && <p className="text-red-400 text-sm">{deleteStatus}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="btn-danger text-sm"
                disabled={deleteLoading || !deletePassword}
              >
                {deleteLoading ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteStatus('') }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
