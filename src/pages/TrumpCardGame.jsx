// src/pages/TrumpCardGame.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gamesApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Card colour config ────────────────────────────────────────────────────────
const TONE = {
  basic:    { bg:'#0e1620', border:'#3d5270', name:'#7fa8d4', atk:'#ef4444', def:'#3b82f6' },
  tactical: { bg:'#0a1f1f', border:'#0d6b6b', name:'#4dd4c8', atk:'#ef4444', def:'#3b82f6' },
  amber:    { bg:'#1a1100', border:'#a06010', name:'#f59e0b', atk:'#ef4444', def:'#3b82f6' },
  purple:   { bg:'#120820', border:'#6d28d9', name:'#a78bfa', atk:'#ef4444', def:'#3b82f6' },
}

// ── Card icon paths (all 12 types) ────────────────────────────────────────────
const ICON = {
  soldier:        <><circle cx="12" cy="7" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M5 21v-2a7 7 0 0114 0v2" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="2" width="6" height="2.5" rx="1" fill="currentColor" opacity=".6"/></>,
  armored_soldier:<><path d="M12 2L6 5v6c0 5 3 8 6 9 3-1 6-4 6-9V5z" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="10" r="2.5" fill="currentColor" opacity=".5"/></>,
  drone:          <><circle cx="12" cy="12" r="2.5" fill="currentColor" opacity=".5"/><circle cx="4"  cy="4"  r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="20" cy="4"  r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="4"  cy="20" r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="20" cy="20" r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M6 6l4 4M18 6l-4 4M6 18l4-4M18 18l-4-4" stroke="currentColor" strokeWidth="1.2"/></>,
  tank:           <><rect x="3" y="9" width="18" height="9" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="7.5" cy="18" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="16.5" cy="18" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="6" width="7" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M15 8h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
  jet:            <><path d="M12 2l-5 10h3l-1.5 6h7L14 12h3z" fill="currentColor" opacity=".4"/><path d="M12 2l-5 10h3l-1.5 6h7L14 12h3z" fill="none" stroke="currentColor" strokeWidth="1.3"/></>,
  missile:        <><path d="M12 2v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 6l3-4 3 4" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M9 18l-2 4h10l-2-4" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M8 13H6M16 13h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>,
  artillery:      <><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="18" r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M9 18h5" stroke="currentColor" strokeWidth="1.3"/><path d="M14 16l5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
  interceptor:    <><path d="M12 3l3 7h5l-4 3.5 2 6.5-6-3.5-6 3.5 2-6.5L4 10h5z" fill="currentColor" opacity=".35"/><path d="M12 3l3 7h5l-4 3.5 2 6.5-6-3.5-6 3.5 2-6.5L4 10h5z" fill="none" stroke="currentColor" strokeWidth="1.3"/></>,
  divert_attack:  <><path d="M4 8l5-5 5 5M9 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M20 16l-5 5-5-5M15 21V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
  call_reinforce: <><circle cx="7"  cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="9"  r="3" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M7 13V7M17 13V7M12 6V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>,
  spy_operation:  <><circle cx="12" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M5 20v-1a7 7 0 0114 0v1" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M4 12h16" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/><path d="M8 7c1-1.5 2.5-2 4-2s3 .5 4 2" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" fill="none"/></>,
  block_comms:    <><path d="M2 2l20 20M8.5 8.5A5 5 0 0117 17M12 5a8 8 0 018 8M4.5 9.5A8 8 0 0112 5" stroke="currentColor" strokeWidth="1.4" fill="none"/><circle cx="12" cy="20" r="1.5" fill="currentColor"/></>,
}

