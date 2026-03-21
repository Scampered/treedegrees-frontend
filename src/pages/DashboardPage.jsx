// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { friendsApi, usersApi, lettersApi } from '../api/client'
import InstallAppCard from '../components/InstallAppCard'

function timeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const [friends, setFriends]         = useState([])
  const [requests, setRequests]       = useState([])
  const [letterStats, setLetterStats] = useState(null)
  const [note, setNote]               = useState('')
  const [noteStatus, setNoteStatus]   = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [hoursLeft, setHoursLeft]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [friendNotes, setFriendNotes]   = useState([])

  useEffect(() => {
    Promise.all([
      friendsApi.list(),
      friendsApi.requests(),
      lettersApi.stats().catch(() => ({ data: null })),
      usersApi.feed().catch(() => ({ data: [] })),
    ]).then(([f, r, s, feed]) => {
      setFriends(f.data)
      setRequests(r.data)
      setLetterStats(s.data)
      setFriendNotes(feed.data || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user?.dailyNoteUpdatedAt) {
      const hrs = (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) / 36e5
      setHoursLeft(hrs < 24 ? (24 - hrs).toFixed(1) : null)
    }
  }, [user])

  const canPost = !hoursLeft || parseFloat(hoursLeft) <= 0

  const postNote = async () => {
    if (!note.trim()) return
    setNoteLoading(true)
    setNoteStatus('')
    try {
      const { data } = await usersApi.postDailyNote(note)
      updateUser({ dailyNote: data.dailyNote, dailyNoteUpdatedAt: data.dailyNoteUpdatedAt })
      setHoursLeft('24.0')
      setNote('')
      setNoteStatus('✓ Posted!')
    } catch (err) {
      setNoteStatus(err.response?.data?.error || 'Could not post note')
      if (err.response?.data?.hoursLeft) setHoursLeft(err.response.data.hoursLeft)
    } finally {
      setNoteLoading(false)
    }
  }

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto flex flex-col gap-5">

      {/* Greeting */}
      <div className="slide-up">
        <h1 className="font-display text-3xl text-forest-50">
          {timeOfDay()}, {user?.nickname || user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p className="text-forest-500 text-sm mt-1">{user?.city}, {user?.country}</p>
      </div>

      {/* Connection requests */}
      {requests.length > 0 && (
        <div className="rounded-2xl bg-forest-900/60 border border-forest-700 p-5">
          <p className="text-forest-200 font-medium mb-3 flex items-center gap-2">
            <span>👋</span>
            {requests.length === 1
              ? `${requests[0].user.displayName} wants to connect!`
              : `${requests.length} people want to connect with you`}
          </p>
          <Link to="/friends" className="text-forest-400 text-sm hover:text-forest-200 underline underline-offset-2">
            See requests →
          </Link>
        </div>
      )}

      {/* 1. TODAY'S NOTE — first */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-forest-200 font-medium">Today's note 📝</p>
          {!canPost && <span className="text-forest-600 text-xs">Come back in {hoursLeft}h</span>}
        </div>
        {/* Mood row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-forest-600 text-xs uppercase tracking-wide flex-shrink-0">Mood</span>
          <div className="flex gap-1.5">
            {MOODS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); if (!moodLoading) handleMood(emoji) }}
                title={MOOD_LABELS[emoji]}
                className="flex items-center justify-center rounded-xl transition-all select-none"
                style={{
                  fontSize: 22,
                  width: 40, height: 40,
                  background: myMood === emoji ? 'rgba(74,186,74,0.25)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${myMood === emoji ? '#4dba4d' : 'rgba(255,255,255,0.1)'}`,
                  transform: myMood === emoji ? 'scale(1.15)' : 'scale(1)',
                  opacity: moodLoading ? 0.5 : 1,
                  cursor: 'pointer',
                }}>
                {emoji}
              </button>
            ))}
          </div>
          {myMood && (
            <button type="button"
              onPointerDown={e => { e.preventDefault(); handleMood(myMood) }}
              className="text-xs text-forest-600 hover:text-forest-400 transition-colors ml-1">
              Clear
            </button>
          )}
        </div>
        {user?.dailyNote && (
          <div className="mb-3 py-2 px-3 rounded-xl bg-forest-800/60 border-l-2 border-forest-600">
            <p className="text-forest-300 text-sm italic">"{user.dailyNote}"</p>
          </div>
        )}
        {canPost ? (
          <>
            <textarea
              className="w-full bg-forest-950/60 border border-forest-800 focus:border-forest-600 text-forest-100
                         placeholder-forest-700 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors"
              rows={3}
              placeholder={user?.dailyNote ? 'Write a new note for today…' : "What's on your mind? Share with your connections…"}
              maxLength={280}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${noteStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
                {noteStatus}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-forest-700 text-xs">{note.length}/280</span>
                <button onClick={postNote} disabled={noteLoading || !note.trim()}
                  className="bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white text-sm px-5 py-1.5 rounded-full transition-colors">
                  {noteLoading ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-forest-600 text-sm">
            {user?.dailyNote ? 'Posted today — see you tomorrow! 🌙' : 'You can post once every 24 hours.'}
          </p>
        )}
      </div>

      {/* 2. LETTERS — second */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-forest-800 flex items-center justify-between">
          <p className="text-forest-200 font-medium">✉️ Letters</p>
          <Link to="/letters" className="text-forest-500 text-xs hover:text-forest-300 transition-colors">
            Open mailbox →
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-x divide-forest-800">
          <div className="px-5 py-4">
            <p className="text-forest-500 text-xs uppercase tracking-wide mb-2">Inbox</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-forest-400 text-sm">Received</span>
                <span className="text-forest-100 font-medium text-sm tabular-nums">
                  {loading || !letterStats ? '—' : letterStats.received}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-forest-400 text-sm flex items-center gap-1">On the way ✈️</span>
                <span className={`font-medium text-sm tabular-nums ${letterStats?.incoming > 0 ? 'text-forest-300' : 'text-forest-600'}`}>
                  {loading || !letterStats ? '—' : letterStats.incoming}
                </span>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-forest-500 text-xs uppercase tracking-wide mb-2">Outbox</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-forest-400 text-sm">Delivered</span>
                <span className="text-forest-100 font-medium text-sm tabular-nums">
                  {loading || !letterStats ? '—' : letterStats.sent}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-forest-400 text-sm flex items-center gap-1">In transit 🚀</span>
                <span className={`font-medium text-sm tabular-nums ${letterStats?.outgoing > 0 ? 'text-bark-300' : 'text-forest-600'}`}>
                  {loading || !letterStats ? '—' : letterStats.outgoing}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-forest-800">
          <Link to="/letters"
            className="flex items-center justify-center gap-2 w-full bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm font-medium py-2.5 rounded-xl transition-colors">
            <span>✉️</span> Write a letter
          </Link>
        </div>
      </div>

      {/* 3. TODAY'S FRIEND NOTES */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-forest-200 font-medium">📝 Today's notes</p>
          <span className="text-forest-600 text-xs">Last 24h</span>
        </div>
        {loading && <p className="text-forest-600 text-sm">Loading…</p>}
        {!loading && friendNotes.length === 0 && (
          <div className="text-center py-4">
            <p className="text-forest-600 text-sm">None of your connections have posted today yet.</p>
            {friends.length === 0 && (
              <Link to="/friends" className="inline-block mt-3 bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm px-5 py-2 rounded-full transition-colors">
                Add connections
              </Link>
            )}
          </div>
        )}
        {friendNotes.length > 0 && (
          <div className="space-y-3">
            {friendNotes.slice(0, 5).map(n => (
              <div key={n.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                  {n.displayName?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-forest-300 text-sm font-medium">{n.displayName}</p>
                    <p className="text-forest-700 text-xs">{n.city ? `${n.city}` : n.country}</p>
                  </div>
                  <p className="text-forest-400 text-sm italic mt-0.5 leading-relaxed">"{n.note}"</p>
                </div>
              </div>
            ))}
            {friendNotes.length > 5 && (
              <p className="text-forest-600 text-xs text-center pt-1">+{friendNotes.length - 5} more notes today</p>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/map" className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-600 p-4 transition-colors group">
          <div className="text-xl mb-2">🗺️</div>
          <p className="text-forest-200 text-sm font-medium group-hover:text-forest-100">Open map</p>
          <p className="text-forest-600 text-xs mt-0.5">See your global network</p>
        </Link>
        <Link to="/feed" className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-600 p-4 transition-colors group">
          <div className="text-xl mb-2">📋</div>
          <p className="text-forest-200 text-sm font-medium group-hover:text-forest-100">Friend notes</p>
          <p className="text-forest-600 text-xs mt-0.5">See what's new</p>
        </Link>
      </div>

      {/* App install + notifications */}
      <InstallAppCard />

      {/* 4. FRIEND CODE — last/bottom */}
      <div className="rounded-2xl bg-forest-800/40 border border-forest-700 p-5 mt-auto">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-forest-400 text-xs mb-2 uppercase tracking-wider">Your Friend Code</p>
            <p className="friend-code text-forest-100 text-2xl tracking-[0.18em] mb-1">{user?.friendCode}</p>
            <p className="text-forest-600 text-xs">Share this with a friend to connect 🤝</p>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(user?.friendCode)}
            className="bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm px-4 py-2 rounded-xl transition-colors flex-shrink-0">
            Copy
          </button>
        </div>
      </div>

    </div>
  )
}
