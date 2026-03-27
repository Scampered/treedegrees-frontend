// src/pages/LettersPage.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { lettersApi, friendsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const VEHICLE_INFO = {
  car:       { emoji: '🚗',  label: 'Car'        },
  sportscar: { emoji: '🏎️',  label: 'Sports Car' },
  airliner:  { emoji: '🛩️',  label: 'Airliner'   },
  jet:       { emoji: '✈️',  label: 'Jet'        },
  spaceship: { emoji: '🚀',  label: 'Spaceship'  },
  radio:     { emoji: '🗼',  label: 'Radio'      },
}

function timeAgo(date) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return new Date(date).toLocaleDateString()
}

function timeUntil(date) {
  const ms = new Date(date) - Date.now()
  if (ms <= 0) return 'Any moment'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `~${h}h ${m}m`
  if (m > 0) return `~${m}m`
  return 'Less than a minute'
}

// ── Envelope letter card ──────────────────────────────────────────────────────
function EnvelopeLetter({ letter, onOpen, onRecall }) {
  const [expanded, setExpanded] = useState(false)
  const v = VEHICLE_INFO[letter.vehicleTier] || VEHICLE_INFO.car
  const isUnread = letter.isInbox && !letter.openedAt && !letter.inTransit

  const handleClick = async () => {
    if (letter.inTransit) return
    const wasExpanded = expanded
    setExpanded(e => !e)
    // Mark as read when CLOSING (user has seen it) — not when opening
    if (wasExpanded && letter.isInbox && !letter.openedAt) {
      try { await lettersApi.open(letter.id) } catch {}
      onOpen?.(letter.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden
        ${letter.inTransit ? 'bg-forest-900/20 border-forest-900 cursor-default' :
          'bg-forest-900/50 border-forest-800 hover:border-forest-600 cursor-pointer'}
        ${expanded ? 'border-forest-600' : ''}
        ${isUnread ? 'border-l-2 border-l-forest-400' : ''}`}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
          ${letter.inTransit ? 'bg-forest-800/40' : expanded ? 'bg-forest-700' : 'bg-forest-800'}`}>
          {letter.inTransit ? v.emoji : (expanded ? '💌' : '✉️')}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-forest-200 text-sm font-medium">
              {letter.isInbox ? `From ${letter.senderName}` : `To ${letter.recipientName}`}
            </p>
            {isUnread && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-forest-600 text-white font-medium">New</span>
            )}
          </div>
          <p className="text-forest-600 text-xs mt-0.5">
            {letter.inTransit
              ? `${v.label} · arrives ${timeUntil(letter.arrivesAt)}`
              : `${v.label} · ${timeAgo(letter.arrivesAt)}`}
          </p>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {letter.inTransit && !letter.isInbox && (
            <button
              onClick={e => { e.stopPropagation(); onRecall?.(letter.id) }}
              className="text-xs text-red-500 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-950/40 transition-colors"
            >
              Recall
            </button>
          )}
          {!letter.inTransit && (
            <span className="text-forest-700 text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && !letter.inTransit && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-forest-950/60 border border-forest-800 p-4">
            <div className="flex justify-center mb-3 opacity-20">
              <svg width="60" height="12" viewBox="0 0 60 12">
                <line x1="0" y1="0" x2="30" y2="12" stroke="#4dba4d" strokeWidth="1"/>
                <line x1="60" y1="0" x2="30" y2="12" stroke="#4dba4d" strokeWidth="1"/>
              </svg>
            </div>
            <p className="text-forest-100 text-sm leading-relaxed whitespace-pre-wrap">{letter.content}</p>
            <p className="text-forest-700 text-xs mt-3 text-right">
              {new Date(letter.sentAt).toLocaleDateString()} · {v.emoji} {v.label}
              {letter.streakAtSend > 0 && ` · 🔥 Day ${letter.streakAtSend}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Fuel dots ─────────────────────────────────────────────────────────────────
function FuelDots({ fuel }) {
  return (
    <div className="flex gap-1">
      {[0,1,2].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all
          ${i < fuel ? 'bg-forest-400 border-forest-300' : 'bg-forest-900 border-forest-700'}`} />
      ))}
    </div>
  )
}

