// src/pages/GrovePage.jsx — The Grove: Seeds & Stocks
import { useState, useEffect, useCallback, useRef } from 'react'
import { groveApi, marketApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Time window config ────────────────────────────────────────────────────────
const WINDOWS = [
  { key: '1h',  label: '1h',  xStepMs: 5*60*1000,     xFormat: t => { const d=new Date(t); const m=d.getMinutes(); return m===0?`${d.getHours()%12||12}${d.getHours()<12?'a':'p'}`:`${m}m` } },
  { key: '6h',  label: '6h',  xStepMs: 30*60*1000,    xFormat: t => { const d=new Date(t); return `${d.getHours()%12||12}${d.getHours()<12?'a':'p'}` } },
  { key: '12h', label: '12h', xStepMs: 2*3600*1000,   xFormat: t => { const d=new Date(t); return `${d.getHours()%12||12}${d.getHours()<12?'a':'p'}` } },
  { key: '1d',  label: '1d',  xStepMs: 4*3600*1000,   xFormat: t => { const d=new Date(t); return `${d.getHours()%12||12}${d.getHours()<12?'a':'p'}` } },
  { key: '1w',  label: '1w',  xStepMs: 24*3600*1000,  xFormat: t => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(t).getDay()] },
]


// Tiered fee — mirrors backend withdrawFeeRate()
function withdrawFeeRate(principal) {
  if (principal < 50)  return 0.08
  if (principal < 150) return 0.12
  if (principal < 300) return 0.16
  return 0.20
}

// ── Compute withdraw payout preview (mirrors backend logic) ──────────────────
function computePayout(principal, seedsAtInvest, currentSeeds) {
  if (!principal) return 0
  const baseline   = Math.max(10, seedsAtInvest || currentSeeds || 10)
  const multiplier = Math.min(10, Math.max(0, currentSeeds / baseline))
  const activeHalf = Math.floor(principal / 2)
  const safeHalf   = principal - activeHalf
  const activeValue = Math.floor(activeHalf * multiplier)
  const fee        = Math.floor(activeValue * withdrawFeeRate(principal))
  return safeHalf + activeValue - fee
}

