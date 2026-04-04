// src/pages/DashboardPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { friendsApi, usersApi, lettersApi, jobsApi, notesApi } from '../api/client'
import MoodPicker from '../components/MoodPicker'
import QRCodeCard from '../components/QRCodeCard'
import InstallAppCard from '../components/InstallAppCard'

function weatherEmoji(theme) {
  const h = new Date().getHours()
  const isDay = h >= 6 && h < 20
  switch (theme) {
    case 'sunny':        return '☀️'
    case 'partly-cloudy': return isDay ? '⛅' : '🌙'
    case 'cloudy':       return '☁️'
    case 'rain':         return '🌧️'
    case 'storm':        return '⛈️'
    case 'snow':         return '❄️'
    case 'foggy':        return '🌫️'
    case 'dust':         return '🌪️'
    case 'ash':          return '🌋'
    case 'cyclone':      return '🌀'
    case 'night':        return '🌙'
    default:             return isDay ? '🌤️' : '🌙'
  }
}

// ── Flip card for friend notes ────────────────────────────────────────────────
// ── Flip card for friend notes ────────────────────────────────────────────────
function NoteCard({ note, isOwn, myReaction, onReact }) {
  const [flipped, setFlipped]   = useState(false)
  const [reacting, setReacting] = useState(false)
  const emoji        = note.mood || '🌿'
  const isForecaster = note.note?.startsWith('📡')
  const displayEmoji = isForecaster ? '📡' : emoji
  const timeStr      = note.notePostedAt
    ? new Date(note.notePostedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    : ''
  const likes = note.likes || []

  // Theme-aware colours via CSS vars
  const cardBack  = 'rgb(var(--f900) / 0.85)'
  const cardFront = 'rgb(var(--f900) / 0.95)'
  const border    = isOwn ? 'rgb(var(--f500) / 0.7)' : 'rgb(var(--f700) / 0.5)'
  const textMain  = 'rgb(var(--f100))'
  const textSub   = 'rgb(var(--f500))'

  const handleHeartClick = (e) => {
    e.stopPropagation()
    if (isOwn) return
    setReacting(r => !r)
  }

  return (
    <div className="flex-shrink-0 w-32 cursor-pointer select-none"
      style={{ perspective: 900 }}
      onClick={() => { if (!reacting) setFlipped(f => !f) }}>
      <div style={{
        position:'relative', width:'100%', paddingBottom:'150%',
        transition:'transform 0.45s cubic-bezier(.4,0,.2,1)',
        transformStyle:'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* ── BACK FACE (shown by default) ── */}
        <div style={{
          position:'absolute', inset:0, backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          borderRadius:16, background: cardBack, border:`1.5px solid ${border}`,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          padding:'10px 8px', overflow:'hidden',
        }}>
          {/* Streak */}
          {note.streakDays > 0 && (
            <div style={{ position:'absolute', top:7, left:7, background:'rgba(0,0,0,0.35)', borderRadius:8, padding:'2px 5px', display:'flex', alignItems:'center', gap:2 }}>
              <span style={{ fontSize:9 }}>🔥</span>
              <span style={{ color:'#e8c070', fontSize:10, fontWeight:700 }}>{note.streakDays}</span>
            </div>
          )}
          {isOwn && <div style={{ position:'absolute', top:7, right:7, fontSize:8, color:'rgb(var(--f400))', fontWeight:700 }}>YOU</div>}

          {/* Big emoji */}
          <span style={{ fontSize:42, lineHeight:1.1 }}>{displayEmoji}</span>

          {/* Heart / reaction button — centred below emoji */}
          <button
            onClick={handleHeartClick}
            style={{
              marginTop:8, background:'transparent', border:'none', cursor: isOwn ? 'default' : 'pointer',
              fontSize:18, opacity: isOwn ? 0 : 0.55, transition:'opacity 0.15s',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
            {myReaction || '🤍'}
          </button>

          {/* Reaction picker */}
          {reacting && (
            <div onClick={e => e.stopPropagation()}
              style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center', marginTop:4 }}>
              {['🌿','❤️','🔥','😂','👀','💯'].map(r => (
                <button key={r} onClick={() => { onReact(note.userId, r); setReacting(false) }}
                  style={{ fontSize:16, background:'transparent', border:'none', cursor:'pointer', padding:1 }}>
                  {r}
                </button>
              ))}
            </div>
          )}

          <span style={{ color: textSub, fontSize:8, marginTop: reacting ? 2 : 6, letterSpacing:'0.05em' }}>
            {reacting ? 'pick a react' : 'tap to read'}
          </span>

          {/* Name */}
          <div style={{ position:'absolute', bottom:7, right:7, color: textSub, fontSize:9, fontWeight:500, maxWidth:60, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {note.displayName}
          </div>
        </div>

        {/* ── FRONT FACE (after flip) ── */}
        <div style={{
          position:'absolute', inset:0, backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          borderRadius:16, background: cardFront, border:`1.5px solid ${border}`,
          transform:'rotateY(180deg)',
          display:'flex', flexDirection:'column', padding:10, overflow:'hidden',
        }}>
          <div style={{ fontSize:20, textAlign:'center', marginBottom:4 }}>{displayEmoji}</div>
          <p style={{ color: textMain, fontSize:10, lineHeight:1.5, flex:1, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:6, WebkitBoxOrient:'vertical' }}>
            {note.note}
          </p>

          {/* For own note: show reactions from connections */}
          {isOwn && likes.length > 0 && (
            <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:3 }}>
              {likes.slice(0,6).map((l, i) => (
                <div key={i} style={{
                  background:'rgba(240,220,100,0.12)', border:'1px solid rgba(240,220,100,0.22)',
                  borderRadius:5, padding:'2px 5px', fontSize:9, color:'rgba(240,230,150,0.75)',
                  display:'flex', gap:2, alignItems:'center',
                }}>
                  <span>{l.emoji}</span>
                  <span>{l.likerName?.length > 7 ? l.likerName.slice(0,6)+'-' : l.likerName}</span>
                </div>
              ))}
            </div>
          )}

          {/* For other notes: sticky notes of reactions */}
          {!isOwn && likes.length > 0 && (
            <div style={{ marginTop:5, display:'flex', flexWrap:'wrap', gap:2 }}>
              {likes.slice(0,4).map((l, i) => (
                <div key={i} style={{
                  background:'rgba(240,220,100,0.12)', border:'1px solid rgba(240,220,100,0.22)',
                  borderRadius:4, padding:'2px 4px', fontSize:8, color:'rgba(240,230,150,0.75)',
                }}>
                  {l.emoji} {l.likerName?.length > 7 ? l.likerName.slice(0,6)+'-' : l.likerName}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop:5, color: textSub, fontSize:8, display:'flex', justifyContent:'space-between' }}>
            <span>{note.displayName}</span>
            <span>{timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Streak connection card
// ── Streak connection card ────────────────────────────────────────────────────
function ConnectionCard({ friend, myId, onSelect }) {
  const streak = friend.streak || {}
  const fuel   = streak.fuel ?? 3
  const days   = streak.streak_days ?? 0
  const iSent  = streak.user_id_1 === myId ? streak.user1_sent_today : streak.user2_sent_today
  const theySent = streak.user_id_1 === myId ? streak.user2_sent_today : streak.user1_sent_today
  const atRisk = fuel <= 1 && days > 0

  return (
    <div onClick={() => onSelect(friend)}
      className={`rounded-2xl border p-4 flex items-center gap-3 transition-colors cursor-pointer
        ${atRisk ? 'bg-amber-950/30 border-amber-900/60 hover:border-amber-700' : 'bg-forest-900/40 border-forest-800 hover:border-forest-600'}`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
        ${atRisk ? 'bg-amber-900/40' : 'bg-forest-800'}`}>
        {friend.mood || '🌿'}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-forest-200 text-sm font-medium truncate">{friend.displayName}</p>
          {days > 0 && (
            <span className={`text-xs font-mono flex-shrink-0 ${atRisk ? 'text-amber-400' : 'text-forest-500'}`}>
              🔥{days}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {/* Fuel dots */}
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < fuel ? (atRisk ? 'bg-amber-400' : 'bg-forest-500') : 'bg-forest-800'}`}/>
            ))}
          </div>
          <span className="text-forest-600 text-xs">
            {iSent && theySent ? '✓ Both sent today' :
             iSent ? '✓ You sent' :
             theySent ? 'They sent' :
             days > 0 ? (atRisk ? '⚠️ At risk' : 'Not sent today') : 'No streak yet'}
          </span>
        </div>
      </div>
      {/* Send nudge */}
      <span className="text-forest-600 text-lg flex-shrink-0">✉️</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const { active: weatherTheme } = useTheme()
  const navigate             = useNavigate()
  const [friends, setFriends]       = useState([])
  const [requests, setRequests]     = useState([])
  const [letterStats, setLetterStats] = useState(null)
  const [friendNotes, setFriendNotes] = useState([])
  const [streaks, setStreaks]        = useState([])
  const [note, setNote]             = useState('')
  const [noteStatus, setNoteStatus] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [hoursLeft, setHoursLeft]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [myJob, setMyJob]           = useState(null)
  const [myNoteLikes, setMyNoteLikes] = useState([])
  const [onboardingDone, setOnboardingDone] = useState(() => localStorage.getItem('td_onboard') === 'done')
  const [seedsBalance, setSeedsBalance] = useState(null)

  useEffect(() => {
    // Listen to global seeds balance updates from Layout poller
    const handler = (e) => setSeedsBalance(e.detail)
    window.addEventListener('seeds-balance', handler)
    return () => window.removeEventListener('seeds-balance', handler)
  }, [])

  useEffect(() => {
    jobsApi.my().then(r => setMyJob(r.data.job)).catch(() => {})
    Promise.all([
      friendsApi.list(),
      friendsApi.requests(),
      lettersApi.stats().catch(() => ({ data: null })),
      usersApi.feed().catch(() => ({ data: [] })),
      lettersApi.streaks().catch(() => ({ data: [] })),
    ]).then(([f, r, s, feed, st]) => {
      setFriends(f.data || [])
      setRequests(r.data || [])
      setLetterStats(s.data)
      setFriendNotes(feed.data || [])
      setStreaks(st.data || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user?.dailyNoteUpdatedAt) {
      const hrs = (Date.now() - new Date(user.dailyNoteUpdatedAt).getTime()) / 36e5
      const remaining = 24 - hrs
      if (remaining > 0) {
        const h = Math.floor(remaining), m = Math.round((remaining - h) * 60)
        setHoursLeft(h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`)
      } else setHoursLeft(null)
    }
  }, [user])

  const canPost = !hoursLeft

  const postNote = async () => {
    if (!note.trim()) return
    setNoteLoading(true); setNoteStatus('')
    try {
      const { data } = await usersApi.postDailyNote(note)
      updateUser({ dailyNote: data.dailyNote, dailyNoteUpdatedAt: data.dailyNoteUpdatedAt })
      setHoursLeft('24.0'); setNote('')
      setNoteStatus('✓ Posted!')
    } catch (err) {
      setNoteStatus(err.response?.data?.error || 'Could not post note')
      if (err.response?.data?.hoursLeft) setHoursLeft(err.response.data.hoursLeft)
    } finally { setNoteLoading(false) }
  }

  // Enrich friend notes with streak data
  const handleReact = async (userId, emoji) => {
    try {
      await notesApi.likeNote(userId, emoji)
      // Refresh feed
      usersApi.feed().then(r => setFriendNotes(r.data || [])).catch(() => {})
    } catch {}
  }

  // Build own note card data
  const ownNote = user?.dailyNote ? {
    userId: user.id, displayName: user.nickname || user.fullName?.split(' ')[0],
    note: user.dailyNote, notePostedAt: user.dailyNoteUpdatedAt,
    mood: user.mood, likes: myNoteLikes, streakDays: 0,
  } : null

  const notesWithStreaks = friendNotes.map(n => {
    const streak = streaks.find(s =>
      (s.user_id_1 === n.userId || s.user_id_2 === n.userId)
    )
    return { ...n, streakDays: streak?.streak_days || 0 }
  })

  // Sort connections: at-risk first, then not-sent-today, then healthy
  const enrichedFriends = friends.map(f => {
    const streak = streaks.find(s => s.user_id_1 === f.id || s.user_id_2 === f.id)
    return { ...f, streak }
  }).sort((a, b) => {
    const aRisk = (a.streak?.fuel ?? 3) <= 1 && (a.streak?.streak_days ?? 0) > 0
    const bRisk = (b.streak?.fuel ?? 3) <= 1 && (b.streak?.streak_days ?? 0) > 0
    if (aRisk && !bRisk) return -1
    if (!aRisk && bRisk) return 1
    // Sort by streak days descending
    return (b.streak?.streak_days ?? 0) - (a.streak?.streak_days ?? 0)
  })

  const atRiskCount = enrichedFriends.filter(f => (f.streak?.fuel ?? 3) <= 1 && (f.streak?.streak_days ?? 0) > 0).length

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 flex items-start justify-between gap-3 flex-shrink-0">
        {/* Weather emoji + name + location */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <Link to="/profile"
            className="flex-shrink-0 select-none leading-none hover:opacity-80 transition-opacity self-start"
            title="Change theme in Settings">
            <span style={{ fontSize: 52, lineHeight: 1 }}>
              {weatherEmoji(weatherTheme)}
            </span>
          </Link>
          <div>
            <h1 className="font-display text-2xl text-forest-50 leading-none">
              {user?.nickname || user?.fullName?.split(' ')[0]}
            </h1>
            <p className="text-forest-500 text-xs mt-1">{user?.city}, {user?.country}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Seeds pill */}
          <Link to="/grove"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-forest-900 border border-forest-700
                       hover:border-forest-500 transition-colors">
            <span>🌱</span>
            <span className="text-forest-200 font-mono font-bold text-base">{seedsBalance ?? user?.seeds ?? 0}</span>
          </Link>
          {/* Job pill */}
          <Link to="/jobs"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-forest-900 border border-forest-700
                       hover:border-forest-500 transition-colors">
            <span>💼</span>
            <span className="text-forest-200 font-mono font-bold text-base">
              {myJob ? ({'courier':'Courier','writer':'Writer','seed_broker':'Broker','accountant':'Accountant','steward':'Steward','forecaster':'Forecaster','farmer':'Farmer'})[myJob.role] : 'Jobs'}
            </span>
          </Link>
        </div>
      </div>


      {/* ── Onboarding banner ── */}
      {!onboardingDone && friends.length === 0 && (
        <div className="mx-5 mb-3 rounded-2xl border border-forest-600 bg-forest-900/60 p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-forest-200 font-medium text-sm">🌱 Get started</p>
            <button onClick={() => { localStorage.setItem('td_onboard','done'); setOnboardingDone(true) }}
              className="text-forest-600 text-xs hover:text-forest-400">Dismiss</button>
          </div>
          {[
            { to:'/friends', label:'Add your first connection', done: friends.length > 0, icon:'🌿' },
            { to:'/letters', label:'Send them a letter', done: letterStats?.sent > 0, icon:'✉️' },
            { to:'/grove',   label:'Invest your seeds', done: false, icon:'🪴' },
          ].map((step, i) => (
            <a key={i} href={step.to}
              className={`flex items-center gap-3 py-2 border-b border-forest-800/50 last:border-0 hover:text-forest-200 transition-colors
                ${step.done ? 'opacity-40 line-through' : ''}`}>
              <span className="text-base">{step.done ? '✅' : step.icon}</span>
              <span className={`text-sm ${step.done ? 'text-forest-600' : 'text-forest-300'}`}>{step.label}</span>
              {!step.done && <span className="ml-auto text-forest-600 text-xs">→</span>}
            </a>
          ))}
        </div>
      )}
      {/* ── Connection requests banner ── */}
      {requests.length > 0 && (
        <div className="mx-5 mb-3 rounded-xl bg-forest-800/60 border border-forest-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🌿</span>
            <p className="text-forest-200 text-sm">
              {requests.length === 1
                ? `${requests[0].user.displayName} wants to connect`
                : `${requests.length} connection requests`}
            </p>
          </div>
          <Link to="/friends" className="text-forest-400 text-xs hover:text-forest-200 underline">
            See →
          </Link>
        </div>
      )}

      {/* ── At-risk streak warning ── */}
      {atRiskCount > 0 && (
        <div className="mx-5 mb-3 rounded-xl bg-amber-950/40 border border-amber-900/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <p className="text-amber-300 text-sm">
              {atRiskCount} streak{atRiskCount > 1 ? 's' : ''} at risk — send a letter today
            </p>
          </div>
          <Link to="/letters" className="text-amber-400 text-xs hover:text-amber-200 underline">
            Write →
          </Link>
        </div>
      )}

      {/* ── Notes strip — flip cards ── */}
      {(notesWithStreaks.length > 0 || ownNote) && (
        <div className="mb-4 flex-shrink-0">
          <div className="px-5 mb-2 flex items-center justify-between">
            <p className="text-forest-500 text-xs font-medium uppercase tracking-wide">Today's notes</p>
            <Link to="/feed" className="text-forest-600 text-xs hover:text-forest-400">See all →</Link>
          </div>
          <div className="px-5 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {ownNote && <NoteCard key="own" note={ownNote} isOwn={true} myReaction={null} onReact={() => {}} />}
            {notesWithStreaks.map(n => (
              <NoteCard key={n.id || n.userId} note={n} isOwn={false}
                myReaction={n.myReaction} onReact={handleReact} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="px-5 flex flex-col gap-4 pb-6">

        {/* Write today's note */}
        <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-forest-800 flex items-center justify-between">
            <p className="text-forest-300 text-sm font-medium">📝 Today's note</p>
            {!canPost && <span className="text-forest-600 text-xs">Next in {hoursLeft}</span>}
          </div>
          <div className="p-4">
            <MoodPicker compact />
            {user?.dailyNote && (
              <div className="mt-3 py-2 px-3 rounded-xl bg-forest-800/60 border-l-2 border-forest-600">
                <p className="text-forest-300 text-sm italic">"{user.dailyNote}"</p>
              </div>
            )}
            {canPost ? (
              <div className="mt-3">
                <textarea
                  className="w-full bg-forest-950/60 border border-forest-800 focus:border-forest-600
                             text-forest-100 placeholder-forest-700 rounded-xl px-3 py-2.5
                             text-sm resize-none outline-none transition-colors"
                  rows={3} maxLength={280} value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={user?.dailyNote ? 'Write a new note…' : "What's on your mind?"}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${noteStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{noteStatus}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-forest-700 text-xs">{note.length}/280</span>
                    <button onClick={postNote} disabled={noteLoading || !note.trim()}
                      className="bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-full transition-colors">
                      {noteLoading ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-forest-600 text-sm mt-3">
                {user?.dailyNote ? 'Posted today — see you tomorrow 🌙' : 'You can post once every 24 hours.'}
              </p>
            )}
          </div>
        </div>

        {/* Connection streak cards */}
        {enrichedFriends.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-forest-500 text-xs font-medium uppercase tracking-wide">Your connections</p>
              <Link to="/friends" className="text-forest-600 text-xs hover:text-forest-400">All →</Link>
            </div>
            <div className="flex flex-col gap-2">
              {enrichedFriends.slice(0, 6).map(f => (
                <ConnectionCard key={f.id} friend={f} myId={user?.id}
                  onSelect={f => navigate('/letters', { state: { selectFriend: f } })} />
              ))}
              {enrichedFriends.length > 6 && (
                <Link to="/friends"
                  className="text-center text-forest-600 text-xs py-2 hover:text-forest-400 transition-colors">
                  +{enrichedFriends.length - 6} more connections
                </Link>
              )}
            </div>
          </div>
        )}

        {friends.length === 0 && !loading && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-6 text-center">
            <p className="text-3xl mb-3">🌿</p>
            <p className="text-forest-300 font-medium mb-1">No connections yet</p>
            <p className="text-forest-600 text-sm mb-4">Share your friend code to start building your network</p>
            <Link to="/friends"
              className="inline-block bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm px-5 py-2 rounded-full transition-colors">
              Add connections
            </Link>
          </div>
        )}

        {/* Letters quick stats */}
        {letterStats && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-forest-800 flex items-center justify-between">
              <p className="text-forest-300 text-sm font-medium">✉️ Letters</p>
              <Link to="/letters" className="text-forest-600 text-xs hover:text-forest-400">Open mailbox →</Link>
            </div>
            <div className="grid grid-cols-2 divide-x divide-forest-800">
              <div className="px-4 py-3 text-center">
                <p className="text-forest-100 font-display text-2xl">{letterStats.received || 0}</p>
                <p className="text-forest-600 text-xs mt-0.5">received</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-forest-100 font-display text-2xl">{letterStats.sent || 0}</p>
                <p className="text-forest-600 text-xs mt-0.5">sent</p>
              </div>
            </div>
            {(letterStats.incoming > 0 || letterStats.outgoing > 0) && (
              <div className="px-4 py-2 border-t border-forest-800 flex justify-around text-xs text-forest-500">
                {letterStats.incoming > 0 && <span>✈️ {letterStats.incoming} on the way</span>}
                {letterStats.outgoing > 0 && <span>🚀 {letterStats.outgoing} in transit</span>}
              </div>
            )}
            <div className="px-4 py-3 border-t border-forest-800">
              <Link to="/letters"
                className="flex items-center justify-center gap-2 w-full bg-forest-700 hover:bg-forest-600
                           text-forest-100 text-sm font-medium py-2 rounded-xl transition-colors">
                ✉️ Write a letter
              </Link>
            </div>
          </div>
        )}

        {/* Quick nav tiles */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { to: '/map',    icon: '🗺️', label: 'Globe Map'  },
            { to: '/grove',  icon: '🪴', label: 'Grove'      },
            { to: '/jobs',   icon: '💼', label: 'Jobs'       },
          ].map(({ to, icon, label }) => (
            <Link key={to} to={to}
              className="rounded-xl bg-forest-900/40 border border-forest-800 hover:border-forest-600
                         p-3 flex flex-col items-center gap-1.5 transition-colors">
              <span className="text-2xl">{icon}</span>
              <p className="text-forest-400 text-xs font-medium">{label}</p>
            </Link>
          ))}
        </div>

        {/* Friend code + QR */}
        <div className="rounded-2xl bg-forest-800/40 border border-forest-700 p-4">
          <p className="text-forest-500 text-xs uppercase tracking-wide mb-2">Your Friend Code</p>
          <div className="flex items-center justify-between gap-3">
            <p className="friend-code text-forest-100 text-xl tracking-[0.18em]">{user?.friendCode}</p>
            <button onClick={() => navigator.clipboard?.writeText(user?.friendCode)}
              className="bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              Copy
            </button>
          </div>
        </div>

        <QRCodeCard friendCode={user?.friendCode} />
        <InstallAppCard />
      </div>
    </div>
  )
}
