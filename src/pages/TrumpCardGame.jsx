// src/pages/TrumpCardGame.jsx — Trump Card: full multiplayer card game
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gamesApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Card SVG Icons ────────────────────────────────────────────────────────────
const CardIcon = ({ id }) => {
  const icons = {
    soldier: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <circle cx="12" cy="7" r="3"/><path d="M6 20v-2a6 6 0 0112 0v2"/><rect x="10" y="3" width="4" height="2"/>
    </g>,
    armored_soldier: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <path d="M12 3l6 3v5c0 4-3 7-6 8-3-1-6-4-6-8V6z"/><circle cx="12" cy="10" r="2"/>
    </g>,
    drone: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
      <circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
      <path d="M7 7l3.5 3.5M17 7l-3.5 3.5M7 17l3.5-3.5M17 17l-3.5-3.5"/>
    </g>,
    tank: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <rect x="4" y="9" width="16" height="8" rx="2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      <rect x="9" y="7" width="6" height="4" rx="1"/>
      <path d="M15 9h4"/>
    </g>,
    jet: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <path d="M12 3L5 14h4l-2 5 5-3 5 3-2-5h4z"/>
    </g>,
    missile: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <path d="M12 3v14M8 7l4-4 4 4"/><path d="M9 17l-2 4h10l-2-4"/>
      <path d="M9 13H7M15 13h2"/>
    </g>,
    artillery: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <circle cx="6" cy="17" r="3"/><circle cx="16" cy="17" r="2"/>
      <path d="M9 17h5M14 15l5-8"/><rect x="3" y="13" width="6" height="4" rx="1"/>
    </g>,
    interceptor: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <path d="M12 4l2 6h5l-4 3 2 6-5-3-5 3 2-6-4-3h5z"/>
    </g>,
    divert_attack: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <path d="M5 9l4-4 4 4M9 5v10"/><path d="M19 15l-4 4-4-4M15 19V9"/>
    </g>,
    call_reinforce: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <circle cx="7" cy="16" r="2.5"/><circle cx="17" cy="16" r="2.5"/>
      <circle cx="12" cy="10" r="2.5"/>
      <path d="M7 13.5v-6M17 13.5v-6M12 7.5v-4"/>
    </g>,
    spy_operation: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <circle cx="12" cy="9" r="3"/><path d="M6 20v-1a6 6 0 0112 0v1"/>
      <path d="M8 7s1-2 4-2 4 2 4 2" strokeDasharray="2 2"/>
      <path d="M4 12h16" strokeDasharray="3 2"/>
    </g>,
    block_comms: <g stroke="currentColor" fill="none" strokeWidth="1.5">
      <path d="M2 2l20 20M8.5 8.5A5 5 0 0117 17M12 6a7 7 0 017 7M5.5 10.5A8.5 8.5 0 0114 19"/>
      <circle cx="12" cy="19" r="1" fill="currentColor"/>
    </g>,
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" style={{ opacity: 0.85 }}>
      {icons[id] || icons.soldier}
    </svg>
  )
}

// ── Card rendering ────────────────────────────────────────────────────────────
const CARD_COLORS = {
  basic:    { bg: '#1e2733', border: '#4a5568', text: '#9ca3af' },
  tactical: { bg: '#0d2626', border: '#0d9488', text: '#5eead4' },
  amber:    { bg: '#1c1005', border: '#d97706', text: '#fbbf24' },
  purple:   { bg: '#150a20', border: '#7c3aed', text: '#a78bfa' },
}