// ── Card SVG component ────────────────────────────────────────────────────────
function CardSvg({ card, selected, onClick, hidden, size = 'md' }) {
  const W = size === 'sm' ? 64 : 80
  const H = size === 'sm' ? 96 : 120
  const t = TONE[card.sub] || TONE.basic
  const isSpy = card.id === 'spy_operation'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}
      onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', flexShrink: 0, display: 'block' }}>
      <defs>
        {isSpy && <filter id="spy-glitch">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2"/>
          <feColorMatrix type="saturate" values="0"/>
          <feBlend in="SourceGraphic" mode="multiply"/>
        </filter>}
      </defs>

      {/* Card body */}
      <rect x="1" y="1" width={W-2} height={H-2} rx="6"
        fill={selected ? '#0d2a0d' : t.bg}
        stroke={selected ? '#4dba4d' : t.border}
        strokeWidth={selected ? 2.5 : 1.5}
      />

      {hidden ? (
        <>
          <rect x="4" y="4" width={W-8} height={H-8} rx="4" fill="rgba(0,0,0,0.5)"/>
          <text x={W/2} y={H/2-6} textAnchor="middle" fill="#444" fontSize="10" fontFamily="monospace">???</text>
          <text x={W/2} y={H/2+8} textAnchor="middle" fill="#444" fontSize="8" fontFamily="monospace">HIDDEN</text>
        </>
      ) : (
        <>
          {/* Card name */}
          <text x={W/2} y="11" textAnchor="middle" fill={t.name} fontSize="7" fontFamily="'Dosis',system-ui" fontWeight="700" letterSpacing="0.5">
            {card.name.length > 16 ? card.name.slice(0,15)+'…' : card.name}
          </text>

          {/* Divider */}
          <line x1="6" y1="15" x2={W-6} y2="15" stroke={t.border} strokeWidth="0.5" opacity="0.5"/>

          {/* Icon */}
          <g transform={`translate(${W/2-12}, ${H/2-16})`} color={t.name} opacity="0.8">
            <svg viewBox="0 0 24 24" width="24" height="24">{ICON[card.id] || ICON.soldier}</svg>
          </g>

          {/* Bottom divider */}
          <line x1="6" y1={H-20} x2={W-6} y2={H-20} stroke={t.border} strokeWidth="0.5" opacity="0.5"/>

          {/* ATK */}
          {card.atk > 0 && <>
            <text x="8" y={H-10} fill={t.atk} fontSize="12" fontWeight="800" fontFamily="monospace">{card.atk}</text>
            <text x="8" y={H-3} fill={t.atk} fontSize="5" fontFamily="monospace" opacity="0.7">ATK</text>
          </>}

          {/* DEF */}
          {card.def > 0 && <>
            <text x={W-8} y={H-10} textAnchor="end" fill={t.def} fontSize="12" fontWeight="800" fontFamily="monospace">{card.def}</text>
            <text x={W-8} y={H-3} textAnchor="end" fill={t.def} fontSize="5" fontFamily="monospace" opacity="0.7">DEF</text>
          </>}

          {/* Special label */}
          {card.type === 'special' && card.atk === 0 && (
            <text x={W/2} y={H-7} textAnchor="middle" fill={t.name} fontSize="6" fontFamily="system-ui" opacity="0.8">SPECIAL</text>
          )}

          {isSpy && <rect x="0" y="0" width={W} height={H} rx="6" fill="rgba(109,40,217,0.08)" filter="url(#spy-glitch)"/>}
        </>
      )}

      {/* Selection highlight */}
      {selected && <rect x="0" y="0" width={W} height={H} rx="6" fill="rgba(77,186,77,0.12)"/>}
    </svg>
  )
}

