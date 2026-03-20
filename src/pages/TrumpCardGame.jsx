// src/pages/TrumpCardGame.jsx — Trump Card complete UI
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gamesApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Card colours ──────────────────────────────────────────────────────────────
const TONE = {
  basic:    { bg:'#0d1520', border:'#2d4a70', atkCol:'#ef4444', defCol:'#3b82f6', nameCol:'#94b4d4' },
  tactical: { bg:'#091818', border:'#0a5555', atkCol:'#ef4444', defCol:'#3b82f6', nameCol:'#4dd4c8' },
  amber:    { bg:'#160e00', border:'#8a5210', atkCol:'#ef4444', defCol:'#3b82f6', nameCol:'#f59e0b' },
  purple:   { bg:'#0f0618', border:'#5b21b6', atkCol:'#ef4444', defCol:'#3b82f6', nameCol:'#c4b5fd' },
}

// ── Card icons (all 12 types) ─────────────────────────────────────────────────
const ICONS = {
  soldier:        'M12 4a3 3 0 100 6 3 3 0 000-6zM5 20v-2a7 7 0 0114 0v2M10 3h4v2h-4z',
  armored_soldier:'M12 2L6 5v6c0 5 3 8 6 9 3-1 6-4 6-9V5z',
  drone:          'M12 12m-2 0a2 2 0 104 0 2 2 0 10-4 0M4 4m-2 0a2 2 0 104 0 2 2 0 10-4 0M20 4m-2 0a2 2 0 104 0 2 2 0 10-4 0M4 20m-2 0a2 2 0 104 0 2 2 0 10-4 0M20 20m-2 0a2 2 0 104 0 2 2 0 10-4 0M6.5 6.5l3 3M14 6.5l-2.5 3M9.5 14l-3 3M14.5 17l-2.5-3',
  tank:           'M3 10h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zM8 20a2 2 0 100-4 2 2 0 000 4zM16 20a2 2 0 100-4 2 2 0 000 4zM9 8h6V6H9zM15 9h4',
  jet:            'M12 2l-6 12h4l-2 6 6-4 6 4-2-6h4z',
  missile:        'M12 2v14M9 6l3-4 3 4M9 16l-3 5h12l-3-5M7 12H5M17 12h2',
  artillery:      'M6 18a3 3 0 100-6 3 3 0 000 6zM16 18a2 2 0 100-4 2 2 0 000 4zM9 18h5M14 16l6-9',
  interceptor:    'M12 3l3 7h5l-4 3.5 2 6.5-6-3.5-6 3.5 2-6.5L4 10h5z',
  divert_attack:  'M4 8l5-5 5 5M9 3v10M20 16l-5 5-5-5M15 21V11',
  call_reinforce: 'M7 16a3 3 0 100-6 3 3 0 000 6zM17 16a3 3 0 100-6 3 3 0 000 6zM12 10a3 3 0 100-6 3 3 0 000 6zM7 13v-6M17 13v-6M12 7v-4',
  spy_operation:  'M12 8a3 3 0 100 6 3 3 0 000-6zM5 20v-1a7 7 0 0114 0v1M4 12h16',
  block_comms:    'M2 2l20 20M8 8a6 6 0 018.5 8.5M12 5a8 8 0 018 8M4.5 9.5A8 8 0 0112 5M12 19a1 1 0 100-2 1 1 0 000 2z',
}