function CardSvg({ card, selected, onClick, hidden, small }) {
  const w = small ? 56 : 72, h = small ? 84 : 108
  const colors = CARD_COLORS[card.sub] || CARD_COLORS.basic
  const isSpy = card.id === 'spy_operation'
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w} height={h}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', flexShrink: 0 }}
    >
      {isSpy && (
        <defs>
          <filter id="glitch">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
            <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
            <feBlend in="SourceGraphic" in2="gray" mode="multiply"/>
          </filter>
        </defs>
      )}
      {/* Card body */}
      <rect x="1" y="1" width={w-2} height={h-2} rx="5"
        fill={selected ? '#1a3a1a' : colors.bg}
        stroke={selected ? '#4dba4d' : colors.border}
        strokeWidth={selected ? 2 : 1}
      />
      {hidden && (
        <>
          <rect x="1" y="1" width={w-2} height={h-2} rx="5" fill="rgba(0,0,0,0.7)"/>
          <text x={w/2} y={h/2} textAnchor="middle" dominantBaseline="middle"
            fill="#666" fontSize="9" fontFamily="monospace">? ? ?</text>
        </>
      )}
      {!hidden && (
        <>
          {/* Card name */}
          <text x={w/2} y="10" textAnchor="middle" fill={colors.text}
            fontSize={small ? 5 : 6.5} fontFamily="'Dosis',sans-serif" fontWeight="600">
            {card.name.length > 14 ? card.name.slice(0,13)+'…' : card.name}
          </text>
          {/* Icon area */}
          <g transform={`translate(${w/2-14},${h/2-18})`} color={colors.text}>
            <CardIcon id={card.id}/>
          </g>
          {/* ATK/DEF bottom */}
          {(card.atk > 0 || card.def > 0) && (
            <>
              <text x="8" y={h-7} fill="#ef4444" fontSize={small ? 7 : 9} fontWeight="700" fontFamily="monospace">{card.atk}</text>
              <text x="8" y={h-16} fill="#999" fontSize={small ? 4 : 5} fontFamily="sans-serif">ATK</text>
              <text x={w-8} y={h-7} textAnchor="end" fill="#3b82f6" fontSize={small ? 7 : 9} fontWeight="700" fontFamily="monospace">{card.def}</text>
              <text x={w-8} y={h-16} textAnchor="end" fill="#999" fontSize={small ? 4 : 5} fontFamily="sans-serif">DEF</text>
            </>
          )}
          {card.type === 'special' && (card.atk === 0) && (
            <text x={w/2} y={h-8} textAnchor="middle" fill={colors.text} fontSize={5} fontFamily="sans-serif">SPECIAL</text>
          )}
          {isSpy && (
            <rect x="0" y="0" width={w} height={h} rx="5" fill="rgba(124,58,237,0.08)" filter="url(#glitch)"/>
          )}
        </>
      )}
      {selected && (
        <rect x="0" y="0" width={w} height={h} rx="5" fill="rgba(77,186,77,0.15)"/>
      )}
    </svg>
  )
}

// ── Seat positions for circular table ─────────────────────────────────────────
function getSeatPositions(n, myIdx) {
  // Reorder so my seat is always at bottom (6 o'clock)
  const positions = []
  for (let i = 0; i < n; i++) {
    const relIdx = (i - myIdx + n) % n
    const angle = (relIdx / n) * 360 - 90 // start from bottom
    const rad = (angle * Math.PI) / 180
    const r = 38 // percent of container
    positions.push({
      x: 50 + r * Math.cos(rad),
      y: 50 + r * Math.sin(rad),
      playerIndex: i,
    })
  }
  return positions
}

