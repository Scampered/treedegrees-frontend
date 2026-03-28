// src/pages/FeedPage.jsx — Daily Notes
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usersApi } from '../api/client'
import MoodPicker from '../components/MoodPicker'

function timeAgo(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

// Common emoji grid for note emoji picker
const QUICK_EMOJI = ['🌿','✨','🔥','💭','😊','🎉','🌙','☀️','💡','🎵','📚','🏃','🌊','🍃','❤️','😴']

function NoteEmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  return (
    <div className="relative">
      <button type="button"
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-forest-700
                   hover:border-forest-500 bg-forest-900/50 text-lg transition-colors"
        title="Add emoji to your note">
        {value || '＋'}
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-20 bg-forest-950 border border-forest-700
                        rounded-2xl shadow-2xl p-3 w-56">
          <p className="text-forest-600 text-xs mb-2 uppercase tracking-wide">Note emoji</p>
          <div className="grid grid-cols-8 gap-1 mb-2">
            {QUICK_EMOJI.map(e => (
              <button key={e} type="button"
                onClick={() => { onChange(value === e ? null : e); setOpen(false) }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-base
                           hover:bg-forest-800 transition-colors
                           ${value === e ? 'bg-forest-700 ring-1 ring-forest-500' : ''}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2 border-t border-forest-800 pt-2">
            <input value={custom} onChange={e => setCustom(e.target.value)}
              placeholder="Paste emoji…" maxLength={4}
              className="flex-1 bg-forest-900 border border-forest-700 rounded-lg px-2 py-1
                         text-forest-200 text-sm outline-none focus:border-forest-500"
            />
            <button type="button"
              onClick={() => { if (custom.trim()) { onChange(custom.trim()); setOpen(false); setCustom('') } }}
              className="bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs px-2 rounded-lg">
              Use
            </button>
          </div>
          {value && (
            <button type="button" onClick={() => { onChange(null); setOpen(false) }}
              className="w-full mt-2 text-forest-600 text-xs hover:text-forest-400 transition-colors">
              Remove emoji
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const { user, updateUser } = useAuth()
  const [feed, setFeed]       = useState([])
  const [note, setNote]       = useState('')
  const [noteEmoji, setNoteEmoji] = useState(null)
  const [posting, setPosting] = useState(false)
  const [status, setStatus]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi.feed().then(r => setFeed(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const hoursLeft = user?.dailyNoteUpdatedAt
    ? Math.max(0, 24 - (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) / 3600000)
    : 0
  const canPost = hoursLeft <= 0
  const myNoteIsFresh = user?.dailyNoteUpdatedAt &&
    (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) < 86400000

  const handlePost = async () => {
    if (!note.trim()) return
    setPosting(true); setStatus('')
    try {
      const { data } = await usersApi.postDailyNote(note, noteEmoji)
      updateUser({ dailyNote: data.dailyNote, dailyNoteUpdatedAt: data.dailyNoteUpdatedAt, noteEmoji: data.noteEmoji })
      setNote(''); setNoteEmoji(null)
      setStatus('✓ Posted!')
    } catch (err) {
      setStatus(err.response?.data?.error || 'Could not post')
    } finally { setPosting(false) }
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
              {user?.mood || user?.nickname?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-forest-200 text-sm font-medium">
                You {user?.mood && <span className="ml-1">{user.mood}</span>}
              </p>
              <p className="text-forest-600 text-xs">{user?.city || user?.country}</p>
            </div>
          </div>

          {/* Mood picker */}
          <div className="mb-3"><MoodPicker /></div>

          {/* Current note */}
          {myNoteIsFresh && user?.dailyNote && (
            <div className="mb-3 px-3 py-2.5 rounded-xl bg-forest-800/50 border-l-2 border-forest-500">
              {user.noteEmoji && <span className="mr-1.5 text-base">{user.noteEmoji}</span>}
              <span className="text-forest-200 text-sm italic leading-relaxed">"{user.dailyNote}"</span>
              <p className="text-forest-600 text-xs mt-1">{timeAgo(user.dailyNoteUpdatedAt)}</p>
            </div>
          )}

          {/* Compose */}
          {canPost ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <NoteEmojiPicker value={noteEmoji} onChange={setNoteEmoji} />
                <textarea
                  className="flex-1 bg-forest-950/60 border border-forest-800 focus:border-forest-600
                             text-forest-100 placeholder-forest-700 rounded-xl px-3 py-2.5
                             text-sm resize-none outline-none transition-colors"
                  rows={3} maxLength={280} value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={myNoteIsFresh ? 'Post a new note…' : "What's on your mind today?"}
                />
              </div>
              {noteEmoji && (
                <p className="text-forest-600 text-xs pl-11">
                  {noteEmoji} will show on your note card
                </p>
              )}
              <div className="flex items-center justify-between pl-11">
                <span className={`text-xs ${status.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
                  {status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-forest-700 text-xs">{note.length}/280</span>
                  <button onClick={handlePost} disabled={posting || !note.trim()}
                    className="bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-full transition-colors">
                    {posting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-forest-600 text-sm">
              {myNoteIsFresh
                ? `Come back in ${Math.ceil(hoursLeft)}h to post again 🌙`
                : 'You can post once every 24 hours.'}
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
            <div key={n.id || n.userId} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-sm text-forest-200 font-medium flex-shrink-0">
                  {n.mood || n.displayName?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-forest-200 text-sm font-medium">
                    {n.displayName}
                    {n.mood && <span className="ml-1.5 text-base">{n.mood}</span>}
                  </p>
                  <p className="text-forest-600 text-xs">
                    {n.city ? `${n.city}, ${n.country}` : n.country}
                    {timeAgo(n.notePostedAt) && ` · ${timeAgo(n.notePostedAt)}`}
                  </p>
                </div>
              </div>
              <p className="text-forest-300 text-sm italic leading-relaxed pl-11">
                {n.noteEmoji && <span className="not-italic mr-1.5">{n.noteEmoji}</span>}
                "{n.note}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