// ── Card SVG ──────────────────────────────────────────────────────────────────
function CardSvg({ card, selected, onClick, hidden, w=72, h=108 }) {
  const t = TONE[card?.sub] || TONE.basic
  const clickable = !!onClick
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}
      onClick={onClick}
      style={{ cursor: clickable ? 'pointer' : 'default', flexShrink:0, display:'block' }}>
      {/* Body */}
      <rect x="1" y="1" width={w-2} height={h-2} rx="6"
        fill={selected ? '#091f09' : t.bg}
        stroke={selected ? '#22c55e' : t.border}
        strokeWidth={selected ? 2.5 : 1.5}/>
      {hidden ? (
        <>
          <rect x="4" y="4" width={w-8} height={h-8} rx="4" fill="rgba(0,0,0,0.6)"/>
          <text x={w/2} y={h/2} textAnchor="middle" dominantBaseline="middle" fill="#555" fontSize="8" fontFamily="monospace">? ? ?</text>
        </>
      ) : (<>
        {/* ATK — top left, RED, large */}
        {card.atk > 0 && (
          <>
            <text x="6" y="17" fill="#ef4444" fontSize="14" fontWeight="900" fontFamily="monospace">{card.atk}</text>
            <text x="6" y="25" fill="#ef4444" fontSize="5.5" fontFamily="sans-serif" opacity="0.85">ATK</text>
          </>
        )}
        {/* Card name — center top */}
        <text x={w/2} y={card.atk > 0 ? "14" : "12"} textAnchor="middle"
          fill={card.type==='special' ? '#ffffff' : t.nameCol}
          fontSize="6.5" fontFamily="'Dosis',system-ui" fontWeight="700"
          letterSpacing="0.3">
          {card.name.length > 13 ? card.name.slice(0,12)+'…' : card.name}
        </text>
        {/* Icon — centre */}
        <g transform={`translate(${w/2-10},${h/2-12})`} fill="none"
          stroke={card.type==='special' ? '#ffffff' : t.nameCol}
          strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d={ICONS[card.id] || ICONS.soldier}/>
          </svg>
        </g>
        {/* DEF — bottom right, BLUE, large */}
        {card.def > 0 && (
          <>
            <text x={w-6} y={h-10} textAnchor="end" fill="#60a5fa" fontSize="14" fontWeight="900" fontFamily="monospace">{card.def}</text>
            <text x={w-6} y={h-3}  textAnchor="end" fill="#60a5fa" fontSize="5.5" fontFamily="sans-serif" opacity="0.85">DEF</text>
          </>
        )}
        {/* Special label */}
        {card.type==='special' && card.atk===0 && (
          <text x={w/2} y={h-5} textAnchor="middle" fill="#ffffff" fontSize="5.5" fontFamily="sans-serif" opacity="0.9">SPECIAL</text>
        )}
        {/* Spy shimmer border */}
        {card.id==='spy_operation' && (
          <rect x="1" y="1" width={w-2} height={h-2} rx="6" fill="none"
            stroke="#a78bfa" strokeWidth="2" opacity="0.4" strokeDasharray="4 3"/>
        )}
      </>)}
      {/* Damaged overlay */}
      {card.damaged && <rect x="0" y="0" width={w} height={h} rx="6" fill="rgba(234,179,8,0.07)"/>}
      {card.damaged && <rect x="0" y="0" width={w} height={h} rx="6" fill="none" stroke="#ca8a04" strokeWidth="2" strokeDasharray="4 3"/>}
      {card.damaged && <text x={w/2} y={h/2+20} textAnchor="middle" fill="#ca8a04" fontSize="7" fontWeight="700" fontFamily="monospace">DMG</text>}
      {/* Selection glow */}
      {selected && <rect x="0" y="0" width={w} height={h} rx="6" fill="rgba(34,197,94,0.10)"/>}
    </svg>
  )
}

// ── Deployment slot ───────────────────────────────────────────────────────────
function Slot({ card, label, color, borderColor, onRemove, w=74, h=110 }) {
  return (
    <div style={{
      width:w, height:h, borderRadius:8, flexShrink:0, position:'relative',
      border:`2px dashed ${card ? borderColor : '#222'}`,
      background: card ? 'transparent' : 'rgba(0,0,0,0.3)',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'border-color .2s',
    }}>
      {card ? (
        <>
          <CardSvg card={card} w={w-4} h={h-4}/>
          <button onClick={onRemove} style={{
            position:'absolute', top:-7, right:-7,
            width:18, height:18, borderRadius:'50%',
            background:'#7f1d1d', border:'1px solid #f87171',
            color:'#fca5a5', cursor:'pointer', fontSize:10, lineHeight:'18px', textAlign:'center',
          }}>✕</button>
        </>
      ) : (
        <div style={{ textAlign:'center', padding:6 }}>
          <div style={{ fontSize:8, color: color, letterSpacing:1, fontFamily:'system-ui', fontWeight:600 }}>{label}</div>
        </div>
      )}
    </div>
  )
}

// ── Hearts ────────────────────────────────────────────────────────────────────
function Hearts({ count, max }) {
  return (
    <div style={{ display:'flex', gap:1, alignItems:'center', flexWrap:'wrap', maxWidth:80 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize:10, lineHeight:1, opacity: i < count ? 1 : 0.18 }}>❤️</span>
      ))}
    </div>
  )
}

// ── Lobby expiry ──────────────────────────────────────────────────────────────
function ExpiryCountdown({ createdAt }) {
  const [secs, setSecs] = useState(120)
  useEffect(() => {
    if (!createdAt) return
    const tick = () => setSecs(Math.max(0, 120 - Math.floor((Date.now() - new Date(createdAt)) / 1000)))
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [createdAt])
  const urgent = secs <= 30
  return (
    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, color: urgent?'#f87171':'#6b7280', background: urgent?'rgba(127,29,29,.25)':'rgba(0,0,0,.3)', border:`1px solid ${urgent?'#7f1d1d':'#333'}` }}>
      {urgent?'⚠ ':'⏱ '}{secs}s
    </span>
  )
}