// ── Main game component ───────────────────────────────────────────────────────
export default function TrumpCardGame({ gameId: propGameId }) {
  const { id: paramId } = useParams()
  const gameId = propGameId || paramId
  const { user } = useAuth()
  const navigate = useNavigate()

  const [state, setState]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [selectedCards, setSelected] = useState([])
  const [actionError, setActionError] = useState('')
  const [targetIdx, setTargetIdx]   = useState(null)
  const [spyValue, setSpyValue]     = useState(3)
  const [showLog, setShowLog]       = useState(false)
  const [defenseCountdown, setDefenseCountdown] = useState(null)
  const pollRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const { data } = await gamesApi.state(gameId)
      setState(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Connection error')
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    fetchState()
    pollRef.current = setInterval(fetchState, 2500)
    return () => clearInterval(pollRef.current)
  }, [fetchState])

  // Defense countdown
  useEffect(() => {
    if (!state?.defenseDeadline) { setDefenseCountdown(null); return }
    const tick = () => {
      const ms = new Date(state.defenseDeadline) - Date.now()
      setDefenseCountdown(Math.max(0, Math.ceil(ms / 1000)))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [state?.defenseDeadline])

  const action = async (type, payload = {}) => {
    setActionError('')
    try {
      const { data } = await gamesApi.action(gameId, type, payload)
      if (data.state) setState(data.state)
      setSelected([])
      setTargetIdx(null)
      await fetchState()
    } catch (err) {
      setActionError(err.response?.data?.error || 'Action failed')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-gray-950 text-gray-400">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin mx-auto mb-3"/>
        Loading game…
      </div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full bg-gray-950 text-red-400">
      <div className="text-center"><p className="text-4xl mb-4">⚠️</p><p>{error}</p>
        <button onClick={fetchState} className="mt-4 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg text-sm">Retry</button>
      </div>
    </div>
  )

  if (!state) return null

  const myIdx = state.myPlayerIndex
  const me = myIdx >= 0 ? state.players[myIdx] : null
  const isMyTurn = myIdx === state.turnPlayerIndex
  const isDefender = myIdx === state.targetPlayerIndex
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // ── Win screen ──
  if (state.status === 'ended' || state.turnPhase === 'ended') {
    const winner = state.players.find(p => p.userId === state.winner)
    const iWon = state.winner === user?.id
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-center px-6">
          <div className="text-7xl mb-4">{iWon ? '🏆' : '💀'}</div>
          <h1 className="text-3xl font-bold text-white mb-2">{iWon ? 'Victory!' : 'Defeated'}</h1>
          <p className="text-gray-400 text-lg mb-6">{winner?.name || 'Someone'} wins the battle!</p>
          <button onClick={() => navigate('/games')} className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-xl font-medium transition-colors">
            Back to Games
          </button>
        </div>
      </div>
    )
  }

  // ── Waiting screen ──
  if (state.status === 'waiting') {
    return (
      <div className="flex flex-col h-full bg-gray-950 text-white">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
          <button onClick={() => navigate('/games')} className="text-gray-500 hover:text-gray-300">←</button>
          <h1 className="font-bold text-lg">🃏 Trump Card — Lobby</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-full max-w-sm space-y-3">
            <p className="text-gray-400 text-sm text-center">Players in lobby ({state.players.length}/9)</p>
            {state.players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-gray-900 rounded-xl border border-gray-800">
                <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center font-bold text-sm">{p.name[0]}</div>
                <span className="text-gray-200">{p.name}</span>
                {i === 0 && <span className="ml-auto text-xs text-yellow-500">Creator</span>}
              </div>
            ))}
          </div>
          {state.players[0]?.userId === user?.id ? (
            <button onClick={() => action('start')} disabled={state.players.length < 2}
              className="px-8 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl font-medium transition-colors">
              {state.players.length < 2 ? 'Waiting for players…' : 'Start Game'}
            </button>
          ) : (
            <p className="text-gray-500 text-sm">Waiting for the host to start…</p>
          )}
        </div>
      </div>
    )
  }

  const toggleCard = (uid) => {
    setSelected(prev => prev.includes(uid)
      ? prev.filter(u => u !== uid)
      : prev.length >= 3 ? prev : [...prev, uid]
    )
  }

  const seatPositions = getSeatPositions(state.players.length, myIdx >= 0 ? myIdx : 0)

  // ── Mobile layout ──────────────────────────────────────────────────────────
  if (isMobile) return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden" style={{ userSelect: 'none' }}>
      {/* Top: other players */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-gray-800 flex-shrink-0 bg-gray-900/50">
        {state.players.filter((_, i) => i !== myIdx).map((p, i) => (
          <button key={p.userId}
            onClick={() => { if (isMyTurn && state.turnPhase === 'select' && !p.eliminated) setTargetIdx(state.players.indexOf(p)) }}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all
              ${targetIdx === state.players.indexOf(p) ? 'border-red-500 bg-red-950/30' : p.isCurrentTurn ? 'border-yellow-500 bg-yellow-950/20' : 'border-gray-700 bg-gray-800'}
              ${p.eliminated ? 'opacity-40' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${p.isCurrentTurn ? 'bg-yellow-700' : 'bg-gray-700'}`}>
              {p.name[0]}
            </div>
            <p className="text-xs text-gray-300 font-medium max-w-16 truncate">{p.name}</p>
            <p className="text-xs text-gray-500">{p.eliminated ? '💀' : `${p.cardCount} cards`}</p>
          </button>
        ))}
      </div>

      {/* Center: play zone */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        {/* Turn/status indicator */}
        <div className="mb-3 text-center">
          {isMyTurn && state.turnPhase === 'select' && <p className="text-green-400 font-medium text-sm">Your turn — select cards to attack</p>}
          {isMyTurn && state.turnPhase === 'defending' && <p className="text-blue-400 text-sm">Waiting for defense…</p>}
          {!isMyTurn && state.turnPhase === 'select' && <p className="text-gray-400 text-sm">{state.players[state.turnPlayerIndex]?.name}'s turn</p>}
          {isDefender && state.turnPhase === 'defending' && <p className="text-yellow-400 font-medium text-sm">Choose defense cards! ({defenseCountdown}s)</p>}
          {state.pendingSpyForMe && <p className="text-purple-400 font-medium text-sm">Spy card received! Deploy or discard?</p>}
        </div>

        {/* Play zone cards */}
        {state.playZone.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap justify-center">
            {state.playZone.map(c => (
              <CardSvg key={c.uid} card={c} hidden={c.hidden} small />
            ))}
          </div>
        )}

        {/* Attack info */}
        {state.attackTotal > 0 && (
          <div className="flex gap-4 mb-3 text-sm">
            <span className="text-red-400 font-bold">ATK: {state.attackTotal}</span>
            <span className="text-blue-400 font-bold">DEF: {state.defenseTotal}</span>
          </div>
        )}

        {/* Deck counter */}
        <div className="text-gray-600 text-xs">🃏 {state.deckCount} cards remaining</div>
      </div>

      {/* Action area */}
      <div className="border-t border-gray-800 bg-gray-900/50 px-3 py-2 flex-shrink-0">
        {/* Target selector */}
        {isMyTurn && state.turnPhase === 'select' && targetIdx !== null && (
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">Target:</span>
            <span className="text-sm text-red-400 font-medium">{state.players[targetIdx]?.name}</span>
            <button onClick={() => setTargetIdx(null)} className="text-xs text-gray-600 ml-auto">Clear</button>
          </div>
        )}

        {/* Spy respond */}
        {state.pendingSpyForMe && (
          <div className="flex gap-2 mb-2">
            <button onClick={() => action('spy_respond', { deploy: true })}
              className="flex-1 py-2 bg-purple-800 hover:bg-purple-700 rounded-lg text-sm">Deploy ({state.pendingSpyForMe.value})</button>
            <button onClick={() => action('spy_respond', { deploy: false })}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Discard</button>
          </div>
        )}

        {/* Defense */}
        {isDefender && state.turnPhase === 'defending' && (
          <div className="flex gap-2 mb-2">
            <button onClick={() => action('defend', { cardUids: selectedCards })} disabled={selectedCards.length === 0}
              className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 rounded-lg text-sm">
              Deploy Defense ({selectedCards.length} cards)
            </button>
            <button onClick={() => action('skip_defense')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Pass</button>
          </div>
        )}

        {/* Attack */}
        {isMyTurn && state.turnPhase === 'select' && (
          <div className="flex gap-2 mb-2">
            <button onClick={() => action('deploy_cards', { cardUids: selectedCards, targetIdx })}
              disabled={selectedCards.length === 0 || targetIdx === null}
              className="flex-1 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 rounded-lg text-sm">
              Attack ({selectedCards.length} cards)
            </button>
            {selectedCards.some(uid => me?.hand?.find(c => c.uid === uid)?.id === 'call_reinforce') && (
              <button onClick={() => action('deploy_cards', { cardUids: selectedCards, targetIdx: myIdx })}
                className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm">+2</button>
            )}
          </div>
        )}

        {actionError && <p className="text-red-400 text-xs mb-1">{actionError}</p>}
      </div>

      {/* My hand — horizontal scroll */}
      <div className="border-t border-gray-800 bg-gray-900 flex-shrink-0 px-2 py-2 overflow-x-auto">
        <div className="flex gap-2">
          {(me?.hand || []).map(card => (
            <div key={card.uid} style={{ flexShrink: 0 }}
              onClick={() => {
                if ((isMyTurn && state.turnPhase === 'select') || (isDefender && state.turnPhase === 'defending')) {
                  toggleCard(card.uid)
                }
              }}>
              <CardSvg card={card} selected={selectedCards.includes(card.uid)} small />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Desktop layout — circular table ────────────────────────────────────────
  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">

      {/* Circular table */}
      <div className="flex-1 relative min-h-0">
        {/* Table circle background */}
        <div className="absolute inset-4 rounded-full" style={{
          background: 'radial-gradient(ellipse at center, #0d2010 0%, #070f08 60%, #030705 100%)',
          border: '2px solid #1a3a1a',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)',
        }}/>

        {/* Player seats around the circle */}
        {state.players.map((p, i) => {
          const seat = seatPositions.find(s => s.playerIndex === i)
          if (!seat) return null
          const isMe = i === myIdx
          const isCurrent = p.isCurrentTurn
          const isTarget = i === state.targetPlayerIndex

          return (
            <div key={p.userId} style={{
              position: 'absolute',
              left: `${seat.x}%`,
              top: `${seat.y}%`,
              transform: 'translate(-50%, -50%)',
              width: isMe ? 'auto' : '90px',
              textAlign: 'center',
            }}>
              {/* Player avatar */}
              <div
                onClick={() => {
                  if (isMyTurn && state.turnPhase === 'select' && !isMe && !p.eliminated) {
                    setTargetIdx(i === targetIdx ? null : i)
                  }
                }}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: isMe ? '#1a4a1a' : p.eliminated ? '#1a1a1a' : '#1a2a1a',
                  border: `2px solid ${isCurrent ? '#fbbf24' : isTarget ? '#ef4444' : isMe ? '#4dba4d' : '#374151'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 'bold', cursor: (!isMe && !p.eliminated && isMyTurn) ? 'pointer' : 'default',
                  margin: '0 auto 4px',
                  boxShadow: isCurrent ? '0 0 12px rgba(251,191,36,0.4)' : isTarget ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
                  opacity: p.eliminated ? 0.4 : 1,
                }}>
                {p.eliminated ? '💀' : p.name[0]}
              </div>
              <div style={{ fontSize: 11, color: isCurrent ? '#fbbf24' : '#9ca3af', fontWeight: 600, marginBottom: 2 }}>
                {p.name.length > 10 ? p.name.slice(0,9)+'…' : p.name}
              </div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>
                {p.eliminated ? 'ELIMINATED' : `${p.cardCount} cards`}
              </div>
              {isTarget && !isMe && (
                <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚔️ TARGET</div>
              )}

              {/* Show my hand at bottom */}
              {isMe && (
                <div style={{ position: 'absolute', bottom: '-130px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 10 }}>
                  {(me?.hand || []).map(card => (
                    <div key={card.uid} onClick={() => {
                      if ((isMyTurn && state.turnPhase === 'select') || (isDefender && state.turnPhase === 'defending')) {
                        toggleCard(card.uid)
                      }
                    }}>
                      <CardSvg card={card} selected={selectedCards.includes(card.uid)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Centre play zone */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          {/* Play zone cards */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 240 }}>
            {state.playZone.map(c => (
              <CardSvg key={c.uid} card={c} hidden={c.hidden} small />
            ))}
          </div>
          {/* ATK/DEF totals */}
          {state.attackTotal > 0 && (
            <div style={{ display: 'flex', gap: 16, fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: '#ef4444' }}>ATK: {state.attackTotal}</span>
              <span style={{ color: '#3b82f6' }}>DEF: {state.defenseTotal}</span>
            </div>
          )}
          <div style={{ fontSize: 11, color: '#4b5563' }}>🃏 {state.deckCount} left</div>
        </div>

        {/* Turn phase indicator */}
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          {isMyTurn && state.turnPhase === 'select' && (
            <div style={{ background: 'rgba(16,64,16,0.9)', border: '1px solid #4dba4d', borderRadius: 8, padding: '6px 16px', fontSize: 13, color: '#4dba4d' }}>
              Your turn — select cards
            </div>
          )}
          {isDefender && state.turnPhase === 'defending' && (
            <div style={{ background: 'rgba(30,60,90,0.9)', border: '1px solid #3b82f6', borderRadius: 8, padding: '6px 16px', fontSize: 13, color: '#60a5fa' }}>
              ⏱ Defend! {defenseCountdown}s
            </div>
          )}
          {!isMyTurn && !isDefender && state.turnPhase === 'select' && (
            <div style={{ background: 'rgba(10,10,10,0.9)', border: '1px solid #374151', borderRadius: 8, padding: '6px 16px', fontSize: 13, color: '#9ca3af' }}>
              {state.players[state.turnPlayerIndex]?.name}'s turn
            </div>
          )}
        </div>

        {/* Spy pending notice */}
        {state.pendingSpyForMe && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#0d0520', border: '1px solid #7c3aed', borderRadius: 12, padding: 20,
            textAlign: 'center', zIndex: 20, minWidth: 240,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🕵️</div>
            <p style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Spy Card Received!</p>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>Value: {state.pendingSpyForMe.value} — Deploy or discard?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => action('spy_respond', { deploy: true })}
                style={{ flex: 1, padding: '8px 0', background: '#4c1d95', border: 'none', borderRadius: 8, color: '#a78bfa', cursor: 'pointer', fontSize: 13 }}>
                Deploy
              </button>
              <button onClick={() => action('spy_respond', { deploy: false })}
                style={{ flex: 1, padding: '8px 0', background: '#1f2937', border: 'none', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel: actions + log */}
      <div style={{ width: 220, background: '#0a0f0a', borderLeft: '1px solid #1a2a1a', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>

        {/* Action panel */}
        <div style={{ padding: 12, borderBottom: '1px solid #1a2a1a', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Actions</p>

          {actionError && <p style={{ color: '#f87171', fontSize: 11, marginBottom: 8 }}>{actionError}</p>}

          {isMyTurn && state.turnPhase === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Target selector */}
              <select value={targetIdx ?? ''} onChange={e => setTargetIdx(e.target.value === '' ? null : parseInt(e.target.value))}
                style={{ background: '#111', border: '1px solid #374151', color: '#9ca3af', padding: '6px 8px', borderRadius: 6, fontSize: 12, width: '100%' }}>
                <option value="">— Pick target —</option>
                {state.players.map((p, i) => !p.eliminated && i !== myIdx
                  ? <option key={i} value={i}>{p.name}</option> : null)}
              </select>

              {/* Spy value if spy selected */}
              {selectedCards.some(uid => me?.hand?.find(c => c.uid === uid)?.id === 'spy_operation') && (
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280' }}>Spy value:</label>
                  <select value={spyValue} onChange={e => setSpyValue(parseInt(e.target.value))}
                    style={{ background: '#111', border: '1px solid #374151', color: '#a78bfa', padding: '4px 8px', borderRadius: 6, fontSize: 12, width: '100%', marginTop: 4 }}>
                    <option value={2}>2 (15% spy)</option>
                    <option value={3}>3 (25% spy)</option>
                    <option value={4}>4 (40% spy)</option>
                    <option value={5}>5 (55% spy)</option>
                  </select>
                </div>
              )}

              <button onClick={() => action('deploy_cards', { cardUids: selectedCards, targetIdx, spyValue })}
                disabled={selectedCards.length === 0}
                style={{ padding: '8px 0', background: selectedCards.length ? '#991b1b' : '#1f2937', border: 'none', borderRadius: 8, color: selectedCards.length ? '#fca5a5' : '#6b7280', cursor: selectedCards.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600 }}>
                {selectedCards.length ? `⚔️ Deploy (${selectedCards.length})` : 'Select cards'}
              </button>
            </div>
          )}

          {isDefender && state.turnPhase === 'defending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ color: '#60a5fa', fontSize: 12 }}>⏱ {defenseCountdown}s to respond</p>
              <button onClick={() => action('defend', { cardUids: selectedCards })}
                disabled={selectedCards.length === 0}
                style={{ padding: '8px 0', background: '#1e3a5f', border: 'none', borderRadius: 8, color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                🛡️ Defend ({selectedCards.length})
              </button>
              <button onClick={() => action('skip_defense')}
                style={{ padding: '8px 0', background: '#111', border: '1px solid #374151', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>
                Pass (take damage)
              </button>
            </div>
          )}

          {!isMyTurn && !isDefender && !state.pendingSpyForMe && state.turnPhase === 'select' && (
            <p style={{ color: '#4b5563', fontSize: 12 }}>Waiting…</p>
          )}

          {/* Selection hint */}
          {selectedCards.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
              {selectedCards.length} card{selectedCards.length > 1 ? 's' : ''} selected
              <button onClick={() => setSelected([])} style={{ marginLeft: 8, color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {/* Game log */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          <p style={{ fontSize: 11, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Battle Log</p>
          {state.log.map((entry, i) => (
            <div key={i} style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, lineHeight: 1.4, borderLeft: '2px solid #1a2a1a', paddingLeft: 8 }}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
