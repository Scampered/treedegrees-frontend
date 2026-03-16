// src/pages/LettersPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { lettersApi, friendsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const VEHICLE_INFO = {
  car:       { emoji: '🚗',  label: 'Car'        },
  sportscar: { emoji: '🏎️',  label: 'Sports Car' },
  airliner:  { emoji: '✈️',  label: 'Airliner'   },
  jet:       { emoji: '🛩️',  label: 'Jet'        },
  spaceship: { emoji: '🚀',  label: 'Spaceship'  },
  radio:     { emoji: '📡',  label: 'Radio'      },
}

function timeAgo(date) {
  const d = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

function timeUntil(date) {
  const ms = new Date(date) - Date.now()
  if (ms <= 0) return 'Arrived'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `~${h}h ${m}m`
  if (m > 0) return `~${m}m`
  return 'Less than a minute'
}

// ── Fuel bar ──────────────────────────────────────────────────────────────────
function FuelDots({ fuel }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all
          ${i < fuel
            ? 'bg-forest-400 border-forest-300 shadow-sm shadow-forest-400/50'
            : 'bg-forest-900 border-forest-700'}`} />
      ))}
    </div>
  )
}

// ── Envelope card ─────────────────────────────────────────────────────────────
function EnvelopeLetter({ letter, onOpen, isMe }) {
  const [expanded, setExpanded] = useState(false)
  const v = VEHICLE_INFO[letter.vehicleTier] || VEHICLE_INFO.car

  const handleClick = async () => {
    if (letter.inTransit) return
    setExpanded(e => !e)
    if (!expanded && letter.isInbox && !letter.openedAt) {
      try { await lettersApi.open(letter.id) } catch {}
      onOpen?.(letter.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden
        ${letter.inTransit
          ? 'bg-forest-900/30 border-forest-800 opacity-80 cursor-default'
          : 'bg-forest-900/50 border-forest-800 hover:border-forest-600 cursor-pointer'}
        ${expanded ? 'border-forest-600' : ''}
        ${!letter.openedAt && letter.isInbox && !letter.inTransit ? 'border-l-2 border-l-forest-400' : ''}`}
    >
      {/* Envelope top */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Envelope icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all
          ${letter.inTransit ? 'bg-forest-800/60' : expanded ? 'bg-forest-700' : 'bg-forest-800'}`}>
          {letter.inTransit ? v.emoji : (expanded ? '💌' : '✉️')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-forest-200 text-sm font-medium">
              {letter.isInbox ? `From ${letter.senderName}` : `To ${letter.recipientName}`}
            </p>
            {!letter.openedAt && letter.isInbox && !letter.inTransit && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-forest-700 text-forest-200 font-medium">New</span>
            )}
          </div>
          {letter.inTransit ? (
            <p className="text-forest-500 text-xs mt-0.5 flex items-center gap-1">
              <span>{v.emoji}</span>
              Letter on the way — arrives {timeUntil(letter.arrivesAt)}
            </p>
          ) : (
            <p className="text-forest-600 text-xs mt-0.5">{timeAgo(letter.arrivesAt)} via {v.label}</p>
          )}
        </div>

        {!letter.inTransit && (
          <span className="text-forest-700 text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      {/* Envelope content — open animation */}
      {expanded && !letter.inTransit && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-forest-950/60 border border-forest-800 p-4">
            {/* Decorative envelope fold lines */}
            <div className="flex justify-center mb-3 opacity-30">
              <svg width="60" height="12" viewBox="0 0 60 12">
                <line x1="0" y1="0" x2="30" y2="12" stroke="#4dba4d" strokeWidth="1"/>
                <line x1="60" y1="0" x2="30" y2="12" stroke="#4dba4d" strokeWidth="1"/>
              </svg>
            </div>
            <p className="text-forest-100 text-sm leading-relaxed whitespace-pre-wrap">
              {letter.content}
            </p>
            <p className="text-forest-700 text-xs mt-3 text-right">
              Sent {new Date(letter.sentAt).toLocaleDateString()} · {v.emoji} {v.label}
              {letter.streakAtSend > 0 && ` · 🔥 Day ${letter.streakAtSend}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Send letter modal ─────────────────────────────────────────────────────────
function SendModal({ friends, streaks, onSend, onClose }) {
  const [step, setStep] = useState(1) // 1 = pick friend, 2 = write
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const selectedStreak = streaks.find(s => s.friendId === selected?.id)

  const handleSend = async () => {
    if (!content.trim()) return
    setSending(true)
    setError('')
    try {
      const result = await lettersApi.send(selected.id, content)
      onSend(result.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send letter')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <h2 className="font-display text-forest-100 text-xl">
            {step === 1 ? '✉️ Send a Letter' : `Write to ${selected?.displayName}`}
          </h2>
          <button onClick={onClose} className="text-forest-500 hover:text-forest-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800 transition-colors">✕</button>
        </div>

        {step === 1 && (
          <div className="p-5 max-h-80 overflow-y-auto space-y-2">
            {friends.length === 0 && (
              <p className="text-forest-500 text-sm text-center py-6">No connections yet</p>
            )}
            {friends.map(f => {
              const s = streaks.find(st => st.friendId === f.id)
              return (
                <button key={f.id} onClick={() => { setSelected(f); setStep(2) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-forest-900/50 hover:bg-forest-800 border border-forest-800 hover:border-forest-600 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center text-forest-200 flex-shrink-0">
                    {f.displayName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-forest-200 text-sm font-medium">{f.displayName}</p>
                    <p className="text-forest-600 text-xs">{f.city}, {f.country}</p>
                  </div>
                  {s && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-base">{s.tierEmoji}</p>
                      {s.streakDays > 0 && <p className="text-forest-500 text-xs">🔥{s.streakDays}</p>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && selected && (
          <div className="p-5 space-y-4">
            {selectedStreak && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-forest-900/50 border border-forest-800">
                <span className="text-2xl">{selectedStreak.tierEmoji}</span>
                <div>
                  <p className="text-forest-300 text-sm">{selectedStreak.tierLabel} delivery</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <FuelDots fuel={selectedStreak.fuel} />
                    <span className="text-forest-600 text-xs">fuel · 🔥 {selectedStreak.streakDays} day streak</span>
                  </div>
                </div>
              </div>
            )}
            <textarea
              className="w-full bg-forest-900/60 border border-forest-800 focus:border-forest-600 text-forest-100
                         placeholder-forest-700 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors h-36"
              placeholder="Write your letter… (500 characters max)"
              maxLength={500}
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${content.length > 450 ? 'text-bark-400' : 'text-forest-700'}`}>
                {content.length}/500
              </span>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-ghost text-sm py-2 px-4 rounded-full">← Back</button>
                <button onClick={handleSend} disabled={sending || !content.trim()}
                  className="btn-primary text-sm py-2 px-5 rounded-full">
                  {sending ? 'Sending…' : 'Send ✉️'}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Letters Page ─────────────────────────────────────────────────────────
export default function LettersPage() {
  const { user } = useAuth()
  const [letters, setLetters] = useState([])
  const [streaks, setStreaks] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'inbox' | 'sent'
  const [showSend, setShowSend] = useState(false)

  const reload = useCallback(async () => {
    try {
      const [l, s, f] = await Promise.all([
        lettersApi.list(),
        lettersApi.streaks(),
        friendsApi.list(),
      ])
      setLetters(l.data)
      setStreaks(s.data)
      setFriends(f.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // Poll for in-transit letters arriving
  useEffect(() => {
    const interval = setInterval(() => {
      const hasInTransit = letters.some(l => l.inTransit && new Date(l.arrivesAt) <= Date.now())
      if (hasInTransit) reload()
    }, 30000) // check every 30s
    return () => clearInterval(interval)
  }, [letters, reload])

  const handleOpen = (id) => {
    setLetters(prev => prev.map(l => l.id === id ? { ...l, openedAt: new Date() } : l))
  }

  const handleSent = (result) => {
    reload()
  }

  const filtered = letters.filter(l => {
    if (filter === 'inbox') return l.isInbox
    if (filter === 'sent')  return !l.isInbox
    return true
  })

  const unreadCount = letters.filter(l => l.isInbox && !l.openedAt && !l.inTransit).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-forest-50">✉️ Letters</h1>
          {unreadCount > 0 && (
            <p className="text-forest-400 text-xs mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <button onClick={() => setShowSend(true)}
          className="bg-forest-600 hover:bg-forest-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2">
          <span className="text-base">+</span> Write
        </button>
      </div>

      {/* Streaks summary */}
      {streaks.length > 0 && (
        <div className="px-5 py-3 border-b border-forest-800 flex gap-3 overflow-x-auto">
          {streaks.filter(s => s.streakDays > 0 || s.fuel > 0).map(s => (
            <div key={s.friendId} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-900/50 border border-forest-800">
              <span>{s.tierEmoji}</span>
              <div>
                <p className="text-forest-200 text-xs font-medium leading-none">{s.displayName}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <FuelDots fuel={s.fuel} />
                  {s.streakDays > 0 && <span className="text-forest-600 text-xs">🔥{s.streakDays}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-5 py-2 border-b border-forest-800 flex gap-1">
        {[['all','All'], ['inbox','Inbox'], ['sent','Sent']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${filter === v ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Letters list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading && (
          <div className="text-center py-12 text-forest-600">Loading letters…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✉️</div>
            <p className="text-forest-400 font-medium">No letters yet</p>
            <p className="text-forest-600 text-sm mt-1">Write a letter to one of your connections!</p>
            <button onClick={() => setShowSend(true)} className="btn-primary text-sm mt-4 rounded-full px-6">
              Write a letter
            </button>
          </div>
        )}
        {filtered.map(letter => (
          <EnvelopeLetter
            key={letter.id}
            letter={letter}
            onOpen={handleOpen}
            isMe={letter.senderId === user?.id}
          />
        ))}
      </div>

      {showSend && (
        <SendModal
          friends={friends}
          streaks={streaks}
          onSend={handleSent}
          onClose={() => setShowSend(false)}
        />
      )}
    </div>
  )
}