// ── Defense timer bar ─────────────────────────────────────────────────────────
function DefTimer({ deadline, onExpire }) {
  const [secs, setSecs] = useState(30)
  const firedRef = useRef(false)
  useEffect(() => {
    if (!deadline) return
    firedRef.current = false
    const tick = () => {
      const s = Math.max(0, Math.ceil((new Date(deadline) - Date.now()) / 1000))
      setSecs(s)
      if (s === 0 && !firedRef.current) { firedRef.current = true; onExpire?.() }
    }
    tick(); const iv = setInterval(tick, 500); return () => clearInterval(iv)
  }, [deadline])
  const pct = (secs / 30) * 100
  const col = secs > 12 ? '#22c55e' : secs > 5 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ width:'100%', display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ flex:1, height:5, background:'#1f2937', borderRadius:3 }}>
        <div style={{ width:`${pct}%`, height:5, borderRadius:3, background:col, transition:'width .5s, background .3s' }}/>
      </div>
      <span style={{ color:col, fontSize:11, minWidth:22, textAlign:'right' }}>{secs}s</span>
    </div>
  )
}

// ── Chat popup ────────────────────────────────────────────────────────────────
function ChatPopup({ chat, onSend, onClose }) {
  const [text, setText] = useState('')
  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText('') }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'flex-end' }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxHeight:'70vh', background:'#030805', borderTop:'1px solid #0d2010',
        borderRadius:'16px 16px 0 0', display:'flex', flexDirection:'column',
      }}>
        <div style={{ padding:'12px 16px 8px', borderBottom:'1px solid #0d2010', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ color:'#6b7280', fontSize:12, textTransform:'uppercase', letterSpacing:1 }}>Chat</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 14px', display:'flex', flexDirection:'column-reverse' }}>
          {chat.map((m,i)=>(
            <div key={i} style={{ marginBottom:6 }}>
              <span style={{ fontSize:11, color:'#6b7280', fontWeight:600 }}>{m.name}: </span>
              <span style={{ fontSize:12, color:'#d1d5db' }}>{m.text}</span>
            </div>
          ))}
          {chat.length===0 && <p style={{ color:'#374151', fontSize:12 }}>No messages yet…</p>}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid #0d2010', display:'flex', gap:8 }}>
          <input value={text} onChange={e=>setText(e.target.value.slice(0,128))}
            onKeyDown={e=>e.key==='Enter'&&send()}
            placeholder="Message (128 chars)…" maxLength={128}
            style={{ flex:1, background:'#0a0f0a', border:'1px solid #1f2f1f', borderRadius:8, color:'#e5e7eb', padding:'8px 12px', fontSize:13, outline:'none' }}/>
          <button onClick={send} style={{ padding:'8px 14px', background:'#14532d', border:'none', borderRadius:8, color:'#4ade80', cursor:'pointer', fontSize:15 }}>↑</button>
        </div>
      </div>
    </div>
  )
}

// ── Log dropdown ─────────────────────────────────────────────────────────────
function LogDropdown({ log, show, onToggle }) {
  return (
    <>
      <button onClick={onToggle} style={{
        background:'none', border:'none', color:'#6b7280', cursor:'pointer',
        fontSize:14, padding:'2px 6px', borderRadius:6,
        transform: show ? 'rotate(180deg)' : 'none', transition:'transform .2s',
      }}>▲</button>
      {show && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:50,
          background:'#030805', borderBottom:'1px solid #0d2010',
          maxHeight:200, overflowY:'auto',
        }}>
          {log.slice(0,10).map((e,i)=>(
            <div key={i} style={{ padding:'5px 14px', fontSize:11, color: i===0?'#9ca3af':'#4b5563', borderBottom:'1px solid #0a150a' }}>
              {e.text}
            </div>
          ))}
          {log.length===0 && <div style={{ padding:'8px 14px', fontSize:11, color:'#374151' }}>No events yet.</div>}
        </div>
      )}
    </>
  )
}