// ── Send modal ────────────────────────────────────────────────────────────────

// ── Streak helpers ────────────────────────────────────────────────────────────
function useMidnightCountdown() {
  const [label, setLabel] = React.useState('')
  React.useEffect(() => {
    const tick = () => {
      const now  = new Date()
      const mss  = (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) - now
      const h    = Math.floor(mss / 3600000)
      const m    = Math.floor((mss % 3600000) / 60000)
      const icon = h >= 10 ? '🕛' : h >= 7 ? '🕙' : h >= 4 ? '🕕' : h >= 1 ? '🕑' : '🕧'
      setLabel(`${icon} ${h}h ${m}m`)
    }
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [])
  return label
}

function StreakDropdown({ streaks }) {
  const [open, setOpen] = React.useState(false)
  const midnight = useMidnightCountdown()
  if (!streaks.some(s => s.streakDays > 0)) return null

  const active  = [...streaks].filter(s => s.streakDays > 0).sort((a,b) => b.streakDays - a.streakDays)
  const warning = active.filter(s => s.fuel === 1)

  return (
    <div className="border-b border-forest-800 flex-shrink-0">
      {/* Scrollable pill row */}
      <div className="px-5 py-2.5 flex gap-3 overflow-x-auto">
        {active.map(s => {
          const nearBreak = s.fuel <= 1 && s.streakDays > 0
          return (
            <div key={s.friendId}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors
                ${nearBreak ? 'bg-bark-900/30 border-bark-800' : 'bg-forest-900/50 border-forest-800'}`}>
              <span>{s.tierEmoji}</span>
              <div>
                <div className="flex items-baseline gap-1.5 leading-none">
                  <p className="text-forest-200 text-xs font-medium leading-none">{s.displayName}</p>
                  <span className="text-forest-700 text-xs italic font-normal">{midnight}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <FuelDots fuel={s.fuel} />
                  <span className={`text-xs ${nearBreak ? 'text-bark-400' : 'text-forest-600'}`}>
                    {s.iSentToday ? '🔥' : '❄️'}{s.streakDays}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Expand/collapse button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-1.5 flex items-center justify-between text-forest-700 hover:text-forest-400 hover:bg-forest-900/20 transition-colors">
        <span className="text-xs">{open ? 'Hide streak details' : `Show all ${active.length} streak${active.length!==1?'s':''}`}</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail table */}
      {open && (
        <div className="px-5 pb-3 space-y-2">
          <div className="rounded-xl overflow-hidden border border-forest-800">
            {/* Header */}
            <div className="grid grid-cols-5 px-3 py-1.5 bg-forest-900/60 border-b border-forest-800">
              {['Connection','Streak','New day in','I sent','They sent'].map(h => (
                <span key={h} className="text-forest-600 text-xs uppercase tracking-wide">{h}</span>
              ))}
            </div>
            {active.map(s => {
              const nearBreak = s.fuel === 1
              return (
                <div key={s.friendId}
                  className={`grid grid-cols-5 px-3 py-2 border-b border-forest-900 last:border-0 items-center
                    ${nearBreak ? 'bg-bark-900/10' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{s.tierEmoji}</span>
                    <span className="text-forest-200 text-xs font-medium truncate">{s.displayName}</span>
                  </div>
                  <span className={`text-xs font-mono ${nearBreak ? 'text-bark-400' : 'text-forest-300'}`}>
                    {s.iSentToday ? '🔥' : '❄️'} {s.streakDays}d
                  </span>
                  <span className="text-forest-500 text-xs italic">{midnight}</span>
                  <span className="text-xs">{s.iSentToday ? '✅' : '❌'}</span>
                  <span className="text-xs">{s.theySentToday ? '✅' : '❌'}</span>
                </div>
              )
            })}
          </div>
          {warning.length > 0 && (
            <p className="text-bark-400 text-xs text-center italic">
              ⌛ {warning.length === 1
                ? `${warning[0].displayName}'s streak is about to break — send a letter before midnight!`
                : `${warning.length} streaks are about to break — send letters before midnight!`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SendModal({ friends, streaks, letters, onSend, onClose, initialFriendId, initialFriendData }) {
  const [step, setStep]       = useState(1)
  const [selected, setSelected] = useState(null)

  // Once friends load, pre-select the initial friend and jump to step 2
  useEffect(() => {
    if (initialFriendId && friends.length > 0) {
      const f = friends.find(fr => fr.id === initialFriendId)
      if (f) { setSelected(f); setStep(2) }
    }
  // eslint-disable-next-line
  }, [friends, initialFriendId])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState('')
  const sel = streaks.find(s => s.friendId === selected?.id)

  const handleSend = async () => {
    if (!selected?.id || !content.trim()) {
      setError('Recipient and content are required')
      return
    }
    setSending(true)
    setError('')
    try {
      await lettersApi.send(selected.id, content)
      onSend()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-8 bg-black/70" style={{alignItems:"flex-start",paddingTop:"max(2rem, env(safe-area-inset-top, 2rem))", overflowY:"auto"}}>
      <div className="w-full max-w-md rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <h2 className="font-display text-forest-100 text-xl">
            {step === 1 ? '✉️ Send a Letter' : `Write to ${selected?.displayName || initialFriendData?.displayName || '...'}`}
          </h2>
          <button onClick={onClose} className="text-forest-500 hover:text-forest-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800">✕</button>
        </div>

        {step === 1 && (
          <div className="p-5 max-h-72 overflow-y-auto space-y-2">
            {friends.length === 0 && <p className="text-forest-500 text-sm text-center py-6">No connections yet</p>}
            {friends.map(f => {
              const s = streaks.find(st => st.friendId === f.id)
              const hasInTransit = letters.some(l => !l.isInbox && l.inTransit && l.recipientId === f.id)
              return (
                <button key={f.id}
                  onClick={() => { if (!hasInTransit) { setSelected(f); setStep(2) } }}
                  disabled={hasInTransit}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left
                    ${hasInTransit
                      ? 'bg-forest-900/20 border-forest-900 opacity-50 cursor-not-allowed'
                      : 'bg-forest-900/50 hover:bg-forest-800 border-forest-800 hover:border-forest-600'}`}>
                  <div className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center text-forest-200 flex-shrink-0">
                    {f.displayName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-forest-200 text-sm font-medium">{f.displayName}</p>
                    <p className="text-forest-600 text-xs">{f.city}, {f.country}</p>
                  </div>
                  {hasInTransit
                    ? <p className="text-xs text-forest-700 italic">in transit…</p>
                    : <div className="text-right flex-shrink-0">
                        <p className="text-base">{s?.tierEmoji || '🚗'}</p>
                        {s?.streakDays > 0 && <p className="text-forest-600 text-xs">🔥{s.streakDays}</p>}
                      </div>
                  }
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && selected && (
          <div className="p-5 space-y-4">
            {sel && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-forest-900/50 border border-forest-800">
                <span className="text-2xl">{sel.tierEmoji}</span>
                <div>
                  <p className="text-forest-300 text-sm">{sel.tierLabel} delivery</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <FuelDots fuel={sel.fuel} />
                    <span className="text-forest-600 text-xs">🔥 {sel.streakDays} day streak</span>
                  </div>
                </div>
              </div>
            )}
            <textarea
              className="w-full bg-forest-900/60 border border-forest-800 focus:border-forest-600 text-forest-100
                         placeholder-forest-700 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-colors h-36"
              placeholder="Write your letter… (500 chars max)"
              maxLength={500} value={content}
              onChange={e => setContent(e.target.value)} autoFocus
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
  const location = useLocation()
  const initialFriendId   = location.state?.selectFriend?.id || null
  const initialFriendData = location.state?.selectFriend || null
  const { user } = useAuth()
  const [letters, setLetters]   = useState([])
  const [streaks, setStreaks]   = useState([])
  const [friends, setFriends]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('received')
  const [showSend, setShowSend] = useState(false)
  useEffect(() => {
    if (location.state?.selectFriend) setShowSend(true)
  // eslint-disable-next-line
  }, [])

  const reload = useCallback(async () => {
    try {
      const [l, s, f] = await Promise.all([
        lettersApi.list(),
        lettersApi.streaks(),
        friendsApi.list(),
      ])
      setLetters(l.data)
      setStreaks(s.data)
      // Sort by streak descending
      const streakData = s.data || []
      const sorted = (f.data || []).sort((a, b) => {
        const aStreak = streakData.find(st => st.friendId === a.id)?.streakDays || 0
        const bStreak = streakData.find(st => st.friendId === b.id)?.streakDays || 0
        return bStreak - aStreak
      })
      setFriends(sorted)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // Track which letters we've already called /arrived on this session
  // Persist which letters we've already processed across page refreshes
  // Server awards seeds automatically via poller — frontend just refreshes display
  // Poll every 20s to move in-transit letters to received and update balance
  useEffect(() => {
    const iv = setInterval(() => {
      const hasPending = letters.some(l => l.inTransit && new Date(l.arrivesAt) <= new Date())
      if (hasPending) {
        reload()
        window.dispatchEvent(new Event('seeds-updated'))
      }
    }, 20000)
    return () => clearInterval(iv)
  }, [letters, reload])

  const handleOpen = (id) => {
    setLetters(prev => prev.map(l => l.id === id ? { ...l, openedAt: new Date() } : l))
    // Tell Layout to refresh the unread badge immediately
    window.dispatchEvent(new Event('letter-read'))
  }

  const handleRecall = async (id) => {
    if (!window.confirm('Recall this letter? It will be destroyed and you can send again.')) return
    try {
      await lettersApi.recall(id)
      setLetters(prev => prev.filter(l => l.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Could not recall')
    }
  }

  // ── Tab definitions ──────────────────────────────────────────────────────────
  // "Received" — letters inbox that have arrived, most recent first
  const received = letters.filter(l => l.isInbox && !l.inTransit)
    .sort((a, b) => new Date(b.arrivesAt) - new Date(a.arrivesAt))

  // "On it's way" — ALL in-transit letters (both incoming ↓ and outgoing ↑)
  const onTheWay = letters.filter(l => l.inTransit)

  // "Sent" — outbox letters that have arrived, most recent first
  const sent = letters.filter(l => !l.isInbox && !l.inTransit)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))

  const unreadCount = received.filter(l => !l.openedAt).length

  const tabs = [
    { key: 'received', label: 'Received', count: received.length, badge: unreadCount },
    { key: 'ontheway', label: "On it's way", count: onTheWay.length },
    { key: 'sent',     label: 'Sent',      count: sent.length },
  ]

  const currentLetters =
    tab === 'received' ? received :
    tab === 'ontheway' ? onTheWay : sent

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-forest-50">✉️ Letters</h1>
          {unreadCount > 0 && <p className="text-forest-400 text-xs mt-0.5">{unreadCount} unread</p>}
        </div>
        <button onClick={() => setShowSend(true)}
          className="bg-forest-600 hover:bg-forest-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2">
          <span>+</span> Write
        </button>
      </div>

      <StreakDropdown streaks={streaks} />

      {/* Tabs */}
      <div className="px-5 py-2 border-b border-forest-800 flex gap-1 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab === t.key ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
            {t.label}
            {t.badge > 0
              ? <span className="bg-forest-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">{t.badge}</span>
              : t.count > 0
                ? <span className="text-forest-600">({t.count})</span>
                : null
            }
          </button>
        ))}
      </div>

      {/* Letters list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading && <div className="text-center py-12 text-forest-600">Loading letters…</div>}

        {!loading && currentLetters.length === 0 && (
          <div className="text-center py-14 px-6">
            <div className="text-5xl mb-4">
              {tab === 'received' ? '📬' : tab === 'ontheway' ? '✈️' : '📤'}
            </div>
            <p className="text-forest-300 font-medium text-lg mb-2">
              {tab === 'received' ? 'Your mailbox is empty'
               : tab === 'ontheway' ? 'Nothing in transit'
               : 'No delivered letters yet'}
            </p>
            <p className="text-forest-600 text-sm mb-5 leading-relaxed">
              {tab === 'received'
                ? 'Letters from your connections will appear here. The longer your streak, the faster they arrive.'
                : tab === 'ontheway'
                ? 'Letters you send are in transit until they arrive. Longer streaks unlock faster vehicles.'
                : 'Letters you've sent that have been delivered appear here.'}
            </p>
            {tab === 'received' && (
              <button onClick={() => setShowSend(true)}
                className="btn-primary text-sm rounded-full px-6 py-2.5">
                ✉️ Write your first letter
              </button>
            )}
          </div>
        )}

        {/* On it's way tab — group into incoming (↓) and outgoing (↑) */}
        {tab === 'ontheway' && onTheWay.length > 0 && (() => {
          const incoming = onTheWay.filter(l => l.isInbox)
          const outgoing = onTheWay.filter(l => !l.isInbox)
          return (
            <>
              {incoming.length > 0 && (
                <div>
                  <p className="text-forest-500 text-xs uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>↓</span> Coming to you ({incoming.length})
                  </p>
                  <div className="space-y-2">
                    {incoming.map(l => (
                      <EnvelopeLetter key={l.id} letter={l} onOpen={handleOpen} onRecall={handleRecall} />
                    ))}
                  </div>
                </div>
              )}
              {outgoing.length > 0 && (
                <div className={incoming.length > 0 ? 'mt-5' : ''}>
                  <p className="text-forest-500 text-xs uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>↑</span> Sent by you ({outgoing.length})
                  </p>
                  <div className="space-y-2">
                    {outgoing.map(l => (
                      <EnvelopeLetter key={l.id} letter={l} onOpen={handleOpen} onRecall={handleRecall} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* Received tab — unread first, then read */}
        {tab === 'received' && received.length > 0 && (() => {
          const unread = received.filter(l => !l.openedAt)
          const read   = received.filter(l => !!l.openedAt)
          return (
            <>
              {unread.length > 0 && (
                <div>
                  <p className="text-forest-500 text-xs uppercase tracking-wide mb-2">Unread ({unread.length})</p>
                  <div className="space-y-2">
                    {unread.map(l => <EnvelopeLetter key={l.id} letter={l} onOpen={handleOpen} onRecall={handleRecall} />)}
                  </div>
                </div>
              )}
              {read.length > 0 && (
                <div className={unread.length > 0 ? 'mt-5' : ''}>
                  <p className="text-forest-500 text-xs uppercase tracking-wide mb-2">Read ({read.length})</p>
                  <div className="space-y-2">
                    {read.map(l => <EnvelopeLetter key={l.id} letter={l} onOpen={handleOpen} onRecall={handleRecall} />)}
                  </div>
                </div>
              )}
            </>
          )
        })()}

        {/* Sent tab — just a list */}
        {tab === 'sent' && sent.map(l => (
          <EnvelopeLetter key={l.id} letter={l} onOpen={handleOpen} onRecall={handleRecall} />
        ))}
      </div>

      {showSend && (
        <SendModal
          friends={friends} streaks={streaks} letters={letters}
          onSend={reload} onClose={() => setShowSend(false)}
          initialFriendId={initialFriendId}
          initialFriendData={initialFriendData}
        />
      )}
    </div>
  )
}
