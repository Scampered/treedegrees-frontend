// src/pages/GrovePage.jsx — The Grove: Seeds & Stocks
import { useState, useEffect, useCallback } from 'react'
import { groveApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Sparkline chart ───────────────────────────────────────────────────────────
function Sparkline({ data, w = 120, h = 44 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ width: w, height: h, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <p style={{ fontSize: 9, color: '#374151', fontFamily: 'monospace' }}>No data yet</p>
      </div>
    )
  }
  const vals  = data.map(d => d.seeds)
  const min   = Math.min(...vals)
  const max   = Math.max(...vals)
  const range = max - min || 1
  const pad   = 5
  const first = vals[0], last = vals[vals.length - 1]
  const rising = last >= first
  const col   = rising ? '#4ade80' : '#f87171'

  const pts = vals.map((v, i) => ({
    x: pad + (i / (vals.length - 1)) * (w - pad * 2),
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }))
  const polyline  = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaD     = `M${pts[0].x},${h} ` + pts.map(p=>`L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${h} Z`
  const last3     = vals.slice(-3)
  const diff      = last - first
  const diffStr   = (diff >= 0 ? '+' : '') + diff

  return (
    <div style={{ position:'relative' }}>
      <svg width={w} height={h}>
        <path d={areaD} fill={col} opacity="0.10"/>
        <polyline points={polyline} fill="none" stroke={col} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={col}/>
      </svg>
      <div style={{ position:'absolute', top:2, right:4, fontSize:9, color:col, fontWeight:700, fontFamily:'monospace' }}>
        {diffStr}
      </div>
    </div>
  )
}

// ── Investment modal ──────────────────────────────────────────────────────────
function InvestModal({ target, mySeeds, onDone, onClose }) {
  const [amount, setAmount] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const quickAmounts = [10, 20, 50, 100].filter(a => a <= mySeeds)

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

  const fee     = Math.floor((target.myInvestment || 0) * 0.10)
  const payout  = (target.myInvestment || 0) - fee
  const boost   = Math.max(1, Math.floor(amount * 0.05))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <div>
            <h2 className="font-display text-forest-100 text-lg leading-none">{target.name}</h2>
            <p className="text-forest-500 text-xs mt-0.5">🪴 {target.seeds} seeds · {target.investorCount} investor{target.investorCount!==1?'s':''}</p>
          </div>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current investment → withdraw */}
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

          {/* Invest */}
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
                <p className="text-forest-700 text-xs mt-1">
                  {target.name} immediately gains +{boost} seeds as a boost
                </p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={invest} disabled={loading || amount < 10 || amount > mySeeds}
                className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40
                           text-white rounded-xl font-medium transition-colors">
                {loading ? 'Investing…' : `Invest 🌱 ${amount}`}
              </button>
            </>
          )}
          {mySeeds < 10 && !target.myInvestment && (
            <p className="text-forest-600 text-sm text-center py-2">You need at least 🌱 10 seeds to invest.<br/>Earn seeds by sending letters and posting notes.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Stock card for a connection ───────────────────────────────────────────────
function StockCard({ person, mySeeds, onInvest }) {
  const rising = person.history.length >= 2 &&
    person.history[person.history.length-1]?.seeds >= person.history[0]?.seeds

  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center text-forest-100 font-bold text-sm flex-shrink-0">
          {person.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-forest-100 text-sm font-medium leading-none truncate">{person.name}</p>
          <p className="text-forest-600 text-xs mt-0.5">{person.city || person.country}</p>
        </div>
        {/* Score */}
        <div className="text-right flex-shrink-0">
          <p className={`text-base font-bold font-mono ${rising ? 'text-green-400' : 'text-red-400'}`}>
            🌱 {person.seeds}
          </p>
          <p className="text-forest-700 text-xs">{person.investorCount} investor{person.investorCount!==1?'s':''}</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="px-4 pb-2">
        <Sparkline data={person.history} w={280} h={44}/>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between px-4 pb-4 gap-2">
        <div className="text-xs text-forest-600">
          {person.myInvestment > 0
            ? <span className="text-forest-400">Your stake: <span className="text-forest-200 font-medium">🌱 {person.myInvestment}</span></span>
            : <span>Total invested: <span className="text-forest-500">🌱 {person.totalInvested}</span></span>}
        </div>
        <button onClick={() => onInvest(person)}
          className={`text-xs px-4 py-1.5 rounded-full border font-medium transition-colors
            ${person.myInvestment > 0
              ? 'border-forest-600 text-forest-300 hover:border-forest-400'
              : 'border-forest-700 text-forest-400 hover:border-forest-500 hover:text-forest-200'}`}>
          {person.myInvestment > 0 ? 'Manage' : 'Invest'}
        </button>
      </div>
    </div>
  )
}

// ── Main GrovePage ────────────────────────────────────────────────────────────
export default function GrovePage() {
  const { user } = useAuth()
  const [me, setMe]                   = useState(null)
  const [connections, setConnections] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('stocks')
  const [investing, setInvesting]     = useState(null) // person being invested in
  const [sort, setSort]               = useState('seeds') // seeds | rising | invested

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
    if (sort === 'rising')   return (b.history.slice(-1)[0]?.seeds - b.history[0]?.seeds) - (a.history.slice(-1)[0]?.seeds - a.history[0]?.seeds)
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
            <p className="text-forest-600 text-xs mt-0.5">Seeds, stocks & connection value</p>
          </div>
          {/* My seeds balance — prominent */}
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

        {/* My own sparkline */}
        {me?.history?.length >= 2 && (
          <div className="mt-3 rounded-xl bg-forest-900/40 border border-forest-800 px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-forest-500 text-xs">Your score — last {me.history.length * 3}h</span>
              <span className="text-forest-600 text-xs">{me.investorCount} investor{me.investorCount!==1?'s':''} · 🌱 {me.totalInvested} staked</span>
            </div>
            <Sparkline data={me.history} w={320} h={48}/>
          </div>
        )}
        {me && (!me.history || me.history.length < 2) && (
          <p className="text-forest-700 text-xs mt-2">Your chart will appear after your first activity. Send a letter or post a note to start earning seeds!</p>
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

        {/* ── Stocks tab ── */}
        {!loading && tab === 'stocks' && (
          <>
            {sorted.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🪴</div>
                <p className="text-forest-300 font-medium text-lg">No connections yet</p>
                <p className="text-forest-600 text-sm mt-2 max-w-xs mx-auto">
                  Add connections to see their stock cards and invest seeds in their growth.
                </p>
                <p className="text-forest-700 text-xs mt-4">Check the Guide page to learn how Seeds work →</p>
              </div>
            )}
            {sorted.map(person => (
              <StockCard
                key={person.id}
                person={person}
                mySeeds={me?.seeds || 0}
                onInvest={p => setInvesting(p)}
              />
            ))}
          </>
        )}

        {/* ── Leaderboard tab ── */}
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
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${l.isMe ? 'text-forest-200' : 'text-forest-300'} truncate`}>
                    {l.name}{l.isMe ? ' (you)' : ''}
                  </p>
                  <p className="text-forest-700 text-xs">{l.city || l.country}</p>
                </div>
                <span className="text-forest-100 font-bold font-mono text-sm">🌱 {l.seeds}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invest modal */}
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
