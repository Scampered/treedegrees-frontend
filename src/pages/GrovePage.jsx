// src/pages/GrovePage.jsx — The Grove: Seeds & Stocks
import { useState, useEffect, useCallback, useRef } from 'react'
import { groveApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Time window config ────────────────────────────────────────────────────────
const WINDOWS = [
  { key: '12h', label: '12h', xStepH: 2,  xFormat: h => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` },
  { key: '1d',  label: '1d',  xStepH: 4,  xFormat: h => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` },
  { key: '1w',  label: '1w',  xStepH: 24, xFormat: h => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Math.floor(h/24) % 7] },
]

// ── Full chart with axes ──────────────────────────────────────────────────────
function StockChart({ data, win, w = 320, h = 90 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 10, color: '#374151' }}>No data yet — activity will appear here</p>
      </div>
    )
  }

  const PAD = { top: 8, right: 12, bottom: 22, left: 36 }
  const cw  = w - PAD.left - PAD.right
  const ch  = h - PAD.top  - PAD.bottom

  const vals = data.map(d => d.seeds)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const rangeV = Math.max(maxV - minV, 1)

  // X axis: fixed window bounds (windowStart → now), NOT data bounds
  // This ensures the line always stretches all the way to the right edge
  const nowMs = Date.now()
  const windowMs = win === '12h' ? 12*3600000 : win === '1w' ? 7*24*3600000 : 24*3600000
  const minT  = nowMs - windowMs   // left edge = window start
  const maxT  = nowMs              // right edge = right now
  const rangeT = maxT - minT

  const clamp = (t) => Math.max(minT, Math.min(maxT, new Date(t).getTime()))
  const toX = t  => PAD.left + ((clamp(t) - minT) / rangeT) * cw
  const toY = v  => PAD.top  + (1 - (v - minV) / rangeV) * ch

  // Build SVG path
  const pts = data.map(d => ({ x: toX(d.ts), y: toY(d.seeds) }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length-1].x},${PAD.top+ch} L${pts[0].x},${PAD.top+ch} Z`

  const first = vals[0], last = vals[vals.length-1]
  const rising = last >= first
  const col    = rising ? '#4ade80' : '#f87171'
  const diff   = last - first
  const diffStr = (diff >= 0 ? '+' : '') + diff

  // X axis ticks
  const winCfg  = WINDOWS.find(ww => ww.key === win) || WINDOWS[1]
  const stepMs  = winCfg.xStepH * 3600000
  const windowMs = win === '12h' ? 12*3600000 : win === '1w' ? 7*24*3600000 : 24*3600000
  const xTicks  = []
  const tickStart = Math.ceil(minT / stepMs) * stepMs
  for (let t = tickStart; t <= maxT; t += stepMs) {
    const x = PAD.left + ((t - minT) / rangeT) * cw
    const hOfDay = new Date(t).getHours()
    const dayIdx = Math.floor((t - (nowMs - windowMs)) / 86400000)
    xTicks.push({ x, label: winCfg.xFormat(win === '1w' ? dayIdx * 24 : hOfDay) })
  }

  // Y axis ticks (3 levels)
  const yTicks = [minV, Math.round((minV + maxV) / 2), maxV]

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {/* Y axis */}
      {yTicks.map((v, i) => {
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={PAD.left - 4} y1={y} x2={PAD.left + cw} y2={y}
              stroke="#0d1f0d" strokeWidth="1"/>
            <text x={PAD.left - 6} y={y + 3.5} textAnchor="end"
              fill="#374151" fontSize="8" fontFamily="monospace">{v}</text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={area} fill={col} opacity="0.08"/>
      {/* Line */}
      <path d={line} fill="none" stroke={col} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"/>
      {/* Current value dot */}
      <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={col}/>

      {/* X axis ticks */}
      {xTicks.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={PAD.top+ch} x2={t.x} y2={PAD.top+ch+3} stroke="#1f2f1f" strokeWidth="1"/>
          <text x={t.x} y={h - 4} textAnchor="middle"
            fill="#374151" fontSize="8" fontFamily="monospace">{t.label}</text>
        </g>
      ))}

      {/* X axis baseline */}
      <line x1={PAD.left} y1={PAD.top+ch} x2={PAD.left+cw} y2={PAD.top+ch} stroke="#1f2f1f" strokeWidth="1"/>

      {/* Diff badge top-right */}
      <text x={PAD.left+cw} y={PAD.top+6} textAnchor="end"
        fill={col} fontSize="9" fontWeight="700" fontFamily="monospace">{diffStr}</text>
    </svg>
  )
}

// ── Chart card with window tabs and live data ─────────────────────────────────
function ChartCard({ userId, name, isMe, seedsNow }) {
  const [win, setWin]     = useState('1d')
  const [data, setData]   = useState(null)
  const [loading, setLoad] = useState(true)
  const [chartW, setChartW] = useState(320)
  const timer    = useRef(null)
  const wrapRef  = useRef(null)

  // Measure container width so chart fills its card
  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setChartW(Math.floor(e.contentRect.width) || 320)
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    try {
      const { data: res } = await groveApi.history(userId, win)
      setData(res.data || [])
    } catch {}
    finally { setLoad(false) }
  }, [userId, win])

  useEffect(() => {
    setLoad(true)
    load()
    // Polling: 12h → 1min, 1d → 2min, 1w → 5min
    const interval = win === '12h' ? 60000 : win === '1d' ? 120000 : 300000
    timer.current = setInterval(load, interval)
    return () => clearInterval(timer.current)
  }, [load, win])

  // Re-load when seedsNow changes (they just earned/lost seeds)
  const prevSeeds = useRef(seedsNow)
  useEffect(() => {
    if (seedsNow !== prevSeeds.current) {
      prevSeeds.current = seedsNow
      load()
    }
  }, [seedsNow, load])

  return (
    <div ref={wrapRef} style={{ marginBottom: 6, width: '100%' }}>
      {/* Window selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {WINDOWS.map(ww => (
          <button key={ww.key} onClick={() => { setData(null); setLoad(true); setWin(ww.key) }}
            style={{
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: win === ww.key ? '#14532d' : 'transparent',
              border: `1px solid ${win === ww.key ? '#2d6a35' : '#1f2f1f'}`,
              color: win === ww.key ? '#4ade80' : '#4b5563',
            }}>
            {ww.label}
          </button>
        ))}
        {loading && <span style={{ fontSize: 9, color: '#374151', alignSelf: 'center' }}>updating…</span>}
      </div>
      <StockChart data={data} win={win} w={chartW} h={90}/>
    </div>
  )
}

// ── Investment modal ──────────────────────────────────────────────────────────
function InvestModal({ target, mySeeds, onDone, onClose }) {
  const [amount, setAmount] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const quickAmounts = [10, 20, 50, 100].filter(a => a <= mySeeds)
  const fee    = Math.floor((target.myInvestment || 0) * 0.10)
  const payout = (target.myInvestment || 0) - fee
  const boost  = Math.max(1, Math.floor(amount * 0.05))

  const invest = async () => {
    if (amount < 10 || amount > mySeeds) return
    setLoading(true); setError('')
    try { await groveApi.invest(target.id, amount); onDone() }
    catch (e) { setError(e.response?.data?.error || 'Failed'); setLoading(false) }
  }
  const withdraw = async () => {
    setLoading(true); setError('')
    try { await groveApi.withdraw(target.id); onDone() }
    catch (e) { setError(e.response?.data?.error || 'Failed'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <div>
            <h2 className="font-display text-forest-100 text-lg leading-none">{target.name}</h2>
            <p className="text-forest-500 text-xs mt-0.5">🌱 {target.seeds} seeds · {target.investorCount} investor{target.investorCount!==1?'s':''}</p>
          </div>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {target.myInvestment > 0 && (
            <div className="rounded-xl border border-forest-700 bg-forest-900/40 p-4">
              <p className="text-forest-400 text-xs mb-1">Your investment</p>
              <p className="text-forest-100 font-medium text-lg">🌱 {target.myInvestment}</p>
              <button onClick={withdraw} disabled={loading}
                className="mt-2 w-full py-2 text-sm rounded-xl border border-forest-700 text-forest-400
                           hover:text-forest-200 hover:border-forest-500 transition-colors disabled:opacity-40">
                Withdraw — get back 🌱 {payout} (−{fee} fee)
              </button>
            </div>
          )}
          {mySeeds >= 10 && (
            <>
              <div>
                <p className="text-forest-400 text-xs uppercase tracking-wide mb-2">
                  {target.myInvestment > 0 ? 'Add more' : 'Invest seeds'}
                </p>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {quickAmounts.map(v => (
                    <button key={v} onClick={() => setAmount(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                        ${amount===v?'bg-forest-700 border-forest-500 text-forest-100':'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input type="number" min={10} max={mySeeds} value={amount}
                    onChange={e => setAmount(Math.max(10,Math.min(mySeeds,parseInt(e.target.value)||10)))}
                    className="input text-sm flex-1"/>
                  <span className="text-forest-700 text-xs flex-shrink-0">/ {mySeeds}</span>
                </div>
                <p className="text-forest-700 text-xs mt-1">{target.name} gains +{boost} immediately</p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={invest} disabled={loading || amount < 10 || amount > mySeeds}
                className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium transition-colors">
                {loading ? 'Investing…' : `Invest 🌱 ${amount}`}
              </button>
            </>
          )}
          {mySeeds < 10 && !target.myInvestment && (
            <p className="text-forest-600 text-sm text-center py-2">You need at least 🌱 10 seeds to invest.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stock card ────────────────────────────────────────────────────────────────
function StockCard({ person, mySeeds, onInvest, onWithdraw }) {
  const rising = person.history?.length >= 2 &&
    person.history[person.history.length-1]?.seeds >= person.history[0]?.seeds
  const trendCol = rising ? '#4ade80' : '#f87171'
  const fee      = Math.floor((person.myInvestment || 0) * 0.10)
  const payout   = (person.myInvestment || 0) - fee

  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-1">
        <div className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center text-forest-100 font-bold text-sm flex-shrink-0">
          {person.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-forest-100 text-sm font-semibold leading-none truncate">{person.name}</p>
          <p className="text-forest-600 text-xs mt-0.5">{person.country}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-mono font-bold text-lg leading-none" style={{color: trendCol}}>
            🌱 {person.seeds}
          </p>
          <p className="text-forest-700 text-xs mt-0.5">{person.investorCount} investor{person.investorCount!==1?'s':''}</p>
        </div>
      </div>

      {/* Live chart with window selector */}
      <div className="px-3 pt-1 pb-0">
        <ChartCard userId={person.id} name={person.name} seedsNow={person.seeds} />
      </div>

      {/* Stake info */}
      {person.myInvestment > 0 && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-forest-800/50 border border-forest-700 flex items-center justify-between">
          <span className="text-forest-400 text-xs">Your stake</span>
          <span className="text-forest-100 font-mono font-medium text-sm">🌱 {person.myInvestment}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button onClick={() => onInvest(person)}
          className="flex-1 py-2 rounded-xl text-sm font-medium border border-forest-700
                     text-forest-300 hover:border-forest-500 hover:text-forest-100 hover:bg-forest-800/40 transition-colors">
          {person.myInvestment > 0 ? '＋ Add seeds' : '🌱 Invest'}
        </button>
        {person.myInvestment > 0 && (
          <button onClick={() => onWithdraw(person)}
            className="flex-1 py-2 rounded-xl text-sm font-medium border border-red-900/60
                       text-red-400/80 hover:border-red-700 hover:text-red-300 hover:bg-red-950/20 transition-colors">
            Withdraw (+{payout})
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main GrovePage ────────────────────────────────────────────────────────────
export default function GrovePage() {
  const { user }  = useAuth()
  const [me, setMe]                   = useState(null)
  const [connections, setConnections] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('stocks')
  const [investing, setInvesting]     = useState(null)
  const [sort, setSort]               = useState('seeds')

  const reload = useCallback(async () => {
    try {
      const [meRes, connRes, lbRes] = await Promise.all([
        groveApi.me(),
        groveApi.connections(),
        groveApi.leaderboard(),
      ])
      setMe(meRes.data)
      setConnections(connRes.data || [])
      setLeaderboard(lbRes.data || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const sorted = [...connections].sort((a, b) => {
    if (sort === 'seeds')    return b.seeds - a.seeds
    if (sort === 'rising')   return (b.history?.slice(-1)[0]?.seeds - b.history?.[0]?.seeds) - (a.history?.slice(-1)[0]?.seeds - a.history?.[0]?.seeds)
    if (sort === 'invested') return b.myInvestment - a.myInvestment
    return 0
  })

  const myRank = leaderboard.findIndex(l => l.isMe) + 1

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-forest-50">🪴 The Grove</h1>
            <p className="text-forest-600 text-xs mt-0.5">Seeds, stocks &amp; connection value</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-900/80 border border-forest-700">
              <span className="text-xl">🌱</span>
              <span className="text-forest-50 font-bold text-xl font-mono">
                {loading ? '…' : (me?.seeds ?? 0)}
              </span>
            </div>
            {myRank > 0 && (
              <p className="text-forest-700 text-xs">#{myRank} in your network</p>
            )}
          </div>
        </div>

        {/* My own chart */}
        {me && user?.id && (
          <div className="mt-3 rounded-xl bg-forest-900/40 border border-forest-800 px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-forest-500 text-xs">Your score</span>
              <span className="text-forest-600 text-xs">{me.investorCount} investor{me.investorCount!==1?'s':''} · 🌱{me.totalInvested} staked</span>
            </div>
            <ChartCard userId={user.id} name="you" isMe seedsNow={me.seeds} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 py-2 border-b border-forest-800 flex-shrink-0">
        {[['stocks','📈 Stocks'],['leaders','🏆 Leaders']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab===k?'bg-forest-700 text-forest-100':'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
            {l}
          </button>
        ))}
        {tab === 'stocks' && (
          <div className="ml-auto flex gap-1">
            {[['seeds','Value'],['rising','Rising'],['invested','Invested']].map(([k,l]) => (
              <button key={k} onClick={() => setSort(k)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors
                  ${sort===k?'bg-forest-800 text-forest-200':'text-forest-700 hover:text-forest-500'}`}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-forest-600 text-sm text-center py-12">Loading Grove…</p>}

        {!loading && tab === 'stocks' && (
          <>
            {sorted.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🪴</div>
                <p className="text-forest-300 font-medium text-lg">No connections yet</p>
                <p className="text-forest-600 text-sm mt-2 max-w-xs mx-auto">
                  Add connections to see their stock cards and invest seeds.
                </p>
                <p className="text-forest-700 text-xs mt-4">Check the Guide → The Grove to learn how Seeds work</p>
              </div>
            )}
            {sorted.map(person => (
              <StockCard
                key={person.id}
                person={person}
                mySeeds={me?.seeds || 0}
                onInvest={p => setInvesting(p)}
                onWithdraw={async p => {
                  try { await groveApi.withdraw(p.id); reload() }
                  catch(e) { alert(e.response?.data?.error || 'Failed') }
                }}
              />
            ))}
          </>
        )}

        {!loading && tab === 'leaders' && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-forest-800">
              <p className="text-forest-400 text-xs uppercase tracking-wide">Your network — top 10</p>
            </div>
            {leaderboard.map((l, i) => (
              <div key={l.id}
                className={`flex items-center gap-3 px-5 py-3 border-b border-forest-900 last:border-0
                  ${l.isMe ? 'bg-forest-800/30' : ''}`}>
                <span className="text-forest-600 font-mono text-sm w-6 text-center">
                  {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${l.isMe?'text-forest-200':'text-forest-300'} truncate`}>
                    {l.name}{l.isMe?' (you)':''}
                  </p>
                  <p className="text-forest-700 text-xs">{l.country}</p>
                </div>
                <span className="text-forest-100 font-bold font-mono text-sm">🌱 {l.seeds}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {investing && (
        <InvestModal
          target={investing}
          mySeeds={me?.seeds || 0}
          onDone={() => { setInvesting(null); reload() }}
          onClose={() => setInvesting(null)}
        />
      )}
    </div>
  )
}
