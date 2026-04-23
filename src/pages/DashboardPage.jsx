// src/pages/DashboardPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { friendsApi, usersApi, lettersApi, jobsApi, notesApi, momentsApi } from '../api/client'
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
function NoteCard({ note, isOwn, myReaction, onReact, onProfileClick, onNavigateFeed, onOpenImg }) {
  const storageKey = `note_read_${note.userId}_${note.notePostedAt}`
  const [flipped, setFlipped]   = useState(false)
  const [reacting, setReacting] = useState(false)
  const [hasRead, setHasRead]   = useState(() => !!sessionStorage.getItem(storageKey))

  const markRead = () => {
    sessionStorage.setItem(storageKey, '1')
    setHasRead(true)
  }
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
    <div className="flex-shrink-0 cursor-pointer select-none"
      style={{ width:'min(calc(50vw - 26px), 160px)', perspective: 900 }}
      onClick={() => { if (!reacting) { setFlipped(f => !f); if (!flipped) markRead() } }}>
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
          {/* Unread dot — solid red if unseen, hollow ring if seen */}
          {!isOwn && (
            <div style={{
              position:'absolute', top:6, right:6,
              width:9, height:9, borderRadius:'50%',
              background: hasRead ? 'transparent' : '#ef4444',
              border: hasRead ? '2px solid #ef4444' : 'none',
              boxShadow: hasRead ? 'none' : '0 0 4px rgba(239,68,68,0.6)',
            }}/>
          )}

          {/* Big emoji */}
          <span style={{ fontSize:52, lineHeight:1.1 }}>{displayEmoji}</span>

          {/* Heart / reaction button — centred below emoji */}
          <button
            onClick={handleHeartClick}
            style={{
              marginTop:8, background:'transparent', border:'none', cursor: isOwn ? 'default' : 'pointer',
              fontSize:22, opacity: isOwn ? 0 : 0.55, transition:'opacity 0.15s',
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
                  style={{ fontSize:18, background:'transparent', border:'none', cursor:'pointer', padding:1 }}>
                  {r}
                </button>
              ))}
            </div>
          )}

          <span style={{ color: textSub, fontSize:8, marginTop: reacting ? 2 : 6, letterSpacing:'0.05em' }}>
            {reacting ? 'pick a react' : 'tap to read'}
          </span>

          {/* Name — bold and clickable */}
          <div onClick={e=>{e.stopPropagation();if(!isOwn&&onProfileClick)onProfileClick()}}
            style={{ position:'absolute', bottom:7, right:7, fontSize:11, fontWeight:700, maxWidth:70, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'rgb(var(--f200))', cursor:isOwn?'default':'pointer', textDecoration: isOwn?'none':'underline' }}>
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
          <div style={{ fontSize:18, textAlign:'center', marginBottom:3 }}>{displayEmoji}</div>
          <p
            style={{ color: textMain, fontSize:10, lineHeight:1.4, overflow:'hidden', display:'-webkit-box',
              WebkitLineClamp: note.noteMomentCdnUrl ? 2 : 5, WebkitBoxOrient:'vertical',
              wordBreak:'break-word', overflowWrap:'break-word', flexShrink:0 }}>
            {note.note}
          </p>
          <span onClick={e => { e.stopPropagation(); onNavigateFeed?.() }}
            style={{ fontSize:8, color:'rgb(var(--f500))', cursor:'pointer', marginTop:1, flexShrink:0, alignSelf:'flex-end' }}>
            read →
          </span>
          {/* Attached memory — fills card width, natural ratio, tight polaroid border */}
          {note.noteMomentCdnUrl && (
            <div style={{marginTop:4,flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}
              onClick={e => e.stopPropagation()}>
              <div style={{background:'#f5f0e8',padding:'3px 3px 7px 3px',borderRadius:4,
                boxShadow:'0 2px 8px rgba(0,0,0,0.45)',width:'100%',cursor:'pointer'}}>
                <img src={note.noteMomentCdnUrl} alt="" style={{width:'100%',height:'auto',borderRadius:2,display:'block'}}/>
              </div>
            </div>
          )}

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
            <span onClick={e => { e.stopPropagation(); onProfileClick?.() }} style={{ cursor: onProfileClick ? 'pointer' : 'default', textDecoration: onProfileClick ? 'underline' : 'none' }}>{note.displayName}</span>
            <span>{timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Streak connection card ────────────────────────────────────────────────────
function ConnectionCard({ friend, myId, onViewMap, onWriteLetter, onViewProfile }) {
  const streak   = friend.streak || {}
  const fuel     = streak.fuel ?? 3
  const days     = streak.streakDays ?? 0
  const iSent    = streak.iSentToday || false
  const theySent = streak.theySentToday || false
  const atRisk   = fuel <= 1 && days > 0

  return (
    <div className={`rounded-2xl border flex items-center transition-colors overflow-hidden
      ${atRisk ? 'bg-amber-950/30 border-amber-900/60' : 'bg-forest-900/40 border-forest-800'}`}>

      {/* Avatar — clicks to profile */}
      <div onClick={() => onViewProfile && onViewProfile(friend)}
        className={`w-14 flex-shrink-0 self-stretch flex items-center justify-center text-xl cursor-pointer hover:opacity-80 transition-opacity border-r
          ${atRisk ? 'bg-amber-900/20 border-amber-900/40' : 'bg-forest-800/40 border-forest-800'}`}>
        {friend.mood || '🌿'}
      </div>

      {/* Info — clicks to map */}
      <div onClick={() => onViewMap && onViewMap(friend)}
        className="flex-1 min-w-0 px-3 py-3 cursor-pointer hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-1.5">
          <p className="text-forest-200 text-sm font-medium truncate">{friend.displayName}</p>
          {days > 0 && (
            <span className={`text-xs font-mono flex-shrink-0 ${atRisk ? 'text-amber-400' : 'text-forest-500'}`}>
              🔥{days}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < fuel ? (atRisk ? 'bg-amber-400' : 'bg-forest-500') : 'bg-forest-800'}`}/>
            ))}
          </div>
          <span className="text-forest-600 text-xs">
            {iSent && theySent ? '✓ Both sent' :
             iSent ? '✓ You sent' :
             theySent ? 'They sent' :
             days > 0 ? (atRisk ? '⚠️ At risk' : 'Not sent today') : 'No streak yet'}
          </span>
        </div>
      </div>

      {/* Letter button */}
      <button
        onClick={e => { e.stopPropagation(); onWriteLetter && onWriteLetter(friend) }}
        className={`flex-shrink-0 px-3 self-stretch flex items-center border-l transition-colors
          ${atRisk ? 'border-amber-900/40 text-amber-500 hover:bg-amber-950/30' : 'border-forest-800 text-forest-500 hover:bg-forest-800/50 hover:text-forest-200'}`}
        title={`Write to ${friend.displayName}`}>
        ✉️
      </button>
    </div>
  )
}


// ── Letter progress bar ────────────────────────────────────────────────────────
const VEHICLE_EMOJI_DB = {
  car: '🚗', sportscar: '🏎️', airliner: '🛩️', jet: '✈️', spaceship: '🚀', radio: '🗼',
}

function LetterProgressBar({ letter, myId }) {
  const [progress, setProgress] = useState(0)
  const isSending = letter.senderId === myId

  useEffect(() => {
    const tick = () => {
      const sent = new Date(letter.sentAt).getTime()
      const arrives = new Date(letter.arrivesAt).getTime()
      const now = Date.now()
      setProgress(Math.min(1, Math.max(0, (now - sent) / (arrives - sent))))
    }
    tick()
    const iv = setInterval(tick, 10000)
    return () => clearInterval(iv)
  }, [letter.sentAt, letter.arrivesAt])

  const emoji = VEHICLE_EMOJI_DB[letter.vehicleTier] || '🚗'
  const pct = Math.round(progress * 100)
  const hoursLeft = Math.max(0, (new Date(letter.arrivesAt) - Date.now()) / 3600000)
  const timeLabel = hoursLeft < 1 ? `${Math.round(hoursLeft * 60)}m` : `${hoursLeft.toFixed(1)}h`

  return (
    <div className="px-3 py-2 rounded-xl border border-forest-800 bg-forest-900/40">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-forest-400 text-xs">
          {isSending ? `✉️ To ${letter.senderName || 'them'}` : `✉️ From ${letter.senderName}`}
        </span>
        <span className="text-forest-600 text-xs">{timeLabel} left</span>
      </div>
      <div className="relative h-5 bg-forest-950 rounded-full overflow-hidden border border-forest-800">
        {/* Track fill */}
        <div className="absolute inset-y-0 left-0 bg-forest-800/50 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }} />
        {/* Vehicle */}
        <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 text-sm leading-none"
          style={{ left: `calc(${pct}% - 10px)` }}>
          {emoji}
        </div>
        {/* Destination dot */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-forest-500" />
      </div>
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
  const [inTransit, setInTransit]     = useState([])
  const [streaks, setStreaks]        = useState([])
  const [noteImgLightbox, setNoteImgLightbox] = useState(null)
  const [note, setNote]             = useState('')
  const [noteStatus, setNoteStatus] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [hoursLeft, setHoursLeft]   = useState(null)
  const [noteAttachment, setNoteAttachment] = useState(null)
  const [showNotePicker, setShowNotePicker] = useState(false)
  const [noteMoments, setNoteMoments] = useState([])
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
    ]).then(([f, r, s, feed, st, it]) => {
      setFriends(f.data || [])
      setRequests(r.data || [])
      setLetterStats(s.data)
      setFriendNotes(feed.data || [])
      setInTransit(Array.isArray(it?.data) ? it.data : [])
      const stData = st.data
      setStreaks(Array.isArray(stData) ? stData : (stData?.streaks || []))
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
      const { data } = await usersApi.postDailyNote(note, noteAttachment?.id || null, noteAttachment?.cdn_url || null)
      updateUser({ dailyNote: data.dailyNote, dailyNoteUpdatedAt: data.dailyNoteUpdatedAt, noteMomentCdnUrl: data.noteMomentCdnUrl || null })
      setHoursLeft('24.0'); setNote('')
      setNoteAttachment(null); setShowNotePicker(false)
      setNoteStatus('✓ Posted!')
    } catch (err) {
      setNoteStatus(err.response?.data?.error || 'Could not post note')
      if (err.response?.data?.hoursLeft) setHoursLeft(err.response.data.hoursLeft)
    } finally { setNoteLoading(false) }
  }

  const openNotePicker = async () => {
    if (noteMoments.length === 0) {
      const r = await momentsApi.mine().catch(()=>({data:[]}))
      setNoteMoments(r.data||[])
    }
    setShowNotePicker(s=>!s)
  }

  // Enrich friend notes with streak data
  const handleReact = async (userId, emoji) => {
    if (!userId || userId === user?.id) return  // never like own note
    try {
      await notesApi.like(userId, emoji)
      // Refresh feed
      usersApi.feed().then(r => setFriendNotes(r.data || [])).catch(() => {})
    } catch {}
  }

  // Build own note card data
  const ownNote = user?.dailyNote ? {
    userId: user.id, displayName: user.nickname || user.fullName?.split(' ')[0],
    note: user.dailyNote, notePostedAt: user.dailyNoteUpdatedAt,
    mood: user.mood, likes: myNoteLikes, streakDays: 0,
    noteMomentCdnUrl: user.noteMomentCdnUrl || null,
  } : null

  const notesWithStreaks = friendNotes.map(n => {
    const streak = streaks.find(s => s.friendId === n.userId)
    return { ...n, streakDays: streak?.streakDays || 0 }
  })

  // Sort connections: streak desc, then seeds desc
  const sortedFriends = [...(friends||[])].sort((a,b) => {
    const sa = streaks.find(s=>s.friendId===a.id)?.streakDays||0
    const sb = streaks.find(s=>s.friendId===b.id)?.streakDays||0
    if (sb !== sa) return sb - sa
    return (b.seeds||b.currentSeeds||0) - (a.seeds||a.currentSeeds||0)
  })

  // Sort connections: at-risk first, then not-sent-today, then healthy
  const enrichedFriends = friends.map(f => {
    const streak = streaks.find(s => s.friendId === f.id)
    return { ...f, streak }
  }).sort((a, b) => {
    const aRisk = (a.streak?.fuel ?? 3) <= 1 && (a.streak?.streakDays ?? 0) > 0
    const bRisk = (b.streak?.fuel ?? 3) <= 1 && (b.streak?.streakDays ?? 0) > 0
    if (aRisk && !bRisk) return -1
    if (!aRisk && bRisk) return 1
    return (b.streak?.streakDays ?? 0) - (a.streak?.streakDays ?? 0)
  })

  const atRiskCount = enrichedFriends.filter(f => (f.streak?.fuel ?? 3) <= 1 && (f.streak?.streakDays ?? 0) > 0).length

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
          <div className="px-5 flex gap-3 overflow-x-auto pb-3 scrollbar-none">
            {ownNote && <NoteCard key="own" note={ownNote} isOwn={true} myReaction={null} onReact={() => {}} onNavigateFeed={() => navigate('/feed')} onOpenImg={setNoteImgLightbox} />}
            {notesWithStreaks.map(n => (
              <NoteCard key={n.id || n.userId} note={n} isOwn={false}
                myReaction={n.myReaction} onReact={handleReact}
                onProfileClick={() => navigate(`/profile/${n.userId}`)}
                onNavigateFeed={() => navigate('/feed')}
                onOpenImg={setNoteImgLightbox} />
            ))}
          </div>
        </div>
      )}

      {/* ── Letters in transit progress bars ── */}
      {inTransit.length > 0 && (
        <div className="px-5 mb-2 flex-shrink-0">
          <p className="text-forest-500 text-xs font-medium uppercase tracking-wide mb-2">Letters in transit</p>
          <div className="flex flex-col gap-2">
            {inTransit.slice(0, 4).map(l => (
              <LetterProgressBar key={l.id} letter={l} myId={user?.id} />
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
                {/* Note attachment preview */}
                {noteAttachment && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-xl" style={{background:'rgb(var(--f900)/0.6)',border:'1px solid rgb(var(--f800)/0.4)'}}>
                    <img src={noteAttachment.cdn_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                    <span className="text-xs flex-1 truncate" style={{color:'rgb(var(--f500))'}}>Memory attached</span>
                    <button onClick={()=>setNoteAttachment(null)} className="text-xs" style={{color:'rgb(var(--f600))'}}>✕</button>
                  </div>
                )}
                {/* Note moment picker */}
                {showNotePicker && (
                  <div className="mt-2 rounded-xl overflow-hidden" style={{background:'rgb(var(--f900)/0.8)',border:'1px solid rgb(var(--f700)/0.4)'}}>
                    <p className="px-3 py-2 text-xs" style={{color:'rgb(var(--f500))'}}>Pick a memory</p>
                    {noteMoments.length === 0 ? (
                      <p className="px-3 pb-3 text-xs" style={{color:'rgb(var(--f600))'}}>No memories yet</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {noteMoments.slice(0,8).map(m => (
                          <button key={m.id} onClick={()=>{setNoteAttachment(m);setShowNotePicker(false)}}
                            className="rounded-lg overflow-hidden" style={{aspectRatio:'1'}}>
                            <img src={m.cdn_url} alt="" className="w-full h-full object-cover"/>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${noteStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{noteStatus}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-forest-700 text-xs">{note.length}/280</span>
                    <button onClick={openNotePicker}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
                      style={{background: noteAttachment ? 'rgb(var(--f600)/0.7)' : 'rgb(var(--f800)/0.5)', border:'1px solid rgb(var(--f700)/0.5)'}}
                      title="Attach a memory">
                      {noteAttachment ? '🖼️' : '+'}
                    </button>
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
                  onViewProfile={f => navigate(`/profile/${f.id}`)}
                  onViewMap={f => navigate('/map', { state: { flyTo: { lat: f.latitude, lng: f.longitude } } })}
                  onWriteLetter={f => navigate('/letters', { state: { selectFriend: f } })} />
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

      {/* Note image lightbox */}
      {noteImgLightbox && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center"
          style={{background:'rgba(0,0,0,0.97)',backdropFilter:'blur(12px)'}}
          onClick={() => setNoteImgLightbox(null)}>
          <button className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white">✕</button>
          <img src={noteImgLightbox} alt="" className="object-contain rounded-xl"
            style={{maxHeight:'90vh',maxWidth:'90vw'}} onClick={e => e.stopPropagation()}/>
        </div>
      )}
    </div>
  )
}