// ── Circular table seat positions ─────────────────────────────────────────────
function seatPos(playerIndex, myIndex, total, cxPct, cyPct, rPct) {
  // My seat always at bottom (270° = 6-o'clock)
  const relIdx = (playerIndex - myIndex + total) % total
  const angleDeg = (relIdx / total) * 360 + 270
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cxPct + rPct * Math.cos(rad),
    y: cyPct + rPct * Math.sin(rad),
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrumpCardGame({ gameId: propId, onBack: propOnBack }) {
  const { id: paramId } = useParams()
  const gameId  = propId || paramId
  const { user } = useAuth()
  const navigate = useNavigate()
  const onBack   = propOnBack || (() => navigate('/games'))

  const [state, setState]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [slots, setSlots]     = useState([null,null,null])
  const [spyValue, setSpyValue] = useState(3)
  const [actionErr, setActionErr] = useState('')
  const [showQuit, setShowQuit] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showLog, setShowLog]   = useState(false)
  const pollRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const { data } = await gamesApi.state(gameId)
      setState(data); setError('')
    } catch (e) { setError(e.response?.data?.error || 'Connection error') }
    finally { setLoading(false) }
  }, [gameId])

  useEffect(() => {
    fetchState()
    pollRef.current = setInterval(fetchState, 2500)
    return () => clearInterval(pollRef.current)
  }, [fetchState])

  useEffect(() => { setSlots([null,null,null]) }, [state?.turnPhase, state?.turnPlayerIndex, state?.targetPlayerIndex])
  useEffect(() => { if (state?.pendingDivertForMe) setDivertPick(true) }, [state?.pendingDivertForMe])

  const doAction = async (type, payload={}) => {
    setActionErr('')
    try {
      if (type==='start')      { await gamesApi.start(gameId); await fetchState(); return }
      if (type==='leaveLobby') { await gamesApi.leaveLobby(gameId); onBack(); return }
      const { data } = await gamesApi.action(gameId, type, payload)
      if (data.state) setState(data.state)
      setSlots([null,null,null])
      await fetchState()
    } catch (e) { setActionErr(e.response?.data?.error || 'Action failed') }
  }

  const placeCard = (card) => {
    if (slots.some(s=>s?.uid===card.uid)) return
    setSlots(prev => { const n=[...prev]; const i=n.findIndex(s=>s===null); if(i>=0) n[i]=card; return n })
  }
  const removeSlot = i => setSlots(prev=>{const n=[...prev];n[i]=null;return n})
  const filledSlots = slots.filter(Boolean)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#030705',color:'#6b7280' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32,height:32,border:'2px solid #1f2f1f',borderTopColor:'#6b7280',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading…
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#030705' }}>
      <div style={{ textAlign:'center',color:'#f87171' }}>
        <p style={{ fontSize:32,marginBottom:12 }}>⚠️</p><p>{error}</p>
        <button onClick={fetchState} style={{ marginTop:14,padding:'8px 20px',background:'#1f2937',border:'none',borderRadius:8,color:'#d1d5db',cursor:'pointer' }}>Retry</button>
      </div>
    </div>
  )
  if (!state) return null

  const myIdx    = state.myPlayerIndex
  const me       = myIdx>=0 ? state.players[myIdx] : null
  const isMyTurn = myIdx === state.turnPlayerIndex
  const isDefender = myIdx === state.targetPlayerIndex
  const attacker = state.players?.[state.turnPlayerIndex]
  const defender = state.targetPlayerIndex!=null ? state.players?.[state.targetPlayerIndex] : null
  const nextP    = state.players ? state.players[((myIdx+1) % state.players.length)] : null
  const canInteract = (isMyTurn && state.turnPhase==='select') || (isDefender && state.turnPhase==='defending') || !!state.pendingSpyForMe

  const slotCfg = isDefender ? [
    {label:'DEF 1', color:'#60a5fa', border:'#3b82f6'},
    {label:'DEF 2', color:'#a78bfa', border:'#7c3aed'},
    {label:'COUNTER',color:'#f87171',border:'#ef4444'},
  ] : [
    {label:'ATK 1', color:'#f87171', border:'#ef4444'},
    {label:'ATK 2', color:'#fb923c', border:'#ea580c'},
    {label:'ATK 3', color:'#facc15', border:'#ca8a04'},
  ]

  const defPreviewTotal = (slots[0]?.def||0)+(slots[1]?.def||0)
  const atkTotal = isMyTurn ? filledSlots.reduce((s,c)=>s+(c?.atk||0),0) : 0
  const isSpy    = filledSlots.some(c=>c?.id==='spy_operation')

  // ── Ended/Expired ──
  if (state.status==='ended' || state.turnPhase==='ended') {
    const winner = state.players?.find(p=>p.userId===state.winner)
    const iWon   = state.winner===user?.id
    return (
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'#030705' }}>
        <div style={{ textAlign:'center',padding:24 }}>
          <div style={{ fontSize:68,marginBottom:14 }}>{iWon?'🏆':state.expired?'⏱':'💀'}</div>
          <h1 style={{ color:'#f9fafb',fontSize:26,fontWeight:700,marginBottom:8 }}>
            {state.expired?'Lobby expired':iWon?'Victory!':'Defeated'}
          </h1>
          {!state.expired && winner && (
            <p style={{ color:'#9ca3af',marginBottom:24 }}>{winner.name} wins Trump Card!</p>
          )}
          <button onClick={onBack} style={{ padding:'12px 32px',background:'#14532d',border:'none',borderRadius:12,color:'#fff',cursor:'pointer',fontSize:14,fontWeight:600 }}>
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  // ── Lobby ──
  if (state.status==='waiting') {
    const isCreator = state.createdBy===user?.id || state.players[0]?.userId===user?.id
    return (
      <div style={{ display:'flex',flexDirection:'column',height:'100%',background:'#030705',color:'#f9fafb' }}>
        <div style={{ padding:'12px 18px',borderBottom:'1px solid #0d1f0d',display:'flex',alignItems:'center',gap:10,flexShrink:0 }}>
          <button onClick={onBack} style={{ background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:20 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:15 }}>🃏 Trump Card</div>
            <div style={{ color:'#6b7280',fontSize:11,marginTop:1 }}>{state.groupName}</div>
          </div>
          <ExpiryCountdown createdAt={state.createdAt}/>
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,padding:24,overflowY:'auto' }}>
          <div style={{ width:'100%',maxWidth:360 }}>
            <p style={{ color:'#6b7280',fontSize:13,textAlign:'center',marginBottom:4 }}>Players ({state.players.length}/9)</p>
            <p style={{ color:'#374151',fontSize:11,textAlign:'center',marginBottom:14 }}>Lobby closes after 2 minutes if not started</p>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {state.players.map((p,i)=>(
                <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#0a0f0a',borderRadius:10,border:'1px solid #0d2010' }}>
                  <div style={{ width:32,height:32,borderRadius:'50%',background:'#14451a',border:'1px solid #2d6a35',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,color:'#4ade80' }}>{p.name[0]}</div>
                  <span style={{ color:'#e5e7eb' }}>{p.name}</span>
                  {i===0 && <span style={{ marginLeft:'auto',fontSize:10,color:'#f59e0b',background:'rgba(120,53,15,.3)',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(120,53,15,.5)' }}>Host</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10,width:'100%',maxWidth:360 }}>
            {isCreator ? (
              <button onClick={()=>doAction('start')} disabled={state.players.length<2}
                style={{ padding:'12px',background:state.players.length>=2?'#14532d':'#1f2937',border:'none',borderRadius:12,color:state.players.length>=2?'#fff':'#4b5563',cursor:state.players.length>=2?'pointer':'not-allowed',fontSize:14,fontWeight:700 }}>
                {state.players.length<2?'Need at least 2 players…':'⚔️ Start Game'}
              </button>
            ) : (
              <div style={{ padding:'12px',background:'#0a0f0a',border:'1px solid #1a2a1a',borderRadius:12,textAlign:'center',color:'#6b7280',fontSize:13 }}>Waiting for host…</div>
            )}
            <button onClick={()=>doAction('leaveLobby')}
              style={{ padding:'10px',background:'transparent',border:'1px solid #1f2937',borderRadius:12,color:'#6b7280',cursor:'pointer',fontSize:13 }}>
              {isCreator?'🗑️ Close Lobby':'← Leave Lobby'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active game ────────────────────────────────────────────────────────────

  const statusText = () => {
    if (state.pendingSpyForMe) return '🕵️ Spy card received!'
    if (isMyTurn && state.turnPhase==='select') return 'Your turn — place cards into slots'
    if (isDefender && state.turnPhase==='defending') return `⚔️ Incoming ATK ${state.attackTotal} — deploy defense`
    if (state.turnPhase==='defending') return `${defender?.name} is defending…`
    return `${attacker?.name}'s turn`
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100%',background:'#020904',color:'#f9fafb',overflow:'hidden',position:'relative' }}>

      {/* ── Top bar ── */}
      <div style={{ flexShrink:0,padding:'6px 10px',borderBottom:'1px solid #0a1a0a',display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,.5)',position:'relative' }}>
        <button onClick={onBack} style={{ background:'none',border:'none',color:'#4b5563',cursor:'pointer',fontSize:18,lineHeight:1 }}>←</button>
        <span style={{ fontSize:11,color:'#6b7280',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
          {state.groupName} · {state.deckCount}🃏
        </span>

        {/* Log dropdown toggle */}
        <LogDropdown log={state.log||[]} show={showLog} onToggle={()=>setShowLog(s=>!s)}/>

        {/* Chat button */}
        <button onClick={()=>setShowChat(true)} style={{ background:'rgba(14,53,14,.5)',border:'1px solid #0d3010',borderRadius:8,color:'#4ade80',cursor:'pointer',fontSize:11,padding:'3px 9px' }}>💬</button>

        {/* Quit */}
        {!showQuit ? (
          <button onClick={()=>setShowQuit(true)} style={{ background:'rgba(90,15,15,.4)',border:'1px solid #4a0d0d',borderRadius:8,color:'#f87171',cursor:'pointer',fontSize:11,padding:'3px 9px' }}>Quit</button>
        ) : (
          <div style={{ display:'flex',gap:4,alignItems:'center' }}>
            <span style={{ fontSize:10,color:'#f87171' }}>Sure?</span>
            <button onClick={()=>{doAction('quit');setShowQuit(false)}} style={{ padding:'2px 7px',background:'#7f1d1d',border:'none',borderRadius:5,color:'#fca5a5',cursor:'pointer',fontSize:10 }}>Yes</button>
            <button onClick={()=>setShowQuit(false)} style={{ padding:'2px 7px',background:'#1f2937',border:'none',borderRadius:5,color:'#9ca3af',cursor:'pointer',fontSize:10 }}>No</button>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ flexShrink:0,padding:'5px 12px',textAlign:'center',fontSize:12,
        color: isMyTurn&&state.turnPhase==='select'?'#4ade80':isDefender&&state.turnPhase==='defending'?'#60a5fa':state.pendingSpyForMe?'#a78bfa':'#6b7280',
        background:'rgba(0,0,0,.3)', borderBottom:'1px solid #0a1a0a' }}>
        {statusText()}
      </div>

      {/* ── Popup notification banner ── */}
      {state.popup && (
        <div style={{ flexShrink:0, padding:'8px 12px', background:'rgba(14,30,14,0.95)', borderBottom:'1px solid #0d2010', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ flex:1, fontSize:12, color:'#d1fae5' }}>{state.popup.text}</span>
          <button onClick={()=>doAction('dismiss_popup')} style={{ background:'none', border:'none', color:'#4b5563', cursor:'pointer', fontSize:16, flexShrink:0 }}>✕</button>
        </div>
      )}

      {/* ── Circular table area ── */}
      <div style={{ flex:1,position:'relative',minHeight:0,overflow:'hidden' }}>

        {/* Table felt */}
        <div style={{
          position:'absolute',
          top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          width: isMobile ? '90vw' : '60vw',
          height: isMobile ? '38vh' : '55vh',
          maxWidth: isMobile ? 340 : 600,
          maxHeight: isMobile ? 240 : 500,
          borderRadius:'50%',
          background:'radial-gradient(ellipse,#0d2310 0%,#060f08 60%,#030705 100%)',
          border:'2px solid #1a3a1a',
          boxShadow:'inset 0 0 40px rgba(0,0,0,.8)',
        }}/>

        {/* Player avatars around the circle */}
        {state.players.map((p,i)=>{
          const isMe = i===myIdx
          const pos  = seatPos(i, myIdx, state.players.length, 50, 50, isMobile?34:36)
          const isActive = p.isCurrentTurn
          const isTarget = i===state.targetPlayerIndex
          return (
            <div key={p.userId} style={{
              position:'absolute',
              left:`${pos.x}%`, top:`${pos.y}%`,
              transform:'translate(-50%,-50%)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              zIndex:10, pointerEvents:'none',
            }}>
              {/* Avatar */}
              <div style={{
                width: isMobile?36:44, height: isMobile?36:44,
                borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: isMobile?14:17, fontWeight:700,
                color: p.eliminated?'#4b5563':isActive?'#fbbf24':isMe?'#4ade80':'#d1d5db',
                background: p.eliminated?'#111':isActive?'#78350f':isMe?'#14532d':'#1a2a1a',
                border:`2px solid ${isActive?'#f59e0b':isTarget?'#ef4444':isMe?'#22c55e':'#1f3a1f'}`,
                boxShadow: isActive?'0 0 12px rgba(251,191,36,.35)':isTarget?'0 0 10px rgba(239,68,68,.3)':'none',
                opacity: p.eliminated&&!isMe?0.4:1,
                transition:'all .25s',
              }}>
                {p.eliminated?'💀':p.name[0]}
              </div>
              {/* Name */}
              <span style={{ fontSize: isMobile?8:10, color: isActive?'#fbbf24':isMe?'#4ade80':'#9ca3af', fontWeight:600, maxWidth:60, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'center' }}>
                {p.name}
              </span>
              {/* Hearts */}
              <Hearts count={p.hearts} max={state.maxHearts||6}/>
            </div>
          )
        })}

        {/* Divert target picker overlay */}
        {divertPick && state.pendingDivertForMe && (
          <div style={{ position:'absolute', inset:0, zIndex:30, background:'rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
            <p style={{ color:'#fbbf24', fontSize:13, fontWeight:600 }}>↩️ Choose who to redirect the attack to:</p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
              {state.players.map((p, i) => {
                if (p.eliminated || i === state.myPlayerIndex || i === state.turnPlayerIndex) return null
                return (
                  <button key={p.userId}
                    onClick={() => { doAction('choose_divert', { newTargetIdx: i }); setDivertPick(false) }}
                    style={{ padding:'8px 16px', background:'#7f1d1d', border:'1px solid #ef4444', borderRadius:10, color:'#fca5a5', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    {p.name}
                  </button>
                )
              })}
            </div>
            <button onClick={()=>setDivertPick(false)} style={{ color:'#4b5563', background:'none', border:'none', cursor:'pointer', fontSize:11 }}>Cancel</button>
          </div>
        )}

        {/* Centre play zone */}
        <div style={{
          position:'absolute', top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:6, zIndex:5,
        }}>
          {/* Deployed cards from play zone */}
          {state.playZone.length>0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center', maxWidth: isMobile?180:260 }}>
              {state.playZone.map(c=>(
                <CardSvg key={c.uid} card={c} hidden={c.hidden} w={isMobile?44:54} h={isMobile?66:80}/>
              ))}
            </div>
          )}
          {/* ATK vs DEF indicator */}
          {state.attackTotal>0 && (
            <div style={{ display:'flex', gap:10, fontSize:11, fontWeight:700, background:'rgba(0,0,0,.7)', padding:'3px 10px', borderRadius:20 }}>
              <span style={{ color:'#ef4444' }}>ATK {state.attackTotal}</span>
              {state.defenseTotal>0 && <span style={{ color:'#60a5fa' }}>DEF {state.defenseTotal}</span>}
            </div>
          )}

          {/* Defense timer in centre */}
          {state.turnPhase==='defending' && state.defenseDeadline && (
            <div style={{ width: isMobile?120:180 }}>
              <DefTimer deadline={state.defenseDeadline} onExpire={()=>{ if(!isDefender) doAction('skip_defense') }}/>
            </div>
          )}
        </div>
      </div>

      {/* ── Deployment slots ── */}
      {(canInteract || state.pendingSpyForMe) && (
        <div style={{ flexShrink:0, padding:'8px 10px', borderTop:'1px solid #0a1a0a', background:'rgba(0,0,0,.4)', display:'flex', flexDirection:'column', gap:6, alignItems:'center' }}>

          {/* Spy respond */}
          {state.pendingSpyForMe && (
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#a78bfa' }}>🕵️ Spy value: {state.pendingSpyForMe.value}</span>
              <button onClick={()=>doAction('spy_respond',{deploy:true})} style={{ padding:'6px 16px',background:'#4c1d95',border:'none',borderRadius:8,color:'#c4b5fd',cursor:'pointer',fontSize:12,fontWeight:600 }}>Deploy</button>
              <button onClick={()=>doAction('spy_respond',{deploy:false})} style={{ padding:'6px 12px',background:'#1f2937',border:'none',borderRadius:8,color:'#9ca3af',cursor:'pointer',fontSize:12 }}>Discard</button>
            </div>
          )}

          {canInteract && !state.pendingSpyForMe && (
            <>
              {/* Slots row */}
              <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                {[0,1,2].map(i=>(
                  <Slot key={i} card={slots[i]} label={slotCfg[i].label} color={slotCfg[i].color} borderColor={slotCfg[i].border}
                    onRemove={()=>removeSlot(i)} w={isMobile?62:74} h={isMobile?92:110}/>
                ))}
              </div>

              {/* Preview info */}
              {isDefender && filledSlots.length>0 && (
                <div style={{ fontSize:10, padding:'3px 12px', borderRadius:20, background:defPreviewTotal>=state.attackTotal?'rgba(20,83,45,.4)':'rgba(127,29,29,.4)', color:defPreviewTotal>=state.attackTotal?'#4ade80':'#f87171', border:`1px solid ${defPreviewTotal>=state.attackTotal?'#14532d':'#7f1d1d'}` }}>
                  {defPreviewTotal>=state.attackTotal?`✅ DEF ${defPreviewTotal} holds ATK ${state.attackTotal}`:`⚠️ DEF ${defPreviewTotal} < ATK ${state.attackTotal} — will take ${state.attackTotal-defPreviewTotal} dmg`}
                  {slots[2] && ` · Counter ATK ${slots[2].atk}`}
                </div>
              )}
              {isMyTurn && atkTotal>0 && (
                <div style={{ fontSize:10, padding:'3px 12px', borderRadius:20, background:'rgba(127,29,29,.2)', color:'#f87171', border:'1px solid #7f1d1d' }}>
                  ATK total: {atkTotal}{atkTotal>9?' ⚠️ overextension!':nextP?` → ${nextP.name}`:''}
                </div>
              )}

              {/* Spy value picker */}
              {isMyTurn && isSpy && (
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  <span style={{ fontSize:10, color:'#a78bfa' }}>Spy:</span>
                  {[2,3,4,5].map(v=>(
                    <button key={v} onClick={()=>setSpyValue(v)} style={{ padding:'2px 7px', borderRadius:5, fontSize:10, cursor:'pointer', border:`1px solid ${spyValue===v?'#7c3aed':'#374151'}`, background:spyValue===v?'#4c1d95':'transparent', color:spyValue===v?'#a78bfa':'#6b7280' }}>
                      {v}({[15,25,40,55][v-2]}%)
                    </button>
                  ))}
                </div>
              )}

              {actionErr && <p style={{ color:'#f87171', fontSize:11 }}>{actionErr}</p>}

              {/* Deploy / pass buttons */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{
                    const uids=filledSlots.map(c=>c.uid)
                    if(isMyTurn) doAction('deploy_cards',{cardUids:uids,spyValue})
                    else if(isDefender) doAction('defend',{cardUids:uids})
                  }}
                  disabled={filledSlots.length===0}
                  style={{ padding:'8px 22px', borderRadius:10, fontWeight:700, fontSize:13, cursor:filledSlots.length>0?'pointer':'not-allowed',
                    background:filledSlots.length>0?isDefender?'#1e3a8a':'#7f1d1d':'#1f2937',
                    border:'none', color:filledSlots.length>0?'#fff':'#4b5563', transition:'all .15s' }}>
                  {isMyTurn?'⚔️ Deploy Attack':'🛡️ Deploy Defense'}
                </button>
                {isDefender && (
                  <button onClick={()=>doAction('skip_defense')} style={{ padding:'8px 14px', borderRadius:10, fontSize:12, cursor:'pointer', background:'transparent', border:'1px solid #374151', color:'#6b7280' }}>
                    Pass
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── My hand — keyboard-style bottom bar ── */}
      <div style={{ flexShrink:0, background:'#040b04', borderTop:'1px solid #0a1a0a', padding:'6px 8px 4px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
          <span style={{ fontSize:9, color:'#374151', textTransform:'uppercase', letterSpacing:1 }}>
            {me?.name} — {state.myHand?.length||0} cards
          </span>
          <Hearts count={me?.hand?.length||state.myHand?.length||0} max={state.maxHearts||6}/>
          {canInteract && !state.pendingSpyForMe && (
            <span style={{ fontSize:9, color:'#1f2f1f', marginLeft:4 }}>tap card → slot</span>
          )}
        </div>
        <div style={{ display:'flex', gap: isMobile?3:5, overflowX:'auto', paddingBottom:2 }}>
          {(state.myHand||[]).map(card=>{
            const inSlot = slots.some(s=>s?.uid===card.uid)
            const cw = isMobile ? 54 : 72
            const ch = isMobile ? 80 : 108
            return (
              <div key={card.uid}
                onClick={()=>canInteract&&!inSlot&&!state.pendingSpyForMe&&placeCard(card)}
                style={{ flexShrink:0, opacity:inSlot?.35:1, transition:'all .12s',
                  transform: !inSlot&&canInteract?'translateY(-3px)':'none',
                  filter: (!canInteract||inSlot)?'brightness(.55)':'none' }}>
                <CardSvg card={card} selected={!inSlot&&canInteract} w={cw} h={ch}/>
              </div>
            )
          })}
          {(!state.myHand||state.myHand.length===0) && (
            <p style={{ color:'#374151', fontSize:12, alignSelf:'center', padding:'8px 0' }}>
              {me?.eliminated?'Eliminated.':me?.spectating?'Spectating.':'No cards.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Chat popup ── */}
      {showChat && <ChatPopup chat={state.chat||[]} onSend={t=>doAction('chat',{text:t})} onClose={()=>setShowChat(false)}/>}
    </div>
  )
}