// ── Full chart with axes ──────────────────────────────────────────────────────
function StockChart({ data, win, w = 320, h = 90, overrideCol, overrideArea }) {
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
  const col    = overrideCol || (rising ? '#4ade80' : '#f87171')
  const areaFill = overrideArea || (rising ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)')
  const diff   = last - first
  const diffStr = (diff >= 0 ? '+' : '') + diff

  // X axis ticks
  const winCfg  = WINDOWS.find(ww => ww.key === win) || WINDOWS[1]
  // windowMs already declared above
  const xTicks  = []
  const stepMs2 = winCfg.xStepH * 3600000
  const tickStart = Math.ceil(minT / stepMs2) * stepMs2
  for (let t = tickStart; t <= maxT; t += stepMs2) {
    const x = PAD.left + ((t - minT) / rangeT) * cw
    xTicks.push({ x, label: winCfg.xFormat(new Date(t).toISOString()) })
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
      <path d={area} fill={areaFill} opacity="1"/>
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
      <text x={PAD.left+cw} y={PAD.top+8} textAnchor="end"
        fill={col} fontSize="10" fontWeight="700" fontFamily="monospace">{diffStr}</text>
      <text x={PAD.left+cw} y={PAD.top+18} textAnchor="end"
        fill={col} fontSize="7" fontFamily="monospace" opacity="0.6">since {win === '12h' ? '12h ago' : win === '1d' ? '24h ago' : '7d ago'}</text>
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
    const interval = win === '1h' ? 60000 : win === '6h' ? 120000 : win === '12h' ? 300000 : win === '1d' ? 300000 : 600000
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


// ── Market chart card (Canopy + Crude) ───────────────────────────────────────
function MarketCard({ market }) {
  const isCrude  = market === 'crude'
  const label    = isCrude ? '🛢️ Crude' : '🌳 The Canopy'
  const subtitle = isCrude ? 'Oil & fuel market' : 'Platform economy index'
  const lineCol  = isCrude ? '#b87820' : '#c8a830'
  const areaCol  = isCrude ? 'rgba(184,120,32,0.10)' : 'rgba(200,168,48,0.12)'

  const [win, setWin]           = useState('1d')
  const [data, setData]         = useState(null)
  const [state, setState]       = useState(null)
  const [pos, setPos]           = useState(null)
  const [loading, setLoad]      = useState(true)
  const [showInvest, setShowInv] = useState(false)
  const [showWithdraw, setShowW] = useState(false)
  const [amount, setAmount]     = useState(20)
  const [withdrawAmt, setWAmt]  = useState(0)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const wrapRef = useRef(null)
  const [chartW, setChartW]     = useState(320)
  const timer   = useRef(null)

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(e => setChartW(Math.floor(e[0].contentRect.width) || 320))
    ro.observe(wrapRef.current); return () => ro.disconnect()
  }, [])

  const load = useCallback(async () => {
    try {
      const [h, s, p] = await Promise.all([
        marketApi.history(market, win),
        marketApi.state(),
        marketApi.positions(),
      ])
      setData(h.data.data || [])
      setState(s.data[market])
      setPos(p.data.find(x => x.market === market) || null)
    } catch {} finally { setLoad(false) }
  }, [market, win])

  useEffect(() => {
    setLoad(true); load()
    const iv = win === '1h' ? 60000 : win === '6h' ? 120000 : 300000
    timer.current = setInterval(load, iv)
    return () => clearInterval(timer.current)
  }, [load, win])

  // Payout calculations
  const baseline    = pos ? Math.max(1, pos.priceAtInvest) : 1
  const currentP    = state?.price || baseline
  const mult        = Math.min(10, Math.max(0, currentP / baseline))
  const wAmt        = withdrawAmt || (pos?.amount ?? 0)
  const frac        = pos ? wAmt / pos.amount : 0
  const wPrincipal  = pos ? Math.floor(pos.amount * frac) : 0
  const wActive     = Math.floor((wPrincipal / 2) * mult)
  const wSafe       = wPrincipal - Math.floor(wPrincipal / 2)
  const wFee        = Math.floor(wActive * withdrawFeeRate(wPrincipal))
  const wPayout     = wSafe + wActive - wFee
  const wProfit     = wPayout - wPrincipal

  const diff   = data?.length >= 2 ? Math.round(data[data.length-1].seeds - data[0].seeds) : 0
  const rising = diff >= 0

  const doInvest = async () => {
    if (amount < 10) return
    setBusy(true); setError('')
    try { await marketApi.invest(market, amount); setShowInv(false); load() }
    catch (e) { setError(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  const doWithdraw = async () => {
    setBusy(true); setError('')
    try {
      const isPartial = wAmt < pos.amount
      await marketApi.withdraw(market, isPartial ? wAmt : undefined)
      setShowW(false); load()
    } catch (e) { setError(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <>
    <div className="rounded-2xl border overflow-hidden"
      style={{ borderColor: lineCol+'66', background:'rgba(20,14,2,0.5)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-1 flex items-start justify-between">
        <div>
          <p className="font-display text-lg leading-none" style={{ color: lineCol }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: lineCol+'88' }}>{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-xl" style={{ color: lineCol }}>
            {loading ? '…' : Math.round(state?.price || 0)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: rising ? '#4ade80' : '#f87171' }}>
            {diff >= 0 ? '+' : ''}{diff} since {win}
          </p>
        </div>
      </div>

      {/* Window tabs */}
      <div className="px-4 flex gap-1.5 mb-1">
        {['1h','6h','12h','1d','1w'].map(w => (
          <button key={w} onClick={() => { setData(null); setLoad(true); setWin(w) }}
            style={{
              padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, cursor:'pointer',
              background: win===w ? lineCol+'33' : 'transparent',
              border:`1px solid ${win===w ? lineCol : lineCol+'33'}`,
              color: win===w ? lineCol : lineCol+'55',
            }}>{w}</button>
        ))}
      </div>

      {/* Chart */}
      <div ref={wrapRef} className="px-3 pb-1">
        {data
          ? <StockChart data={data} win={win} w={chartW} h={80} overrideCol={lineCol} overrideArea={areaCol}/>
          : <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:10, color:lineCol+'44' }}>Loading…</span>
            </div>
        }
      </div>

      {/* Stake info (mirrors StockCard stake section) */}
      {pos && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl" style={{ background:lineCol+'0d', border:`1px solid ${lineCol}33` }}>
          {/* Buy marker ribbon */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium"
              style={{ background:lineCol+'18', border:`1px solid ${lineCol}55`, color:lineCol }}>
              📍 Bought at {Math.round(pos.priceAtInvest)}
            </div>
            <span className={`text-xs font-mono ${currentP >= pos.priceAtInvest ? 'text-green-400' : 'text-red-400'}`}>
              {currentP >= pos.priceAtInvest ? '▲' : '▼'} {Math.abs(Math.round(currentP - pos.priceAtInvest))} since buy
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color:lineCol+'88' }}>Your stake</span>
            <span className="font-mono font-medium text-sm" style={{ color:lineCol }}>🌱 {pos.amount}</span>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-xs" style={{ color:lineCol+'66' }}>Withdraw payout</span>
            <span className={`text-xs font-mono font-medium ${wProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              🌱 {wPayout} ({wProfit >= 0 ? '+' : ''}{wProfit})
            </span>
          </div>
        </div>
      )}

      {/* Action buttons (mirrors StockCard) */}
      <div className="flex gap-2 px-4 pb-4">
        <button onClick={() => { setShowInv(true); setShowW(false); setError('') }}
          className="flex-1 py-2 rounded-xl text-sm font-medium border transition-colors"
          style={{ borderColor:lineCol+'44', color:lineCol, background:lineCol+'0a' }}>
          {pos ? '＋ Add seeds' : '🌱 Invest'}
        </button>
        {pos && (
          <button onClick={() => { setShowW(true); setShowInv(false); setWAmt(pos.amount); setError('') }}
            className="flex-1 py-2 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor:'rgba(248,113,113,0.35)', color:'#f87171' }}>
            Withdraw
          </button>
        )}
      </div>
    </div>

    {/* Invest Modal (mirrors InvestModal exactly) */}
    {showInvest && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
            <div>
              <h2 className="font-display text-forest-100 text-lg leading-none">Invest in {label}</h2>
              <p className="text-forest-500 text-xs mt-0.5">Current price: {Math.round(state?.price || 0)}</p>
            </div>
            <button onClick={() => setShowInv(false)} className="text-forest-600 hover:text-forest-300 text-xl">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-forest-400 text-xs uppercase tracking-wide mb-2">Invest seeds</p>
              <div className="flex gap-2 mb-2 flex-wrap">
                {[10,20,50,100].map(v => (
                  <button key={v} onClick={() => setAmount(v)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                      ${amount===v?'bg-forest-700 border-forest-500 text-forest-100':'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <input type="number" min={10} value={amount}
                onChange={e => setAmount(Math.max(10, parseInt(e.target.value)||10))}
                className="input text-sm"/>
              <p className="text-forest-700 text-xs mt-1">50% of active stake tracks market movement</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={doInvest} disabled={busy || amount < 10}
              className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium transition-colors">
              {busy ? 'Investing…' : `Invest 🌱${amount}`}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Withdraw Modal (mirrors WithdrawModal exactly) */}
    {showWithdraw && pos && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
        <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
            <div>
              <h2 className="font-display text-forest-100 text-lg leading-none">Withdraw from {label}</h2>
              <p className="text-forest-500 text-xs mt-0.5">🌱 {pos.amount} invested · ×{mult.toFixed(2)} multiplier</p>
            </div>
            <button onClick={() => setShowW(false)} className="text-forest-600 hover:text-forest-300 text-xl">✕</button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-forest-400 text-xs">Withdraw amount</label>
                <span className="text-forest-200 text-xs font-mono">🌱 {wAmt}</span>
              </div>
              <input type="range" min={10} max={pos.amount} step={1}
                value={wAmt} onChange={e => setWAmt(parseInt(e.target.value))}
                className="w-full accent-green-500"/>
              <div className="flex justify-between text-forest-700 text-xs mt-0.5">
                <span>10</span><span>All ({pos.amount})</span>
              </div>
            </div>
            <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-forest-600">Safe half (×1.00)</span>
                <span className="text-forest-400 font-mono">+{wSafe}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-forest-600">Active half (×{mult.toFixed(2)})</span>
                <span className="text-forest-400 font-mono">+{wActive}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-forest-800 pt-1">
                <span className="text-forest-600">Fee ({Math.round(withdrawFeeRate(wPrincipal)*100)}%)</span>
                <span className="text-red-400/70 font-mono">−{wFee}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-forest-800 pt-1.5">
                <span className="text-forest-200">You receive</span>
                <span className={`font-mono ${wProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  🌱 {wPayout} ({wProfit >= 0 ? '+' : ''}{wProfit})
                </span>
              </div>
              {wAmt < pos.amount && (
                <p className="text-forest-700 text-xs text-center pt-0.5">
                  🌱 {pos.amount - wAmt} stays invested at ×{mult.toFixed(2)}
                </p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={doWithdraw} disabled={busy}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-red-900/50
                         text-red-400/80 hover:border-red-700 hover:text-red-300 hover:bg-red-950/20
                         transition-colors disabled:opacity-40">
              {busy ? 'Withdrawing…' : `Withdraw 🌱${wPayout} ${wAmt < pos.amount ? '(partial)' : '(full)'}`}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ── Investment modal ──────────────────────────────────────────────────────────
function InvestModal({ target, mySeeds, onDone, onClose }) {
  const [amount, setAmount]           = useState(20)
  const [withdrawAmt, setWithdrawAmt] = useState(target.myInvestment || 0)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const quickAmounts = [10, 20, 50, 100].filter(a => a <= mySeeds)

  // Live multiplier for payout preview
  const baseline = Math.max(10, target.mySeedsAtInvest || target.seeds || 10)
  const mult     = Math.min(10, Math.max(0, target.seeds / baseline))

  const boost = Math.max(1, Math.floor(amount * 0.05))

  const invest = async () => {
    if (amount < 10 || amount > mySeeds) return
    setLoading(true); setError('')
    try { await groveApi.invest(target.id, amount); onDone() }
    catch (e) { setError(e.response?.data?.error || 'Failed'); setLoading(false) }
  }

  const doWithdraw = async () => {
    setLoading(true); setError('')
    try {
      const isPartial = withdrawAmt < target.myInvestment
      await groveApi.withdraw(target.id, isPartial ? withdrawAmt : undefined)
      onDone()
    } catch (e) { setError(e.response?.data?.error || 'Failed'); setLoading(false) }
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


// ── Withdraw Modal ────────────────────────────────────────────────────────────
function WithdrawModal({ target, onDone, onClose }) {
  const [withdrawAmt, setWithdrawAmt] = useState(target.myInvestment || 0)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  const baseline = Math.max(10, target.mySeedsAtInvest || target.seeds || 10)
  const mult     = Math.min(10, Math.max(0, target.seeds / baseline))
  const wAmt     = withdrawAmt ?? target.myInvestment
  const frac     = wAmt / target.myInvestment
  const wPrincipal = Math.floor(target.myInvestment * frac)
  const wActive    = Math.floor((wPrincipal / 2) * mult)
  const wSafe      = wPrincipal - Math.floor(wPrincipal / 2)
  const wFee       = Math.floor(wActive * withdrawFeeRate(wPrincipal))
  const wPayout    = wSafe + wActive - wFee
  const wProfit    = wPayout - wPrincipal

  const doWithdraw = async () => {
    setLoading(true); setError('')
    try {
      const isPartial = withdrawAmt < target.myInvestment
      await groveApi.withdraw(target.id, isPartial ? withdrawAmt : undefined)
      onDone()
    } catch (e) { setError(e.response?.data?.error || 'Failed'); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <div>
            <h2 className="font-display text-forest-100 text-lg leading-none">Withdraw from {target.name}</h2>
            <p className="text-forest-500 text-xs mt-0.5">🌱 {target.myInvestment} invested · ×{mult.toFixed(2)} multiplier</p>
          </div>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Slider */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-forest-400 text-xs">Withdraw amount</label>
              <span className="text-forest-200 text-xs font-mono">🌱 {wAmt}</span>
            </div>
            <input type="range" min={10} max={target.myInvestment} step={1}
              value={wAmt}
              onChange={e => setWithdrawAmt(parseInt(e.target.value))}
              className="w-full accent-green-500"/>
            <div className="flex justify-between text-forest-700 text-xs mt-0.5">
              <span>10</span><span>All ({target.myInvestment})</span>
            </div>
          </div>
          {/* Breakdown */}
          <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-forest-600">Safe half (×1.00)</span>
              <span className="text-forest-400 font-mono">+{wSafe}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-forest-600">Active half (×{mult.toFixed(2)})</span>
              <span className="text-forest-400 font-mono">+{wActive}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-forest-800 pt-1">
              <span className="text-forest-600">Fee (20% of active)</span>
              <span className="text-red-400/70 font-mono">−{wFee}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t border-forest-800 pt-1.5">
              <span className="text-forest-200">You receive</span>
              <span className={`font-mono ${wProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                🌱 {wPayout} ({wProfit >= 0 ? '+' : ''}{wProfit})
              </span>
            </div>
            {wAmt < target.myInvestment && (
              <p className="text-forest-700 text-xs text-center pt-0.5">
                🌱 {target.myInvestment - wAmt} stays invested at ×{mult.toFixed(2)}
              </p>
            )}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={doWithdraw} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-red-900/50
                       text-red-400/80 hover:border-red-700 hover:text-red-300 hover:bg-red-950/20
                       transition-colors disabled:opacity-40">
            {loading ? 'Withdrawing…' : `Withdraw 🌱${wPayout} ${wAmt < target.myInvestment ? '(partial)' : '(full)'}`}
          </button>
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

      {/* Stake info + buy marker */}
      {person.myInvestment > 0 && (() => {
        const preview = computePayout(person.myInvestment, person.mySeedsAtInvest, person.seeds)
        const profit  = preview - person.myInvestment
        const sign    = profit >= 0 ? '+' : ''
        const buyPrice = person.mySeedsAtInvest || null
        return (
          <div className="mx-4 mb-2">
            {/* Buy marker ribbon */}
            {buyPrice > 0 && (
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium"
                  style={{ background: 'var(--accent-soft, rgba(74,107,79,0.15))', border: '1px solid var(--accent, #4a6b4f)', color: 'var(--accent, #4a6b4f)' }}>
                  📍 Bought at 🌱{buyPrice}
                </div>
                {person.seeds !== buyPrice && (
                  <span className={`text-xs font-mono ${person.seeds > buyPrice ? 'text-green-400' : 'text-red-400'}`}>
                    {person.seeds > buyPrice ? '▲' : '▼'} {Math.abs(person.seeds - buyPrice)} since buy
                  </span>
                )}
              </div>
            )}
            <div className="px-3 py-2 rounded-xl bg-forest-800/50 border border-forest-700">
              <div className="flex items-center justify-between">
                <span className="text-forest-400 text-xs">Your stake</span>
                <span className="text-forest-100 font-mono font-medium text-sm">🌱 {person.myInvestment}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-forest-600 text-xs">Withdraw payout</span>
                <span className={`text-xs font-mono font-medium ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  🌱 {preview} ({sign}{profit})
                </span>
              </div>
            </div>
          </div>
        )
      })()}

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
            Withdraw
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
  const [withdrawing, setWithdrawing]   = useState(null)
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

  // Refresh when server poller awards seeds (fired from LettersPage)
  useEffect(() => {
    const onUpdate = () => reload()
    window.addEventListener('seeds-updated', onUpdate)
    return () => window.removeEventListener('seeds-updated', onUpdate)
  }, [reload])

  // Auto-refresh seeds balance every 30s so sender sees update without manual refresh
  useEffect(() => {
    const iv = setInterval(() => reload(), 30000)
    return () => clearInterval(iv)
  }, [reload])

  const sorted = [...connections]
    .filter(c => sort === 'invested' ? c.myInvestment > 0 : true)
    .sort((a, b) => {
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
        {[['stocks','📈 Stocks'],['markets','📊 Markets'],['leaders','🏆 Leaders']].map(([k,l]) => (
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

        {tab === 'markets' && (
          <div className="space-y-3">
            <MarketCard market="canopy" />
            <MarketCard market="crude" />
          </div>
        )}

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
                onWithdraw={p => setWithdrawing(p)}
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
      {withdrawing && (
        <WithdrawModal
          target={withdrawing}
          onDone={() => { setWithdrawing(null); reload() }}
          onClose={() => setWithdrawing(null)}
        />
      )}
    </div>
  )
}
