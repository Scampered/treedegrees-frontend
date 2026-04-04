// src/pages/FeedPage.jsx — Daily Notes (own note + friends' notes)
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usersApi } from '../api/client'

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

export default function FeedPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [feed, setFeed]           = useState([])
  const [note, setNote]           = useState('')
  const [posting, setPosting]     = useState(false)
  const [status, setStatus]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [myMood, setMyMood]         = useState(user?.mood || null)
  const [moodLoading, setMoodLoading] = useState(false)

  useEffect(() => {
    usersApi.feed().then(r => setFeed(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Sync mood from user object (AuthContext /me includes it after we add it)
  useEffect(() => { setMyMood(user?.mood || null) }, [user?.mood])

  const hoursLeft = user?.dailyNoteUpdatedAt
    ? Math.max(0, 24 - (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) / 3600000)
    : 0
  const canPost = hoursLeft <= 0

  // Check if user's own note is still fresh
  const myNoteIsFresh = user?.dailyNoteUpdatedAt &&
    (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) < 86400000

  const MOODS = ['😄','😢','😡','😴','🤔','🥹']
  const MOOD_LABELS = { '😄':'Happy','😢':'Sad','😡':'Angry','😴':'Tired','🤔':'Thinking','🥹':'Emotional' }

  const handleMood = async (emoji) => {
    setMoodLoading(true)
    try {
      if (myMood === emoji) {
        await usersApi.clearMood()
        setMyMood(null)
        updateUser({ mood: null })
      } else {
        await usersApi.setMood(emoji)
        setMyMood(emoji)
        updateUser({ mood: emoji })
      }
    } catch {} finally { setMoodLoading(false) }
  }

  const handlePost = async () => {
    if (!note.trim()) return
    setPosting(true)
    setStatus('')
    try {
      const { data } = await usersApi.postDailyNote(note)
      updateUser({ dailyNote: data.dailyNote, dailyNoteUpdatedAt: data.dailyNoteUpdatedAt })
      setNote('')
      setStatus('✓ Posted!')
    } catch (err) {
      setStatus(err.response?.data?.error || 'Could not post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex-shrink-0">
        <h1 className="font-display text-2xl text-forest-50">📝 Daily Notes</h1>
        <p className="text-forest-600 text-xs mt-0.5">One note a day — yours and your connections</p>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Your note section ── */}
        <div className="px-5 py-4 border-b border-forest-800 bg-forest-900/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-forest-600 flex items-center justify-center text-sm text-white font-medium flex-shrink-0">
              {user?.nickname?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-forest-200 text-sm font-medium">You</p>
              <p className="text-forest-600 text-xs">{user?.city || user?.country}</p>
            </div>
          </div>

          {/* Mood picker */}
          <div className="mb-3">
            <p className="text-forest-600 text-xs mb-2 uppercase tracking-wide">Today's mood</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); if (!moodLoading) handleMood(emoji) }}
                  title={MOOD_LABELS[emoji]}
                  className="flex items-center justify-center rounded-xl transition-all select-none"
                  style={{
                    fontSize: 22, width: 44, height: 44,
                    background: myMood === emoji ? 'rgba(74,186,74,0.25)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${myMood === emoji ? '#4dba4d' : 'rgba(255,255,255,0.1)'}`,
                    transform: myMood === emoji ? 'scale(1.15)' : 'scale(1)',
                    opacity: moodLoading ? 0.5 : 1,
                    cursor: 'pointer',
                  }}>
                  {emoji}
                </button>
              ))}
              {myMood && (
                <button type="button"
                  onPointerDown={e => { e.preventDefault(); handleMood(myMood) }}
                  className="text-xs text-forest-600 hover:text-forest-400 px-2 self-center transition-colors">
                  Clear
                </button>
              )}
            </div>
            {myMood && <p className="text-forest-500 text-xs mt-1">{myMood} showing on map · 24h</p>}
          </div>

          {/* Show current note if fresh */}
          {myNoteIsFresh && user?.dailyNote && (
            <div className="mb-3 px-3 py-2.5 rounded-xl bg-forest-800/50 border-l-2 border-forest-500">
              <p className="text-forest-200 text-sm italic leading-relaxed">"{user.dailyNote}"</p>
              <p className="text-forest-600 text-xs mt-1">{timeAgo(user.dailyNoteUpdatedAt)}</p>
            </div>
          )}

          {/* Compose area */}
          {canPost ? (
            <div className="space-y-2">
              <textarea
                className="w-full bg-forest-950/60 border border-forest-800 focus:border-forest-600 text-forest-100
                           placeholder-forest-700 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
                rows={3}
                placeholder={myNoteIsFresh ? 'Post a new note (replaces current)…' : "What's on your mind today?"}
                maxLength={280}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${status.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
                  {status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-forest-700 text-xs">{note.length}/280</span>
                  <button onClick={handlePost} disabled={posting || !note.trim()}
                    className="bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white text-sm px-5 py-1.5 rounded-full transition-colors">
                    {posting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-forest-600 text-sm">
              {myNoteIsFresh ? `Come back in ${hoursLeft.toFixed(1)}h to post again 🌙` : 'You can post once every 24 hours.'}
            </p>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="flex-1 h-px bg-forest-800" />
          <p className="text-forest-600 text-xs uppercase tracking-wide">Connections today</p>
          <div className="flex-1 h-px bg-forest-800" />
        </div>

        {/* ── Friends' notes ── */}
        <div className="px-5 pb-5 space-y-3">
          {loading && <p className="text-forest-600 text-sm text-center py-8">Loading notes…</p>}

          {!loading && feed.length === 0 && (
            <div className="text-center py-8">
              <p className="text-forest-500 text-sm">None of your connections have posted today.</p>
              <p className="text-forest-700 text-xs mt-1">Check back later!</p>
            </div>
          )}

          {feed.map(n => (
            <div key={n.id} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-sm text-forest-200 font-medium flex-shrink-0">
                  {n.displayName?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-forest-200 text-sm font-medium cursor-pointer hover:underline" onClick={() => navigate(`/profile/${n.userId||n.id}`)}>{n.displayName}</p>
                  <p className="text-forest-600 text-xs">{n.city ? `${n.city}, ${n.country}` : n.country} · {timeAgo(n.postedAt)}</p>
                </div>
              </div>
              <p className="text-forest-300 text-sm italic leading-relaxed pl-11">"{n.note}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