// ── Deployment slot ───────────────────────────────────────────────────────────
function Slot({ card, label, labelColor, borderColor, onRemove, onClick }) {
  return (
    <div style={{
      width: 82, height: 122, borderRadius: 8,
      border: `2px dashed ${card ? borderColor : '#333'}`,
      background: card ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', cursor: !card ? 'default' : 'pointer', transition: 'border-color 0.2s',
      flexShrink: 0,
    }} onClick={!card ? onClick : undefined}>
      {card ? (
        <>
          <CardSvg card={card} size="md" />
          <button onClick={onRemove} style={{
            position: 'absolute', top: -8, right: -8,
            width: 20, height: 20, borderRadius: '50%',
            background: '#7f1d1d', border: '1px solid #ef4444',
            color: '#fca5a5', cursor: 'pointer', fontSize: 11, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 8 }}>
          <div style={{ fontSize: 9, color: labelColor || '#555', lineHeight: 1.4, fontFamily: 'system-ui', letterSpacing: 1 }}>
            {label}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Lobby expiry countdown ────────────────────────────────────────────────────
function ExpiryCountdown({ createdAt }) {
  const [secs, setSecs] = useState(120)
  useEffect(() => {
    if (!createdAt) return
    const tick = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      setSecs(Math.max(0, 120 - Math.floor(elapsed / 1000)))
    }
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv)
  }, [createdAt])
  const urgent = secs <= 30
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      color: urgent ? '#f87171' : '#6b7280',
      background: urgent ? 'rgba(127,29,29,0.3)' : 'rgba(0,0,0,0.3)',
      border: `1px solid ${urgent ? '#7f1d1d' : '#374151'}`,
    }}>
      {urgent ? '⚠️ ' : '⏱ '}{secs}s
    </span>
  )
}

// ── Chat box ──────────────────────────────────────────────────────────────────
function ChatBox({ chat, myName, onSend }) {
  const [text, setText] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat.length])
  const send = () => {
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 4px', flexShrink: 0 }}>
        Chat
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px', display: 'flex', flexDirection: 'column-reverse' }}>
        <div ref={endRef}/>
        {[...chat].map((m, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{m.name}: </span>
            <span style={{ fontSize: 11, color: '#d1d5db' }}>{m.text}</span>
          </div>
        ))}
        {chat.length === 0 && <p style={{ color: '#4b5563', fontSize: 11 }}>No messages yet…</p>}
      </div>
      <div style={{ padding: '8px 10px', borderTop: '1px solid #1a2a1a', flexShrink: 0, display: 'flex', gap: 6 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value.slice(0, 128))}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message…"
          maxLength={128}
          style={{
            flex: 1, background: '#0a0f0a', border: '1px solid #1f2f1f', borderRadius: 6,
            color: '#d1d5db', padding: '5px 8px', fontSize: 12, outline: 'none',
          }}
        />
        <button onClick={send} style={{
          background: '#14451a', border: '1px solid #2d6a35', borderRadius: 6,
          color: '#4ade80', cursor: 'pointer', padding: '0 10px', fontSize: 13,
        }}>↑</button>
      </div>
    </div>
  )
}

