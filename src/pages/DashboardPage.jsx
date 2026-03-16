// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { friendsApi, usersApi } from '../api/client'

function StatCard({ value, label, icon, to }) {
  const content = (
    <div className="glass rounded-xl p-5 hover:border-forest-600 transition-colors duration-200 cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {to && <span className="text-forest-600 text-xs">→</span>}
      </div>
      <p className="font-display text-3xl text-forest-100">{value ?? '—'}</p>
      <p className="text-forest-500 text-sm mt-1">{label}</p>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [note, setNote] = useState(user?.dailyNote || '')
  const [noteStatus, setNoteStatus] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [hoursLeft, setHoursLeft] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([friendsApi.list(), friendsApi.requests()])
      .then(([f, r]) => {
        setFriends(f.data)
        setRequests(r.data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Compute hours left for note
  useEffect(() => {
    if (user?.dailyNoteUpdatedAt) {
      const hrs = (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) / 36e5
      if (hrs < 24) setHoursLeft((24 - hrs).toFixed(1))
    }
  }, [user])

  const postNote = async () => {
    if (!note.trim()) return
    setNoteLoading(true)
    setNoteStatus('')
    try {
      const { data } = await usersApi.postDailyNote(note)
      updateUser({ dailyNote: data.dailyNote, dailyNoteUpdatedAt: data.dailyNoteUpdatedAt })
      setHoursLeft('24.0')
      setNoteStatus('✓ Note posted!')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to post note'
      setNoteStatus(msg)
      if (err.response?.data?.hoursLeft) setHoursLeft(err.response.data.hoursLeft)
    } finally {
      setNoteLoading(false)
    }
  }

  const canPost = !hoursLeft || parseFloat(hoursLeft) <= 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 slide-up">
        <h1 className="font-display text-3xl text-forest-50">
          Hello, {user?.fullName?.split(' ')[0]} 🌱
        </h1>
        <p className="text-forest-500 mt-1">{user?.city}, {user?.country}</p>
      </div>

      {/* Friend code */}
      <div className="glass rounded-xl p-5 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-forest-400 text-xs uppercase tracking-wide mb-1">Your Friend Code</p>
          <p className="friend-code text-forest-200 text-2xl tracking-[0.2em]">{user?.friendCode}</p>
          <p className="text-forest-600 text-xs mt-1">Share this code — it's the only way to connect</p>
        </div>
        <button
          onClick={() => navigator.clipboard?.writeText(user?.friendCode)}
          className="btn-ghost text-sm py-2 px-4"
        >
          Copy code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard value={loading ? '…' : friends.length} label="Connections" icon="🌿" to="/friends" />
        <StatCard value={loading ? '…' : requests.length} label="Pending requests" icon="📬" to="/friends" />
        <StatCard value="3°" label="Max visible depth" icon="🔭" to="/map" />
        <StatCard value={canPost ? 'Ready' : `${hoursLeft}h`} label="Next note" icon="📋" to="/feed" />
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div className="glass rounded-xl p-5 mb-6">
          <h2 className="font-medium text-forest-200 mb-3 flex items-center gap-2">
            <span>📬</span> Pending connection requests
          </h2>
          <div className="space-y-2">
            {requests.slice(0, 3).map(r => (
              <div key={r.requestId} className="flex items-center justify-between py-2 border-b border-forest-800 last:border-0">
                <div>
                  <p className="text-forest-200 text-sm font-medium">{r.user.fullName}</p>
                  <p className="text-forest-500 text-xs">{r.user.city}, {r.user.country}</p>
                </div>
                <Link to="/friends" className="text-forest-400 text-xs hover:text-forest-200 underline">
                  Respond →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily note composer */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="font-medium text-forest-200 mb-1 flex items-center gap-2">
          <span>📋</span> Today's note
        </h2>
        <p className="text-forest-600 text-xs mb-3">
          {canPost ? 'Share one thought with your connections today.' : `Next post available in ${hoursLeft} hours.`}
        </p>

        {user?.dailyNote && (
          <div className="mb-3 px-4 py-3 rounded-lg bg-forest-900/60 border border-forest-800">
            <p className="text-forest-300 text-sm italic">"{user.dailyNote}"</p>
            {user?.dailyNoteUpdatedAt && (
              <p className="text-forest-600 text-xs mt-1">
                Posted {new Date(user.dailyNoteUpdatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <textarea
          className="input resize-none h-20 text-sm"
          placeholder="What's on your mind today? (280 chars max)"
          maxLength={280}
          value={note}
          onChange={e => setNote(e.target.value)}
          disabled={!canPost}
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${noteStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
            {noteStatus}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-forest-600 text-xs">{note.length}/280</span>
            <button
              className="btn-primary text-sm py-1.5 px-4"
              onClick={postNote}
              disabled={!canPost || noteLoading || !note.trim()}
            >
              {noteLoading ? 'Posting…' : 'Post note'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/map" className="glass rounded-xl p-5 hover:border-forest-600 transition-colors group">
          <div className="text-2xl mb-2">🗺️</div>
          <h3 className="font-medium text-forest-200 group-hover:text-forest-100">Open Globe Map</h3>
          <p className="text-forest-500 text-sm mt-1">Visualize your network on an interactive world map</p>
        </Link>
        <Link to="/friends" className="glass rounded-xl p-5 hover:border-forest-600 transition-colors group">
          <div className="text-2xl mb-2">🌱</div>
          <h3 className="font-medium text-forest-200 group-hover:text-forest-100">Add Connection</h3>
          <p className="text-forest-500 text-sm mt-1">Enter a friend code to send a connection request</p>
        </Link>
      </div>
    </div>
  )
}