// ── Defence timer display ─────────────────────────────────────────────────────
function DefenseTimer({ deadline }) {
  const [secs, setSecs] = useState(30)
  useEffect(() => {
    if (!deadline) return
    const tick = () => setSecs(Math.max(0, Math.ceil((new Date(deadline) - Date.now()) / 1000)))
    tick(); const iv = setInterval(tick, 500); return () => clearInterval(iv)
  }, [deadline])
  const pct = (secs / 30) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#1f2937', borderRadius: 2 }}>
        <div style={{
          width: `${pct}%`, height: 4, borderRadius: 2, transition: 'width 0.5s',
          background: secs > 10 ? '#22c55e' : secs > 5 ? '#f59e0b' : '#ef4444',
        }}/>
      </div>
      <span style={{ color: secs <= 5 ? '#ef4444' : '#9ca3af', fontSize: 12, minWidth: 24 }}>{secs}s</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrumpCardGame({ gameId: propGameId, onBack: propOnBack }) {
  const { id: paramId } = useParams()
  const gameId  = propGameId || paramId
  const { user } = useAuth()
  const navigate = useNavigate()
  const onBack  = propOnBack || (() => navigate('/games'))

  const [state, setState]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [slots, setSlots]       = useState([null, null, null])  // deployed cards (local)
  const [spyValue, setSpyValue] = useState(3)
  const [actionErr, setActionErr] = useState('')
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const pollRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const { data } = await gamesApi.state(gameId)
      setState(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Connection error')
    } finally { setLoading(false) }
  }, [gameId])

  useEffect(() => {
    fetchState()
    pollRef.current = setInterval(fetchState, 2500)
    return () => clearInterval(pollRef.current)
  }, [fetchState])

  // Clear slots on phase change
  useEffect(() => { setSlots([null, null, null]) }, [state?.turnPhase, state?.turnPlayerIndex, state?.targetPlayerIndex])

  const doAction = async (type, payload = {}) => {
    setActionErr('')
    try {
      if (type === 'start') { await gamesApi.start(gameId); await fetchState(); return }
      if (type === 'leaveLobby') { await gamesApi.leaveLobby(gameId); onBack(); return }
      const { data } = await gamesApi.action(gameId, type, payload)
      if (data.state) setState(data.state)
      setSlots([null, null, null])
      await fetchState()
    } catch (err) {
      setActionErr(err.response?.data?.error || 'Action failed')
    }
  }

  // Click a hand card → put in next empty slot
  const placeCard = (card) => {
    // Don't place if card already in a slot
    if (slots.some(s => s?.uid === card.uid)) return
    setSlots(prev => {
      const next = [...prev]
      const empty = next.findIndex(s => s === null)
      if (empty >= 0) next[empty] = card
      return next
    })
  }

  const removeSlot = (i) => {
    setSlots(prev => { const n = [...prev]; n[i] = null; return n })
  }

  const filledSlots = slots.filter(Boolean)

  // ── Loading ──
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'#030705', color:'#6b7280' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'2px solid #1f2f1f', borderTopColor:'#4b5563', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 12px' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading…
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'#030705' }}>
      <div style={{ textAlign:'center', color:'#f87171' }}>
        <p style={{ fontSize:36, marginBottom:12 }}>⚠️</p>
        <p>{error}</p>
        <button onClick={fetchState} style={{ marginTop:16, padding:'8px 20px', background:'#1f2937', border:'none', borderRadius:8, color:'#d1d5db', cursor:'pointer' }}>
          Retry
        </button>
      </div>
    </div>
  )

  if (!state) return null

  const myIdx    = state.myPlayerIndex
  const me       = myIdx >= 0 ? state.players[myIdx] : null
  const isMyTurn = myIdx === state.turnPlayerIndex
  const isDefender = myIdx === state.targetPlayerIndex
  const attacker = state.players[state.turnPlayerIndex]
  const defender = state.targetPlayerIndex != null ? state.players[state.targetPlayerIndex] : null
  const nextAfterMe = state.players
    ? state.players[((myIdx + 1) % state.players.length)] : null

  // ── Ended / expired ──
  if (state.status === 'ended' || state.turnPhase === 'ended') {
    const winner = state.players?.find(p => p.userId === state.winner)
    const iWon = state.winner === user?.id
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', background:'#030705' }}>
        <div style={{ textAlign:'center', padding:24 }}>
          <div style={{ fontSize:72, marginBottom:16 }}>{iWon ? '🏆' : state.expired ? '⏱' : '💀'}</div>
          <h1 style={{ color:'#f9fafb', fontSize:28, fontWeight:700, marginBottom:8 }}>
            {state.expired ? 'Lobby expired' : iWon ? 'Victory!' : 'Defeated'}
          </h1>
          {!state.expired && <p style={{ color:'#9ca3af', fontSize:16, marginBottom:24 }}>
            {winner?.name || 'Someone'} wins Last Command!
          </p>}
          <button onClick={onBack} style={{ padding:'12px 32px', background:'#14532d', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontSize:15, fontWeight:600 }}>
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  // ── Waiting lobby ──
  if (state.status === 'waiting') {
    const isCreator = state.createdBy === user?.id || state.players[0]?.userId === user?.id
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#030705', color:'#f9fafb' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #0d1f0d', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:20, lineHeight:1 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>🃏 Trump Card</div>
            <div style={{ color:'#6b7280', fontSize:11, marginTop:1 }}>{state.groupName}</div>
          </div>
          <ExpiryCountdown createdAt={state.createdAt} />
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, padding:24, overflowY:'auto' }}>
          <div style={{ width:'100%', maxWidth:380 }}>
            <p style={{ color:'#6b7280', fontSize:13, textAlign:'center', marginBottom:4 }}>
              Players in lobby ({state.players.length}/9)
            </p>
            <p style={{ color:'#374151', fontSize:11, textAlign:'center', marginBottom:16 }}>
              Lobby closes automatically after 2 minutes if not started
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {state.players.map((p, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#0a0f0a', borderRadius:12, border:'1px solid #0d2010' }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'#14451a', border:'1px solid #2d6a35', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, color:'#4ade80' }}>
                    {p.name[0]}
                  </div>
                  <span style={{ color:'#e5e7eb' }}>{p.name}</span>
                  {i === 0 && <span style={{ marginLeft:'auto', fontSize:11, color:'#f59e0b', background:'rgba(120,53,15,0.3)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(120,53,15,0.5)' }}>Host</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:380 }}>
            {isCreator ? (
              <button onClick={() => doAction('start')} disabled={state.players.length < 2}
                style={{ padding:'12px', background: state.players.length >= 2 ? '#14532d' : '#1f2937', border:'none', borderRadius:12, color: state.players.length >= 2 ? '#fff' : '#4b5563', cursor: state.players.length >= 2 ? 'pointer' : 'not-allowed', fontSize:15, fontWeight:700 }}>
                {state.players.length < 2 ? 'Need at least 2 players…' : '⚔️ Start Game'}
              </button>
            ) : (
              <div style={{ padding:'12px', background:'#0a0f0a', border:'1px solid #1a2a1a', borderRadius:12, textAlign:'center', color:'#6b7280', fontSize:13 }}>
                Waiting for host to start…
              </div>
            )}
            <button onClick={() => doAction('leaveLobby')}
              style={{ padding:'10px', background:'transparent', border:'1px solid #1f2937', borderRadius:12, color:'#6b7280', cursor:'pointer', fontSize:13 }}>
              {isCreator ? '🗑️ Close Lobby' : '← Leave Lobby'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active game ─────────────────────────────────────────────────────────────
  // Slot labels change based on phase
  const isAttackPhase  = isMyTurn && state.turnPhase === 'select'
  const isDefendPhase  = isDefender && state.turnPhase === 'defending'
  const canInteract    = isAttackPhase || isDefendPhase || !!state.pendingSpyForMe

  const slotConfigs = isDefendPhase
    ? [
        { label: 'DEF 1',   border: '#3b82f6', color: '#60a5fa' },
        { label: 'DEF 2',   border: '#8b5cf6', color: '#a78bfa' },
        { label: 'COUNTER', border: '#ef4444', color: '#f87171' },
      ]
    : [
        { label: 'ATK 1',   border: '#ef4444', color: '#f87171' },
        { label: 'ATK 2',   border: '#f97316', color: '#fb923c' },
        { label: 'ATK 3',   border: '#eab308', color: '#facc15' },
      ]

  // Real-time defense preview
  const filledDef  = (slots[0]?.def || 0) + (slots[1]?.def || 0)
  const incomingAtk = state.attackTotal || 0
  const estimatedDamage = isDefendPhase ? Math.max(0, incomingAtk - filledDef) : 0
  const atkTotal   = isAttackPhase ? filledSlots.reduce((s, c) => s + (c?.atk || 0), 0) : 0
  const isSpy      = filledSlots.some(c => c?.id === 'spy_operation')

  // Other players (everyone except me)
  const others = state.players.filter((_, i) => i !== myIdx)

  return (
    <div style={{ display:'flex', height:'100%', background:'#030705', overflow:'hidden' }}>

      {/* ── Game area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Top bar: other players + turn indicator */}
        <div style={{ flexShrink:0, padding:'8px 12px', borderBottom:'1px solid #0d1f0d', display:'flex', gap:8, alignItems:'center', overflowX:'auto', background:'rgba(0,0,0,0.3)' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'#4b5563', cursor:'pointer', fontSize:18, lineHeight:1, flexShrink:0, marginRight:4 }}>←</button>
          {others.map((p, i) => (
            <div key={p.userId} style={{
              flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              padding:'6px 10px', borderRadius:10, transition:'all 0.2s',
              border:`1px solid ${p.isCurrentTurn ? '#854d0e' : state.targetPlayerIndex === state.players.indexOf(p) ? '#7f1d1d' : '#0d2010'}`,
              background: p.isCurrentTurn ? 'rgba(120,53,15,0.2)' : state.targetPlayerIndex === state.players.indexOf(p) ? 'rgba(127,29,29,0.2)' : 'rgba(0,0,0,0.2)',
              opacity: p.eliminated ? 0.4 : 1,
            }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:15, fontWeight:700, color: p.eliminated ? '#4b5563' : p.isCurrentTurn ? '#fbbf24' : '#d1d5db',
                background: p.isCurrentTurn ? '#78350f' : '#1a2a1a',
                border:`2px solid ${p.isCurrentTurn ? '#f59e0b' : state.targetPlayerIndex === state.players.indexOf(p) ? '#ef4444' : '#1f2f1f'}`,
                boxShadow: p.isCurrentTurn ? '0 0 10px rgba(251,191,36,0.3)' : 'none',
              }}>
                {p.eliminated ? '💀' : p.name[0]}
              </div>
              <span style={{ fontSize:10, color:'#9ca3af', fontWeight:600, maxWidth:60, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
              <span style={{ fontSize:9, color:'#4b5563' }}>{p.eliminated ? 'OUT' : `${p.cardCount} cards`}</span>
              {state.targetPlayerIndex === state.players.indexOf(p) && !p.eliminated && (
                <span style={{ fontSize:8, color:'#ef4444' }}>⚔️ DEFENDING</span>
              )}
            </div>
          ))}

          {/* Game status pill */}
          <div style={{ marginLeft:'auto', flexShrink:0, fontSize:12, padding:'4px 12px', borderRadius:20, border:'1px solid #1a2a1a', color:'#6b7280' }}>
            🃏 {state.deckCount}
          </div>

          {/* Quit button */}
          {!showQuitConfirm ? (
            <button onClick={() => setShowQuitConfirm(true)}
              style={{ flexShrink:0, padding:'4px 10px', background:'rgba(127,29,29,0.3)', border:'1px solid #7f1d1d', borderRadius:8, color:'#f87171', cursor:'pointer', fontSize:11 }}>
              Quit
            </button>
          ) : (
            <div style={{ flexShrink:0, display:'flex', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#f87171' }}>Sure?</span>
              <button onClick={() => { doAction('quit'); setShowQuitConfirm(false) }}
                style={{ padding:'3px 8px', background:'#7f1d1d', border:'none', borderRadius:6, color:'#fca5a5', cursor:'pointer', fontSize:11 }}>Yes</button>
              <button onClick={() => setShowQuitConfirm(false)}
                style={{ padding:'3px 8px', background:'#1f2937', border:'none', borderRadius:6, color:'#9ca3af', cursor:'pointer', fontSize:11 }}>No</button>
            </div>
          )}
        </div>

        {/* Center: play zone + deployment slots */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:'12px 16px', position:'relative' }}>

          {/* Status banner */}
          <div style={{ textAlign:'center' }}>
            {isAttackPhase && (
              <div style={{ background:'rgba(20,83,45,0.4)', border:'1px solid #14532d', borderRadius:20, padding:'5px 16px', fontSize:13, color:'#4ade80' }}>
                Your turn — select attack cards below, then Deploy
              </div>
            )}
            {isDefendPhase && (
              <div style={{ background:'rgba(30,58,138,0.4)', border:'1px solid #1e3a8a', borderRadius:20, padding:'5px 16px', fontSize:13, color:'#60a5fa' }}>
                ⚔️ Incoming ATK {incomingAtk} from {attacker?.name} — choose DEF cards
              </div>
            )}
            {state.pendingSpyForMe && (
              <div style={{ background:'rgba(76,29,149,0.4)', border:'1px solid #4c1d95', borderRadius:20, padding:'5px 16px', fontSize:13, color:'#a78bfa' }}>
                🕵️ Spy card received! Value: {state.pendingSpyForMe.value} — Deploy or discard?
              </div>
            )}
            {!isAttackPhase && !isDefendPhase && !state.pendingSpyForMe && (
              <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid #1a2a1a', borderRadius:20, padding:'5px 16px', fontSize:13, color:'#6b7280' }}>
                {state.turnPhase === 'defending'
                  ? `${defender?.name} is defending…`
                  : `${attacker?.name}'s turn`}
              </div>
            )}
          </div>

          {/* Defense timer */}
          {state.turnPhase === 'defending' && state.defenseDeadline && (
            <div style={{ width:'100%', maxWidth:300 }}>
              <DefenseTimer deadline={state.defenseDeadline} />
            </div>
          )}

          {/* Cards currently in the play zone (attacker's deployed cards) */}
          {state.playZone.length > 0 && (
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              {state.playZone.map(c => <CardSvg key={c.uid} card={c} hidden={c.hidden} size="sm" />)}
            </div>
          )}

          {/* 3 Deployment slots */}
          {canInteract && !state.pendingSpyForMe && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', gap:8 }}>
                {[0, 1, 2].map(i => (
                  <Slot
                    key={i}
                    card={slots[i]}
                    label={slotConfigs[i].label}
                    labelColor={slotConfigs[i].color}
                    borderColor={slotConfigs[i].border}
                    onRemove={() => removeSlot(i)}
                  />
                ))}
              </div>

              {/* Defense preview */}
              {isDefendPhase && filledSlots.length > 0 && (
                <div style={{
                  padding:'6px 16px', borderRadius:8, fontSize:12,
                  background: estimatedDamage > 0 ? 'rgba(127,29,29,0.3)' : 'rgba(20,83,45,0.3)',
                  border: `1px solid ${estimatedDamage > 0 ? '#7f1d1d' : '#14532d'}`,
                  color: estimatedDamage > 0 ? '#f87171' : '#4ade80',
                }}>
                  {estimatedDamage > 0
                    ? `⚠️ DEF ${filledDef} vs ATK ${incomingAtk} — you will take ${estimatedDamage} damage`
                    : `✅ DEF ${filledDef} vs ATK ${incomingAtk} — defense holds`}
                  {slots[2] && ` · Counter ATK ${slots[2].atk} → next player`}
                </div>
              )}

              {/* ATK preview */}
              {isAttackPhase && atkTotal > 0 && (
                <div style={{ padding:'5px 14px', borderRadius:8, fontSize:12, background:'rgba(127,29,29,0.2)', border:'1px solid #7f1d1d', color:'#f87171' }}>
                  Total ATK: {atkTotal}{atkTotal > 9 ? ' ⚠️ overextension — discard penalty!' : ''}
                  {nextAfterMe && ` → ${nextAfterMe.name}`}
                </div>
              )}

              {/* Spy value selector */}
              {isAttackPhase && isSpy && (
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'#a78bfa' }}>Spy value:</span>
                  {[2,3,4,5].map(v => (
                    <button key={v} onClick={() => setSpyValue(v)}
                      style={{ padding:'3px 8px', borderRadius:6, fontSize:11, cursor:'pointer', border:`1px solid ${spyValue===v?'#7c3aed':'#374151'}`, background: spyValue===v?'#4c1d95':'transparent', color: spyValue===v?'#a78bfa':'#6b7280' }}>
                      {v} ({[15,25,40,55][v-2]}%)
                    </button>
                  ))}
                </div>
              )}

              {/* Action error */}
              {actionErr && <p style={{ color:'#f87171', fontSize:12 }}>{actionErr}</p>}

              {/* Deploy button */}
              <div style={{ display:'flex', gap:8 }}>
                <button
                  onClick={() => {
                    const uids = filledSlots.map(c => c.uid)
                    if (isAttackPhase) doAction('deploy_cards', { cardUids: uids, spyValue })
                    else if (isDefendPhase) doAction('defend', { cardUids: uids })
                  }}
                  disabled={filledSlots.length === 0}
                  style={{
                    padding:'10px 28px', borderRadius:10, fontWeight:700, fontSize:14, cursor: filledSlots.length > 0 ? 'pointer' : 'not-allowed',
                    background: filledSlots.length > 0 ? (isDefendPhase ? '#1e3a8a' : '#7f1d1d') : '#1f2937',
                    border: 'none', color: filledSlots.length > 0 ? '#fff' : '#4b5563',
                    transition: 'all 0.15s',
                  }}>
                  {isAttackPhase ? '⚔️ Deploy Attack' : '🛡️ Deploy Defense'}
                </button>

                {isDefendPhase && (
                  <button onClick={() => doAction('skip_defense')}
                    style={{ padding:'10px 16px', borderRadius:10, fontSize:13, cursor:'pointer', background:'transparent', border:'1px solid #374151', color:'#6b7280' }}>
                    Pass
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Spy respond buttons */}
          {state.pendingSpyForMe && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => doAction('spy_respond', { deploy: true })}
                style={{ padding:'10px 24px', background:'#4c1d95', border:'none', borderRadius:10, color:'#a78bfa', cursor:'pointer', fontSize:14, fontWeight:600 }}>
                Deploy (value {state.pendingSpyForMe.value})
              </button>
              <button onClick={() => doAction('spy_respond', { deploy: false })}
                style={{ padding:'10px 24px', background:'#1f2937', border:'none', borderRadius:10, color:'#9ca3af', cursor:'pointer', fontSize:14 }}>
                Discard
              </button>
            </div>
          )}
        </div>

        {/* My hand — horizontal scroll bar at bottom */}
        <div style={{ flexShrink:0, borderTop:'1px solid #0d1f0d', background:'#040b04', padding:'10px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <span style={{ fontSize:10, color:'#374151', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {me?.name || 'Your hand'} — {state.myHand?.length || 0} cards
            </span>
            {canInteract && !state.pendingSpyForMe && (
              <span style={{ fontSize:10, color:'#374151' }}>— click a card to place it in a slot</span>
            )}
          </div>
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
            {(state.myHand || []).map(card => {
              const inSlot = slots.some(s => s?.uid === card.uid)
              return (
                <div key={card.uid}
                  onClick={() => canInteract && !inSlot && !state.pendingSpyForMe && placeCard(card)}
                  style={{
                    flexShrink:0,
                    opacity: inSlot ? 0.3 : 1,
                    filter: (!canInteract || inSlot) ? 'brightness(0.6)' : 'none',
                    transition: 'all 0.15s',
                    transform: (!inSlot && canInteract) ? 'translateY(-2px)' : 'none',
                  }}>
                  <CardSvg card={card} size="md" />
                </div>
              )
            })}
            {(!state.myHand || state.myHand.length === 0) && (
              <p style={{ color:'#374151', fontSize:12, alignSelf:'center' }}>
                {me?.eliminated ? 'You have been eliminated.' : me?.spectating ? 'You are spectating.' : 'No cards in hand.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Right sidebar: Chat + Log ── */}
      <div style={{ width:240, borderLeft:'1px solid #0d1f0d', display:'flex', flexDirection:'column', background:'#030805', flexShrink:0 }}>

        {/* Chat — top half */}
        <div style={{ flex:'0 0 55%', borderBottom:'1px solid #0d1f0d', overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <ChatBox
            chat={state.chat || []}
            myName={me?.name}
            onSend={text => doAction('chat', { text })}
          />
        </div>

        {/* Battle log — bottom half */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
          <div style={{ fontSize:10, color:'#4b5563', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Battle Log</div>
          {(state.log || []).map((entry, i) => (
            <div key={i} style={{ fontSize:11, color:'#6b7280', marginBottom:6, lineHeight:1.5, borderLeft:'2px solid #0d1f0d', paddingLeft:8 }}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
