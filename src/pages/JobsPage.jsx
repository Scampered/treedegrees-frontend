// src/pages/JobsPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { jobsApi, jobActionsApi } from '../api/client'

const JOB_META = {
  courier:     { icon: '🚚', label: 'Courier',      tagline: 'Deliver letters fast',            unit: 'per delivery',  baseRate: 20, req: 'Any user' },
  writer:      { icon: '✍️',  label: 'Writer',       tagline: 'Write commissioned notes',        unit: 'per 100 chars', baseRate: 5,  req: 'Any user' },
  seed_broker: { icon: '🌱', label: 'Seed Broker',  tagline: 'Invest seeds for clients',        unit: '% of profits',  baseRate: 10, req: 'Connections only' },
  accountant:  { icon: '📊', label: 'Accountant',   tagline: 'Portfolio reports & advice',      unit: 'per report',    baseRate: 40, req: 'Any connection' },
  steward:     { icon: '🔔', label: 'Steward',       tagline: 'Protect client streaks',          unit: 'per week',      baseRate: 30, req: 'Any user' },
  forecaster:  { icon: '📡', label: 'Forecaster',   tagline: 'Post market analysis notes',      unit: 'per week/sub',  baseRate: 15, req: 'Any user' },
  farmer:      { icon: '🌾', label: 'Farmer',        tagline: 'Grow seeds from client deposits', unit: 'per seed',      baseRate: 20, req: '100 🌱 plot cost' },
}

const JOB_DETAIL = {
  courier:     'Accept delivery requests and send letters instantly on behalf of clients. Earn per delivery. Courier fuel costs scale with the oil market.',
  writer:      'Accept writing commissions. Clients set a topic and minimum word count, you write and submit. Tips up to 50% of base rate. 10% kill fee on rejections.',
  seed_broker: 'Invest a client\'s allocated seeds in the Grove on their behalf. 100% active exposure — high risk, high reward. Earn 10% of any profits on withdrawal.',
  accountant:  'Gain read-only access to client portfolios. Analyse their investments and send written reports with recommendations. 30–80 🌱 per report, weekly.',
  steward:     'Monitor client streaks. Get push-notified when a client\'s fuel hits 1. Send nudge notes and earn bonuses for every streak you save. 30 🌱/week retainer.',
  forecaster:  'Post regular market and social analysis notes to your subscribers. Subscribers pay weekly. Build a following, earn recurring passive income.',
  farmer:      'Clients deposit seeds for you to grow. Plant each deposit as a seed on your land and wait for harvest. Harvest results vary — mostly positive, but some rot.',
}

const JOB_WORKSPACE = {
  courier:     CourierWorkspace,
  writer:      WriterWorkspace,
  seed_broker: BrokerWorkspace,
  accountant:  AccountantWorkspace,
  steward:     StewardWorkspace,
  forecaster:  ForecasterWorkspace,
  farmer:      FarmerWorkspace,
}

// ── COURIER WORKSPACE ────────────────────────────────────────────────────────
function CourierWorkspace({ job }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState({})
  const load = useCallback(async () => {
    try { const r = await jobActionsApi.courierQueue(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const respond = async (id, action) => {
    setBusy(b => ({ ...b, [id]: true }))
    try { await jobActionsApi.courierRespond(id, action); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [id]: false })) }
  }
  const v = data?.vehicle
  const tier = data?.tiers?.[v?.tier]
  const nextTier = Object.entries(data?.tiers || {}).find(([,t]) => t.minDeliveries > (v?.deliveries || 0))

  return (
    <div className="space-y-3">
      {v && (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 flex items-center justify-between">
          <div>
            <p className="text-forest-200 text-sm font-medium">{tier?.emoji} {tier?.label}</p>
            <p className="text-forest-600 text-xs">{v.deliveries} deliveries · {tier?.speedMult}× speed</p>
          </div>
          {nextTier && <p className="text-forest-600 text-xs text-right">Next: {nextTier[1].emoji} {nextTier[1].label} at {nextTier[1].minDeliveries}</p>}
        </div>
      )}
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <p className="text-forest-300 text-sm font-medium mb-2">📬 Delivery Queue</p>
        {!data && <p className="text-forest-600 text-xs">Loading…</p>}
        {data?.queue?.length === 0 && <p className="text-forest-600 text-xs">No pending requests.</p>}
        {data?.queue?.map(req => (
          <div key={req.id} className="mb-2 p-3 rounded-lg bg-forest-800/60 border border-forest-700">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-forest-200 text-xs font-medium">From: {req.sender_name}</p>
              <span className="text-forest-400 text-xs font-mono">🌱{req.fee_seeds}</span>
            </div>
            <p className="text-forest-500 text-xs">{req.from_country} → {req.to_country}</p>
            {req.recipient_label && req.recipient_label !== 'Not specified' && (
              <p className="text-forest-600 text-xs">To: {req.recipient_label}</p>
            )}
            <p className="text-forest-700 text-xs">Est. {parseFloat(req.est_hours).toFixed(1)}h</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => respond(req.id, 'accept')} disabled={busy[req.id]}
                className="flex-1 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs disabled:opacity-40 transition-colors font-medium">
                ✓ Accept 🌱{req.fee_seeds}
              </button>
              <button onClick={() => respond(req.id, 'decline')} disabled={busy[req.id]}
                className="flex-1 py-1.5 rounded-lg border border-forest-700 text-forest-500 text-xs disabled:opacity-40 hover:border-forest-500 transition-colors">
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── WRITER WORKSPACE ──────────────────────────────────────────────────────────
function WriterWorkspace({ job }) {
  const [commissions, setCommissions] = useState([])
  const [active, setActive] = useState(null)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.writerCommissions(); setCommissions(r.data.commissions) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (content.length < 50) return setMsg('Write at least 50 characters')
    setBusy(true); setMsg('')
    try { await jobActionsApi.submitCommission(active.id, content); setMsg('Submitted!'); setActive(null); setContent(''); load() }
    catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  const statusColor = { pending: 'text-forest-400', submitted: 'text-yellow-400', accepted: 'text-green-400', rejected: 'text-red-400' }

  return (
    <div className="space-y-3">
      {active ? (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-forest-300 text-sm font-medium">✍️ Writing for {active.client_name}</p>
            <button onClick={() => setActive(null)} className="text-forest-600 text-xs hover:text-forest-300">Cancel</button>
          </div>
          <div className="rounded-lg bg-forest-800/60 px-3 py-2 border-l-2 border-forest-600">
            <p className="text-forest-300 text-xs font-medium">Prompt: "{active.prompt}"</p>
            <p className="text-forest-600 text-xs mt-0.5">Fee: 🌱{active.fee_seeds} — content hidden until accepted</p>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write the commissioned letter here... (min 50 chars)"
            className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-sm
                       text-forest-100 placeholder-forest-600 resize-none outline-none h-36"/>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${content.length >= 50 ? 'text-forest-500' : 'text-red-400/70'}`}>{content.length} / 50+ chars</span>
            {msg && <span className={`text-xs ${msg === 'Submitted!' ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>}
          </div>
          <button onClick={submit} disabled={busy || content.length < 50}
            className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors">
            {busy ? 'Submitting…' : 'Submit to client'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-300 text-sm font-medium mb-2">📝 Commission Inbox</p>
          {commissions.length === 0 && <p className="text-forest-600 text-xs">No commissions yet. Clients hire you from For Hire.</p>}
          {commissions.map(c => (
            <div key={c.id} className="mb-2 p-3 rounded-lg bg-forest-800/60 border border-forest-700">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-forest-200 text-xs font-medium">"{c.prompt}"</p>
                <span className={`text-xs ${statusColor[c.status] || 'text-forest-500'}`}>{c.status}</span>
              </div>
              <p className="text-forest-600 text-xs">From {c.client_name} · 🌱{c.fee_seeds}</p>
              {c.status === 'pending' && (
                <button onClick={() => { setActive(c); setContent('') }}
                  className="mt-2 w-full py-1.5 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs transition-colors font-medium">
                  ✍️ Write this
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── BROKER WORKSPACE ──────────────────────────────────────────────────────────
function BrokerWorkspace({ job }) {
  const [data, setData]   = useState(null)
  const [busy, setBusy]   = useState(false)
  const [msg, setMsg]     = useState('')
  const [chartWin, setChartWin] = useState('1d')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.brokerSession(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const sess = data?.sessions?.[0]

  const invest = async (targetId, targetType) => {
    if (!sess) return
    setBusy(true); setMsg('')
    try { await jobActionsApi.brokerInvest(sess.id, targetId, targetType); setMsg('Position set!'); load() }
    catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  const close = async () => {
    setBusy(true)
    try {
      const r = await jobActionsApi.closeBrokerSession(sess.id)
      setMsg(`Done! Client: 🌱${r.data.clientGet} · You: 🌱${r.data.brokerCut}`); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  const closeAt = sess ? new Date(sess.closes_at) : null
  const msLeft = closeAt ? closeAt - Date.now() : 0
  const timeLeft = msLeft > 0 ? (() => { const h=Math.floor(msLeft/3600000); const m=Math.floor((msLeft%3600000)/60000); return h>0?`${h}h ${m}m`:`${m}m` })() : 'Expired'

  // Calculate current return preview for active session
  const baseline = sess ? Math.max(1, parseFloat(sess.price_at_invest || 1)) : 1
  const currentVal = sess?.target_seeds || baseline
  const mult = sess?.price_at_invest ? Math.min(10, Math.max(0, currentVal / baseline)) : null

  return (
    <div className="space-y-3">
      {!data && <p className="text-forest-600 text-xs text-center py-4">Loading…</p>}
      {sess ? (
        <>
          {/* Session header */}
          <div className="rounded-xl bg-forest-900/50 border border-forest-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-forest-200 text-sm font-medium">Active Session</p>
              <span className={`text-xs font-mono ${msLeft <= 0 ? 'text-red-400' : 'text-forest-400'}`}>⏱ {timeLeft}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-forest-800/60 p-2 text-center">
                <p className="text-forest-500 mb-0.5">Client</p>
                <p className="text-forest-200 font-medium truncate">{sess.client_name}</p>
              </div>
              <div className="rounded-lg bg-forest-800/60 p-2 text-center">
                <p className="text-forest-500 mb-0.5">Escrow</p>
                <p className="text-forest-200 font-mono">🌱{sess.escrow_seeds}</p>
              </div>
              <div className="rounded-lg bg-forest-800/60 p-2 text-center">
                <p className="text-forest-500 mb-0.5">Return</p>
                {mult !== null
                  ? <p className={`font-mono ${mult >= 1 ? 'text-green-400' : 'text-red-400'}`}>×{mult.toFixed(2)}</p>
                  : <p className="text-forest-500">—</p>}
              </div>
            </div>
            <p className="text-forest-700 text-xs mt-1.5">100% active · 5% fee · you earn 10% of profits</p>
          </div>

          {/* Investment target selector */}
          <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
            <p className="text-forest-300 text-xs font-medium mb-2">Invest client escrow in:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data?.connections?.map(c => {
                const isActive = sess.target_type === 'grove' && sess.target_user_id === c.id
                return (
                  <button key={c.id} onClick={() => invest(c.id, 'grove')} disabled={busy}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40
                      ${isActive ? 'bg-forest-700 border border-forest-600' : 'bg-forest-800/60 hover:bg-forest-700'}`}>
                    <span className="text-forest-200">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-forest-400 font-mono">🌱{c.seeds}</span>
                      {isActive && <span className="text-green-400 text-[10px]">● Active</span>}
                    </div>
                  </button>
                )
              })}
              {[['canopy','🌳 The Canopy','amber'],['crude','🛢️ Crude Oil','orange']].map(([m,label,col]) => {
                const isActive = sess.target_type === m
                return (
                  <button key={m} onClick={() => invest(null, m)} disabled={busy}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-40
                      ${isActive ? `bg-${col}-950/60 border border-${col}-800/60` : `bg-${col}-950/20 hover:bg-${col}-950/40`}`}>
                    <span className={`text-${col}-300`}>{label}</span>
                    {isActive && <span className={`text-${col}-400 text-[10px]`}>● Active</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {msg && <p className={`text-xs text-center ${msg.includes('Done') ? 'text-green-400' : msg.includes('!') ? 'text-forest-300' : 'text-red-400'}`}>{msg}</p>}
          <button onClick={close} disabled={busy}
            className="w-full py-2 rounded-xl border border-red-900/50 text-red-400/80 text-sm hover:border-red-700 hover:text-red-300 transition-colors disabled:opacity-40">
            Close session & pay out
          </button>
        </>
      ) : (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4 text-center">
          <p className="text-forest-300 text-sm font-medium mb-1">🌱 Seed Broker</p>
          <p className="text-forest-600 text-xs">No active session. Clients hire you from For Hire.</p>
          <p className="text-forest-700 text-xs mt-1">One client at a time · 100% active exposure · 5% withdrawal fee · 10% of profits</p>
        </div>
      )}
    </div>
  )
}

// ── ACCOUNTANT WORKSPACE ──────────────────────────────────────────────────────
function AccountantWorkspace({ job }) {
  const [data, setData]     = useState(null)
  const [active, setActive] = useState(null)
  const [action, setAction] = useState('hold')
  const [note, setNote]     = useState('')
  const [amt, setAmt]       = useState(0)
  const [idx, setIdx]       = useState(0)
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.accountantClients(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const sendAdvice = async () => {
    setBusy(true); setMsg('')
    try { await jobActionsApi.sendAdvice(active.session_id, action, amt, note, idx); setMsg('Advice sent!'); setActive(null); load() }
    catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short' }) : '—'

  return (
    <div className="space-y-3">
      {!data && <p className="text-forest-600 text-xs text-center py-4">Loading…</p>}
      {active ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-forest-300 text-sm font-medium">📊 {active.client_name}'s Portfolio</p>
            <button onClick={() => { setActive(null); setMsg('') }} className="text-forest-600 text-xs hover:text-forest-300">← Back</button>
          </div>

          {/* Grove investments */}
          {active.investments?.length > 0 && (
            <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
              <p className="text-forest-400 text-xs font-medium mb-2">Grove Investments</p>
              {active.investments.map((inv, i) => {
                const mult   = inv.current_seeds / Math.max(1, inv.seeds_at_invest)
                const profit = Math.floor(inv.amount * mult) - inv.amount
                return (
                  <button key={inv.id} onClick={() => setIdx(i)}
                    className={`w-full p-2.5 rounded-lg mb-1.5 text-left transition-colors border
                      ${idx === i ? 'bg-forest-700 border-forest-600' : 'bg-forest-800/60 border-forest-700 hover:bg-forest-700'}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-forest-300 text-xs font-medium">Investment #{i + 1}</span>
                      <span className={`text-xs font-mono font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit} 🌱
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-forest-500">
                      <span>🌱{inv.amount} staked · ×{mult.toFixed(2)}</span>
                      <span>since {fmtDate(inv.invested_at)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Market positions */}
          {active.marketPositions?.length > 0 && (
            <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
              <p className="text-forest-400 text-xs font-medium mb-2">Market Positions</p>
              {active.marketPositions.map((mp, i) => {
                const mult   = parseFloat(mp.current_price) / Math.max(1, parseFloat(mp.price_at_invest))
                const profit = Math.floor(mp.amount * mult) - mp.amount
                const col    = mp.market === 'canopy' ? 'text-yellow-400' : 'text-orange-400'
                return (
                  <div key={i} className="p-2.5 rounded-lg mb-1.5 bg-forest-800/60 border border-forest-700">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-medium ${col}`}>{mp.market === 'canopy' ? '🌳 Canopy' : '🛢️ Crude'}</span>
                      <span className={`text-xs font-mono font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit} 🌱
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-forest-500">
                      <span>🌱{mp.amount} · ×{mult.toFixed(2)}</span>
                      <span>since {fmtDate(mp.invested_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Advice panel */}
          <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-2">
            <p className="text-forest-300 text-xs font-medium">Send Advice (once per 24h · 🌱{active.fee_seeds} fee)</p>
            {active.last_report_at && (
              <p className="text-forest-600 text-xs">Last advice: {fmtDate(active.last_report_at)}</p>
            )}
            <p className="text-forest-500 text-xs">Advising on Investment #{idx + 1}</p>
            <div className="flex gap-1">
              {['buy','hold','sell'].map(a => (
                <button key={a} onClick={() => setAction(a)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${action === a ? 'bg-forest-700 text-forest-100' : 'text-forest-500 border border-forest-800 hover:border-forest-600'}`}>
                  {a === 'buy' ? '📈 Buy' : a === 'hold' ? '⏸ Hold' : '📉 Sell'}
                </button>
              ))}
            </div>
            {action !== 'hold' && (
              <input type="number" value={amt} onChange={e => setAmt(parseInt(e.target.value) || 0)}
                placeholder="Amount (seeds)" className="input text-xs w-full"/>
            )}
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Your analysis and reasoning..."
              maxLength={200}
              className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs
                         text-forest-100 placeholder-forest-600 resize-none outline-none h-16"/>
            {msg && <p className={`text-xs ${msg.includes('sent') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
            <button onClick={sendAdvice} disabled={busy}
              className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors">
              {busy ? 'Sending…' : `Send advice · 🌱${active.fee_seeds}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-300 text-sm font-medium mb-2">📊 Client Portfolios</p>
          {data?.clients?.length === 0 && <p className="text-forest-600 text-xs">No active clients. Users hire you from For Hire.</p>}
          {data?.clients?.map(c => {
            const totalInv = (c.investments?.length || 0) + (c.marketPositions?.length || 0)
            return (
              <div key={c.session_id} className="mb-2 p-3 rounded-lg bg-forest-800/60 border border-forest-700">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-forest-200 text-sm font-medium">{c.client_name}</p>
                  <p className="text-forest-400 font-mono text-xs">🌱{c.client_seeds}</p>
                </div>
                <p className="text-forest-600 text-xs">{totalInv} position{totalInv !== 1 ? 's' : ''} · fee 🌱{c.fee_seeds}/advice</p>
                {c.pendingAdvice?.length > 0 && (
                  <p className="text-yellow-400/60 text-xs mt-0.5">{c.pendingAdvice.length} advice pending</p>
                )}
                <button onClick={() => { setActive(c); setIdx(0) }}
                  className="mt-2 w-full py-1.5 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs transition-colors font-medium">
                  View portfolio & advise →
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── STEWARD WORKSPACE ─────────────────────────────────────────────────────────
function StewardWorkspace({ job }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState({})

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.stewardDashboard(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const nudge = async (clientId) => {
    setBusy(b => ({ ...b, [clientId]: true }))
    try { await jobActionsApi.stewardNudge(clientId); load() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [clientId]: false })) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <p className="text-forest-300 text-sm font-medium mb-2">🔔 Client Streaks</p>
        {!data && <p className="text-forest-600 text-xs">Loading…</p>}
        {data?.clients?.length === 0 && <p className="text-forest-600 text-xs">No active clients. Users hire you from For Hire.</p>}
        {data?.clients?.map(c => {
          // Only show streaks with streak_days > 0
          const activeStreaks = (c.streaks || []).filter(s => s.streak_days > 0)
          const atRisk = activeStreaks.filter(s => s.fuel <= 1)
          return (
            <div key={c.steward_client_id} className="mb-3 p-3 rounded-lg bg-forest-800/60 border border-forest-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-forest-200 text-sm font-medium">{c.client_name}</p>
                <span className="text-forest-500 text-xs">🌱{c.client_seeds}</span>
              </div>
              {activeStreaks.length === 0
                ? <p className="text-forest-700 text-xs">No active streaks</p>
                : activeStreaks.map((s, i) => (
                  <div key={i} className={`flex items-center justify-between text-xs py-1 px-2 rounded mb-0.5
                    ${s.fuel <= 1 ? 'bg-amber-950/40 border border-amber-900/40' : 'bg-forest-900/40'}`}>
                    <span className="text-forest-300">🔥 {s.streak_days}d streak</span>
                    <span className={`font-mono ${s.fuel <= 1 ? 'text-amber-400 font-bold' : 'text-forest-500'}`}>⛽{s.fuel}/3</span>
                  </div>
                ))
              }
              {atRisk.length > 0 && (
                <button onClick={() => nudge(c.client_id)} disabled={busy[c.client_id]}
                  className="mt-2 w-full py-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 text-xs disabled:opacity-40 transition-colors font-medium">
                  {busy[c.client_id] ? 'Sending…' : `⚠️ Nudge ${c.client_name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── FORECASTER WORKSPACE ──────────────────────────────────────────────────────
function ForecasterWorkspace({ job }) {
  const [posts, setPosts]     = useState([])
  const [subCount, setSub]    = useState(0)
  const [content, setContent] = useState('')
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.forecasterPosts(job.user_id); setPosts(r.data.posts); setSub(r.data.subscriberCount) } catch {}
  }, [job.user_id])
  useEffect(() => { load() }, [load])

  const post = async () => {
    if (content.length < 10) return setMsg('Write at least 10 characters')
    setBusy(true); setMsg('')
    try { const r = await jobActionsApi.forecasterPost(content); setMsg(`Posted! Notified ${r.data.notified} subscriber(s).`); setContent(''); load() }
    catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-forest-300 text-sm font-medium">📡 Post Forecast</p>
          <span className="text-forest-400 text-xs">{subCount} subscriber{subCount !== 1 ? 's' : ''}</span>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Share your market or social analysis..."
          maxLength={500}
          className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-sm
                     text-forest-100 placeholder-forest-600 resize-none outline-none h-24 mb-2"/>
        {msg && <p className={`text-xs mb-2 ${msg.includes('Posted') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        <button onClick={post} disabled={busy || !content.trim()}
          className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors font-medium">
          {busy ? 'Posting…' : 'Post to subscribers'}
        </button>
      </div>
      {posts.length > 0 && (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-400 text-xs font-medium mb-2">Your recent posts</p>
          {posts.slice(0, 5).map(p => (
            <div key={p.id} className="mb-2 p-2.5 rounded-lg bg-forest-800/60 border border-forest-700">
              <p className="text-forest-200 text-xs leading-relaxed">{p.content}</p>
              <p className="text-forest-700 text-xs mt-1">{new Date(p.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FARMER WORKSPACE ──────────────────────────────────────────────────────────
const HARVEST_OUTCOMES = { rotten: { emoji: '🪲', col: 'text-red-400' }, poor: { emoji: '🥀', col: 'text-orange-400' }, normal: { emoji: '🌱', col: 'text-forest-300' }, good: { emoji: '✨', col: 'text-green-300' }, great: { emoji: '🌟', col: 'text-yellow-300' }, bumper: { emoji: '💫', col: 'text-yellow-400' } }

function FarmerWorkspace({ job }) {
  const [slots, setSlots]       = useState([])
  const [planting, setPlanting] = useState(null)
  const [seeds, setSeeds]       = useState(10)
  const [busy, setBusy]         = useState({})
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.farmerPlot(); setSlots(r.data.slots) } catch {}
  }, [])
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [load])

  const doPlant = async (slotIndex) => {
    setBusy(b => ({ ...b, [slotIndex]: true })); setMsg('')
    try {
      const r = await jobActionsApi.farmerPlant(slotIndex, seeds)
      setMsg(r.data.fromDeposit ? `Planted client deposit in slot ${slotIndex + 1}!` : `Planted 🌱${seeds} in slot ${slotIndex + 1}`)
      setPlanting(null); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [slotIndex]: false })) }
  }

  const doHarvest = async (slotId, slotIndex) => {
    setBusy(b => ({ ...b, [slotIndex]: true })); setMsg('')
    try {
      const r = await jobActionsApi.farmerHarvest(slotId)
      const { outcome, result } = r.data
      const o = HARVEST_OUTCOMES[outcome]
      setMsg(`${o.emoji} ${outcome.charAt(0).toUpperCase()+outcome.slice(1)} harvest! 🌱${result}`)
      load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [slotIndex]: false })) }
  }

  const timeLeft = (harvestAt) => {
    const ms = new Date(harvestAt) - Date.now()
    if (ms <= 0) return 'Ready!'
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  const refundTimeLeft = (plantedAt) => {
    const deadline = new Date(plantedAt).getTime() + 3600000
    const ms = deadline - Date.now()
    if (ms <= 0) return null
    const m = Math.floor(ms / 60000)
    return `${m}m to plant`
  }

  return (
    <div className="space-y-3">
      {msg && (
        <p className={`text-center text-sm font-medium py-1 rounded-lg ${msg.includes('Failed') ? 'text-red-400 bg-red-950/20' : 'text-green-400 bg-green-950/20'}`}>
          {msg}
        </p>
      )}
      <div className="rounded-2xl bg-amber-950/30 border border-amber-900/40 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-amber-300 text-sm font-medium">🌾 Your Plot</p>
          <p className="text-amber-700 text-xs">{slots.filter(s => s.status === 'planted').length}/{slots.length} planted</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {slots.map(slot => {
            const isReady     = slot.status === 'ready'
            const isPlanted   = slot.status === 'planted'
            const isDeposited = slot.status === 'deposited'
            const isEmpty     = slot.status === 'empty'
            const isSelecting = planting === slot.slot_index && isEmpty
            const refund      = isDeposited ? refundTimeLeft(slot.planted_at) : null

            return (
              <div key={slot.slot_index} className="relative flex flex-col items-center gap-1">
                <button
                  onClick={() => {
                    if (isReady)      doHarvest(slot.id, slot.slot_index)
                    if (isDeposited)  doPlant(slot.slot_index)
                    if (isEmpty)      setPlanting(planting === slot.slot_index ? null : slot.slot_index)
                  }}
                  disabled={busy[slot.slot_index] || isPlanted}
                  className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center text-xs
                    transition-all border-2 disabled:opacity-60
                    ${isReady     ? 'bg-green-950/60 border-green-700/60 hover:bg-green-900/60 cursor-pointer shadow-lg shadow-green-900/30' : ''}
                    ${isPlanted   ? 'bg-amber-950/50 border-amber-900/30 cursor-default' : ''}
                    ${isDeposited ? 'bg-blue-950/50 border-blue-800/50 hover:bg-blue-900/50 cursor-pointer' : ''}
                    ${isEmpty     ? 'bg-amber-950/20 border-amber-900/20 hover:bg-amber-950/40 cursor-pointer' : ''}
                    ${isSelecting ? 'ring-2 ring-forest-500 border-forest-600' : ''}
                  `}>
                  <span className="text-xl">
                    {isReady ? '🌾' : isPlanted ? '🌱' : isDeposited ? '💰' : '🪨'}
                  </span>
                  <span className={`text-[9px] mt-0.5 font-medium
                    ${isReady ? 'text-green-400' : isPlanted ? 'text-amber-500' : isDeposited ? 'text-blue-400' : 'text-amber-800'}`}>
                    {isReady     ? 'Harvest!' :
                     isPlanted   ? (slot.harvest_at ? timeLeft(slot.harvest_at) : '…') :
                     isDeposited ? 'Plant!' :
                     'Empty'}
                  </span>
                </button>
                {isDeposited && refund && (
                  <span className="text-[8px] text-blue-500 text-center leading-tight">{refund}</span>
                )}
                {isDeposited && !refund && (
                  <span className="text-[8px] text-red-400 text-center">Refund soon</span>
                )}
                {isDeposited && slot.depositor_name && (
                  <span className="text-[8px] text-blue-400/60 truncate w-full text-center">{slot.depositor_name}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Plant own seeds panel */}
        {planting !== null && (
          <div className="mt-3 p-3 rounded-xl bg-forest-900/60 border border-forest-700">
            <p className="text-forest-300 text-xs font-medium mb-2">Plant your own seeds in slot {(planting ?? 0) + 1}</p>
            <div className="flex gap-2">
              <input type="number" value={seeds} onChange={e => setSeeds(Math.max(1, parseInt(e.target.value)||1))}
                className="input text-sm flex-1" min={1}/>
              <button onClick={() => doPlant(planting)} disabled={busy[planting]}
                className="px-4 py-2 bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm rounded-xl disabled:opacity-40 transition-colors font-medium">
                Plant 🌱{seeds}
              </button>
              <button onClick={() => setPlanting(null)} className="px-3 py-2 text-forest-500 text-sm hover:text-forest-300">✕</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-forest-900/30 border border-forest-800 p-3">
        <p className="text-forest-500 text-xs font-medium mb-1">Harvest odds · 24h grow time</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {[['bumper','×2.5','5%','text-yellow-400'],['great','×1.8','15%','text-green-300'],['good','×1.4','25%','text-green-400'],['normal','×1.1','33%','text-forest-300'],['poor','×0.5','14%','text-orange-400'],['rotten','×0','8%','text-red-400']].map(([n,m,p,c]) => (
            <span key={n} className={`text-xs ${c}`}>{HARVEST_OUTCOMES[n].emoji} {n} {m} <span className="text-forest-700">({p})</span></span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ value, max = 5, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange && onChange(n)}
          className={`text-lg transition-transform ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}>
          <span className={(hover || value) >= n ? 'text-yellow-400' : 'text-forest-700'}>★</span>
        </button>
      ))}
    </div>
  )
}

// ── Job listing card ──────────────────────────────────────────────────────────
function JobCard({ job, meta, onRate, onHire }) {
  const avg     = job.rating_count > 0 ? (job.rating_sum / job.rating_count) : 0
  const canRate = job.has_hired && !job.has_rated
  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-800 border border-forest-700 flex items-center justify-center text-xl flex-shrink-0">
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-forest-100 font-medium text-sm">{job.name}</p>
                {job.is_connection && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest-700 text-forest-300">Connection</span>
                )}
              </div>
              <p className="text-forest-500 text-xs">{job.city}{job.country ? `, ${job.country}` : ''}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-forest-200 font-mono text-sm font-medium">🌱 {job.hourly_rate}</p>
            <p className="text-forest-600 text-xs">{meta.unit}</p>
          </div>
        </div>
        {job.bio && <p className="mt-2 text-forest-400 text-xs leading-relaxed line-clamp-2">{job.bio}</p>}

        {/* Rating row */}
        <div className="flex items-center gap-1.5 mt-2.5">
          <StarRating value={avg} />
          <span className="text-forest-500 text-xs flex-1">
            {job.rating_count > 0 ? `${avg.toFixed(1)} (${job.rating_count})` : 'No ratings yet'}
          </span>
          {/* Star rate button — only if hired and not yet rated */}
          {canRate && (
            <button onClick={() => onRate(job)} title="Leave a rating"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-950/50 border border-yellow-800/50
                         text-yellow-400 text-xs hover:bg-yellow-900/50 transition-colors">
              ★ Rate
            </button>
          )}
          {job.has_rated && (
            <span className="text-yellow-600/60 text-xs">★ Rated</span>
          )}
        </div>

        {/* Hire button — full width, more prominent */}
        <button onClick={() => onHire(job)}
          className="mt-3 w-full py-2 rounded-xl bg-forest-700 hover:bg-forest-600
                     text-forest-100 text-sm font-medium transition-colors">
          {job.has_hired ? `Hire again` : 'Hire'}
        </button>
      </div>
    </div>
  )
}

// ── Rate Modal ────────────────────────────────────────────────────────────────
function RateModal({ job, meta, onClose, onDone }) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  const submit = async () => {
    if (!rating) return setErr('Choose a star rating first')
    setBusy(true)
    try { await jobsApi.rate(job.id, rating, review); onDone() }
    catch (e) { setErr(e.response?.data?.error || 'Failed'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <div>
            <p className="text-forest-100 font-medium">Rate {job.name}</p>
            <p className="text-forest-500 text-xs">{meta.icon} {meta.label}</p>
          </div>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center py-2"><StarRating value={rating} onChange={setRating} /></div>
          <textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="Optional review..." maxLength={300}
            className="w-full bg-forest-900 border border-forest-700 rounded-xl px-3 py-2 text-sm
                       text-forest-100 placeholder-forest-600 resize-none outline-none h-20"/>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button onClick={submit} disabled={busy || !rating}
            className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors">
            {busy ? 'Saving…' : 'Submit rating'}
          </button>
        </div>
      </div>
    </div>
  )
}




// ── My Advice Panel (client sees accountant advice) ──────────────────────────
// ── My Services Panel — all hired job responses in one place ────────────────
function MyServicesPanel({ commissions, advice, onRefresh }) {
  const [filter, setFilter] = useState('all')
  const [busy, setBusy]     = useState({})
  const [copied, setCopied] = useState({})

  const actionColor = { buy: 'text-green-400', hold: 'text-forest-300', sell: 'text-red-400' }
  const actionIcon  = { buy: '📈', hold: '⏸', sell: '📉' }
  const statusColor = { pending: 'text-forest-500', submitted: 'text-yellow-400', accepted: 'text-green-400', rejected: 'text-red-400' }
  const fmtDate     = d => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })

  const resolve = async (id, action) => {
    setBusy(b => ({...b, [id]: true}))
    try { await jobActionsApi.resolveCommission(id, action); onRefresh() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({...b, [id]: false})) }
  }

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(b => ({...b, [id]: true}))
      setTimeout(() => setCopied(b => ({...b, [id]: false})), 2000)
    })
  }

  // Build unified item list sorted newest first
  const items = [
    ...(commissions || []).map(c => ({ ...c, _type: 'writer', _date: new Date(c.created_at) })),
    ...(advice?.advice || []).map(a => ({ ...a, _type: 'accountant', _date: new Date(a.created_at) })),
  ].sort((a, b) => b._date - a._date)

  const filters = ['all', 'writer', 'accountant']
  const filtered = filter === 'all' ? items : items.filter(i => i._type === filter)

  if (items.length === 0) return (
    <div className="text-center py-8">
      <p className="text-forest-600 text-sm">No service responses yet.</p>
      <p className="text-forest-700 text-xs mt-1">Hire workers from the For Hire listings.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Portfolio summary (for accountant tab) */}
      {(advice?.investments?.length > 0 || advice?.markets?.length > 0) && (filter === 'all' || filter === 'accountant') && (
        <div className="rounded-xl bg-forest-900/40 border border-forest-800 p-3">
          <p className="text-forest-400 text-xs font-medium mb-2">Your Portfolio</p>
          {advice.investments?.map(inv => {
            const mult = inv.current_seeds / Math.max(1, inv.seeds_at_invest)
            const profit = Math.floor(inv.amount * mult) - inv.amount
            return (
              <div key={inv.id} className="flex items-center justify-between py-1 text-xs border-b border-forest-800/40 last:border-0">
                <span className="text-forest-300">{inv.name}</span>
                <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>×{mult.toFixed(2)} ({profit>=0?'+':''}{profit} 🌱)</span>
              </div>
            )
          })}
          {advice.markets?.map((m, i) => {
            const mult = parseFloat(m.current_price) / Math.max(1, parseFloat(m.price_at_invest))
            const profit = Math.floor(m.amount * mult) - m.amount
            return (
              <div key={i} className="flex items-center justify-between py-1 text-xs">
                <span className={m.market === 'canopy' ? 'text-yellow-400' : 'text-orange-400'}>{m.market === 'canopy' ? '🌳 Canopy' : '🛢️ Crude'}</span>
                <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>×{mult.toFixed(2)} ({profit>=0?'+':''}{profit} 🌱)</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter pills */}
      {items.length > 1 && (
        <div className="flex gap-1.5">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${filter===f ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
              {f === 'all' ? 'All' : f === 'writer' ? '✍️ Letters' : '📊 Advice'}
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      {filtered.map(item => {
        if (item._type === 'writer') {
          const c = item
          return (
            <div key={`w-${c.id}`} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-forest-300 text-xs font-medium uppercase tracking-wide mb-0.5">✍️ Writer · {c.writer_name}</p>
                  <p className="text-forest-200 text-sm font-medium">"{c.prompt}"</p>
                  <p className="text-forest-600 text-xs">🌱{c.fee_seeds} · {fmtDate(c.created_at)}</p>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${statusColor[c.status]}`}>{c.status}</span>
              </div>

              {c.status === 'submitted' && c.content && (
                <>
                  <div className="rounded-xl bg-forest-950/60 border border-forest-700 p-3 mb-2"
                    onCopy={e => e.preventDefault()}>
                    <p className="text-forest-300 text-sm leading-relaxed"
                      style={{ userSelect:'none', WebkitUserSelect:'none', MozUserSelect:'none' }}>
                      {c.content}
                    </p>
                  </div>
                  <p className="text-forest-600 text-xs mb-2">Accept to unlock copy · 15% kill fee on reject</p>
                  <div className="flex gap-2">
                    <button onClick={() => resolve(c.id, 'accept')} disabled={busy[c.id]}
                      className="flex-1 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm font-medium disabled:opacity-40 transition-colors">
                      ✓ Accept
                    </button>
                    <button onClick={() => resolve(c.id, 'reject')} disabled={busy[c.id]}
                      className="flex-1 py-2 rounded-xl border border-red-900/50 text-red-400/80 text-sm hover:border-red-700 disabled:opacity-40 transition-colors">
                      ✗ Reject
                    </button>
                  </div>
                </>
              )}
              {c.status === 'accepted' && c.content && (
                <div className="rounded-xl bg-green-950/20 border border-green-900/40 p-3">
                  <p className="text-forest-200 text-sm leading-relaxed mb-2">{c.content}</p>
                  <button onClick={() => copy(c.id, c.content)}
                    className="w-full py-1.5 rounded-lg bg-green-950/40 border border-green-900/50 text-green-400 text-xs font-medium hover:bg-green-900/40 transition-colors">
                    {copied[c.id] ? '✓ Copied!' : '📋 Copy letter'}
                  </button>
                </div>
              )}
              {c.status === 'pending' && <p className="text-forest-600 text-xs">Waiting for writer to complete…</p>}
              {c.status === 'rejected' && <p className="text-red-400/60 text-xs">Rejected · partial refund sent</p>}
            </div>
          )
        }

        if (item._type === 'accountant') {
          const a = item
          const inv = advice?.investments?.find(i => parseInt(i.idx) === a.investment_idx)
          return (
            <div key={`a-${a.id}`} className={`rounded-2xl border p-4 ${!a.read_at ? 'bg-forest-800/50 border-forest-600' : 'bg-forest-900/30 border-forest-800'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-forest-300 text-xs font-medium uppercase tracking-wide mb-0.5">📊 Accountant's Analysis · {a.accountant_name}</p>
                  {inv && <p className="text-forest-500 text-xs">Re: {inv.name}</p>}
                  <p className="text-forest-600 text-xs">{fmtDate(a.created_at)}</p>
                </div>
                {!a.read_at && <span className="text-[10px] text-forest-100 bg-forest-700 px-1.5 py-0.5 rounded-full flex-shrink-0">New</span>}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{actionIcon[a.action]}</span>
                <div>
                  <p className={`text-sm font-bold ${actionColor[a.action]}`}>
                    {a.action === 'buy' ? 'Increase shares' : a.action === 'sell' ? 'Decrease shares' : 'Hold position'}
                    {inv ? ` for ${inv.name}` : ''}
                    {a.amount > 0 ? ` · 🌱${a.amount}` : ''}
                  </p>
                </div>
              </div>
              {a.note && (
                <div className="rounded-lg bg-forest-900/60 px-3 py-2 border-l-2 border-forest-600">
                  <p className="text-forest-300 text-xs italic leading-relaxed">"{a.note}"</p>
                </div>
              )}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

// ── Hire Modal ────────────────────────────────────────────────────────────────
function HireModal({ job, role, meta, onClose, onDone }) {
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')
  const [extra, setExtra]       = useState({ seeds: 50, hours: 24, days: 7, prompt: '', fee: job.hourly_rate, recipientId: '' })
  const [connections, setConns] = useState([])

  useEffect(() => {
    if (role === 'courier') {
      import('../api/client').then(({ friendsApi }) => {
        friendsApi.list?.().then(r => setConns(r.data?.friends || r.data || [])).catch(() => {})
      }).catch(() => {})
    }
  }, [role])

  const hire = async () => {
    setBusy(true); setErr('')
    try {
      if (role === 'courier')     await jobActionsApi.courierRequest(job.user_id, extra.recipientId)
      if (role === 'writer')      await jobActionsApi.hireWriter(job.user_id, extra.prompt, job.hourly_rate)
      if (role === 'seed_broker') await jobActionsApi.openBrokerSession(job.user_id, extra.seeds, extra.hours)
      if (role === 'accountant')  await jobActionsApi.hireAccountant(job.user_id)
      if (role === 'steward')     await jobActionsApi.hireSteward(job.user_id, extra.days)
      if (role === 'forecaster')  await jobActionsApi.forecasterSub(job.user_id, 'subscribe')
      if (role === 'farmer')      await jobActionsApi.farmerDeposit(job.user_id, extra.seeds)
      onDone()
    } catch (e) { setErr(e.response?.data?.error || 'Failed'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className="text-forest-100 font-medium">Hire {job.name}</p>
              <p className="text-forest-500 text-xs">{meta.label} · 🌱{job.hourly_rate} {meta.unit}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {role === 'writer' && (
            <>
              <div>
                <label className="text-forest-400 text-xs block mb-1">Your prompt</label>
                <input value={extra.prompt} onChange={e => setExtra(x => ({...x, prompt: e.target.value}))}
                  placeholder="e.g. love letter, apology, thank you..." className="input text-sm w-full"/>
              </div>
              <div className="rounded-lg bg-forest-800/60 px-3 py-2">
                <p className="text-forest-400 text-xs">Commission fee</p>
                <p className="text-forest-200 text-sm font-medium font-mono">🌱{job.hourly_rate} <span className="text-forest-500 font-normal text-xs">(fixed rate)</span></p>
              </div>
            </>
          )}
          {role === 'seed_broker' && (
            <>
              <div>
                <label className="text-forest-400 text-xs block mb-1">Seeds to allocate</label>
                <input type="number" value={extra.seeds} onChange={e => setExtra(x => ({...x, seeds: parseInt(e.target.value)||10}))}
                  className="input text-sm w-full" min={10} max={500}/>
              </div>
              <div>
                <label className="text-forest-400 text-xs block mb-1">Session duration</label>
                <div className="flex gap-1 flex-wrap">
                  {[1,3,12,24,72,168].map(h => (
                    <button key={h} onClick={() => setExtra(x => ({...x, hours: h}))}
                      className={`px-2 py-1 rounded-lg text-xs border transition-colors
                        ${extra.hours === h ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500'}`}>
                      {h < 24 ? `${h}h` : `${h/24}d`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-forest-600 text-xs">100% active exposure · 5% fee · 10% broker cut from profits</p>
            </>
          )}
          {role === 'steward' && (
            <div>
              <label className="text-forest-400 text-xs block mb-1">Retainer period</label>
              <div className="flex gap-1">
                {[3,7,14].map(d => (
                  <button key={d} onClick={() => setExtra(x => ({...x, days: d}))}
                    className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors
                      ${extra.days === d ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500'}`}>
                    {d} days
                  </button>
                ))}
              </div>
              <p className="text-forest-600 text-xs mt-1">🌱{job.hourly_rate} charged now for {extra.days} days</p>
            </div>
          )}
          {role === 'forecaster' && (
            <p className="text-forest-400 text-xs">Subscribe for free. Get push notifications for every forecast post from {job.name}.</p>
          )}
          {role === 'courier' && (
            <div>
              <label className="text-forest-400 text-xs block mb-1">Who should receive this delivery?</label>
              <select value={extra.recipientId} onChange={e => setExtra(x => ({...x, recipientId: e.target.value}))}
                className="input text-sm w-full">
                <option value="">Select a connection…</option>
                {connections.map(c => (
                  <option key={c.id || c.user_id} value={c.id || c.user_id}>
                    {c.nickname || c.displayName || c.full_name}
                  </option>
                ))}
              </select>
              <p className="text-forest-600 text-xs mt-1">The courier only sees your country → their country. Content stays private.</p>
            </div>
          )}
          {role === 'accountant' && (
            <p className="text-forest-400 text-xs">Grant {job.name} read-only access to your investment portfolio. They charge 🌱{job.hourly_rate} per report.</p>
          )}
          {role === 'farmer' && (
            <div>
              <label className="text-forest-400 text-xs block mb-1">Seeds to deposit</label>
              <input type="number" value={extra.seeds} onChange={e => setExtra(x => ({...x, seeds: Math.max(1, parseInt(e.target.value)||1)}))}
                className="input text-sm w-full" min={1}/>
              <p className="text-forest-600 text-xs mt-1">Farmer has 1h to plant. If unplanted, full refund.</p>
            </div>
          )}
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button onClick={hire} disabled={busy}
              className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors">
            {busy ? 'Hiring…' : role === 'forecaster' ? 'Subscribe (free)' : role === 'farmer' ? `Deposit 🌱${extra.seeds}` : `Hire for 🌱${role === 'steward' ? job.hourly_rate : role === 'writer' ? extra.fee : role === 'seed_broker' ? extra.seeds : job.hourly_rate}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Register Modal — opens directly for a specific job ────────────────────────
function RegisterModal({ role, meta, detail, onClose, onDone }) {
  const [bio, setBio]     = useState('')
  const [rate, setRate]   = useState(meta.baseRate)
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')
  const [done, setDone]   = useState(false)

  const submit = async () => {
    setBusy(true); setErr('')
    try { await jobsApi.register(role, bio, rate); setDone(true) }
    catch (e) { setErr(e.response?.data?.error || 'Failed'); setBusy(false) }
  }

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 p-6 text-center">
        <div className="text-5xl mb-3">{meta.icon}</div>
        <p className="text-forest-100 font-display text-xl mb-1">You're registered!</p>
        <p className="text-forest-300 text-sm mb-1">You are now listed as a <strong>{meta.label}</strong>.</p>
        <p className="text-forest-500 text-xs mb-4">Full job workspace is coming soon. Clients can already find and rate you in For Hire.</p>
        <button onClick={onDone}
          className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 text-white rounded-xl font-medium text-sm transition-colors">
          Go to My Job →
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className="text-forest-100 font-medium">Register as {meta.label}</p>
              <p className="text-forest-500 text-xs">{meta.tagline}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-forest-900/50 border border-forest-800 px-4 py-3 space-y-1.5">
            <p className="text-forest-300 text-xs leading-relaxed">{detail}</p>
            <p className="text-forest-600 text-xs">Requirements: <span className="text-forest-400">{meta.req}</span></p>
          </div>
          <div>
            <label className="text-forest-400 text-xs block mb-1">
              Your rate ({role === 'seed_broker' ? '% of profits' : role === 'farmer' ? '🌱 per seed' : '🌱 seeds'})
            </label>
            <input type="number" value={rate} onChange={e => setRate(Math.max(1, parseInt(e.target.value) || 1))}
              className="input text-sm w-full"/>
          </div>
          <div>
            <label className="text-forest-400 text-xs block mb-1">Bio / pitch <span className="text-forest-700">(optional)</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell clients why they should hire you..."
              maxLength={200}
              className="w-full bg-forest-900 border border-forest-700 rounded-xl px-3 py-2 text-sm
                         text-forest-100 placeholder-forest-600 resize-none outline-none h-20"/>
          </div>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button onClick={submit} disabled={busy}
            className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40
                       text-white rounded-xl font-medium text-sm transition-colors">
            {busy ? 'Registering…' : `Register as ${meta.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main JobsPage ─────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [tab, setTab]           = useState('hire')
  const [listings, setListings] = useState({})
  const [myJob, setMyJob]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [rateTarget, setRateTarget]     = useState(null)
  const [hireTarget, setHireTarget]       = useState(null)
  const [myCommissions, setMyCommissions]   = useState([])
  const [myAdvice, setMyAdvice]             = useState(null)
  const [showMyHires, setShowMyHires]       = useState(false)
  const [myHiresTab, setMyHiresTab]         = useState('writer')
  const [registerRole, setRegisterRole] = useState(null)
  const [roleFilter, setRoleFilter]     = useState('all')

  const reload = useCallback(async () => {
    try {
      const [listRes, myRes, commRes] = await Promise.all([jobsApi.listings(), jobsApi.my(), jobActionsApi.myCommissions().catch(()=>({data:{commissions:[]}}))])
      setListings(listRes.data.listings || {})
      setMyJob(myRes.data.job)
      setMyCommissions(commRes.data.commissions || [])
      // Also load accountant advice
      jobActionsApi.myAdvice().then(r => setMyAdvice(r.data)).catch(() => {})
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const doUnregister = async () => {
    if (!window.confirm('Unregister from your job?')) return
    try { await jobsApi.unregister(); reload() }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
  }

  const allRoles   = Object.keys(JOB_META)
  const filtered   = roleFilter === 'all'
    ? Object.entries(listings)
    : Object.entries(listings).filter(([r]) => r === roleFilter)

  const WorkspaceComp = myJob ? JOB_WORKSPACE[myJob.role] : null

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-2xl text-forest-50">💼 Jobs</h1>
            <p className="text-forest-600 text-xs mt-0.5">Services, work & earnings</p>
          </div>
          {myJob && (
            <div className="px-3 py-1.5 rounded-xl bg-forest-800 border border-forest-700">
              <p className="text-forest-200 text-xs font-medium">
                {JOB_META[myJob.role]?.icon} {JOB_META[myJob.role]?.label}
              </p>
            </div>
          )}
        </div>

        {/* Toggle pill */}
        <div className="flex rounded-xl bg-forest-900 border border-forest-800 p-0.5 gap-0.5">
          {[['hire','🏪 For Hire'],['my','👤 My Job']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                ${tab === k ? 'bg-forest-700 text-forest-100 shadow-sm' : 'text-forest-500 hover:text-forest-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── FOR HIRE ── */}
        {tab === 'hire' && (
          <div className="p-4 space-y-4">

            {/* My hires toggle */}
            {(myCommissions.length > 0 || (myAdvice?.advice?.length > 0)) && (
              <button onClick={() => setShowMyHires(s => !s)}
                className={`w-full py-2 rounded-xl text-sm font-medium border transition-colors
                  ${showMyHires ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-700 text-forest-400 hover:border-forest-500'}`}>
                {showMyHires ? '← Back to listings' : `📬 Service Responses (${myCommissions.length + (myAdvice?.advice?.length || 0)})`}
              </button>
            )}

            {showMyHires && (
              <MyServicesPanel
                commissions={myCommissions}
                advice={myAdvice}
                onRefresh={reload}
              />
            )}

            {/* Listings (hidden when my hires panel is open) */}
            {!showMyHires && (
              <>
                {/* Role filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button onClick={() => setRoleFilter('all')}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                      ${roleFilter === 'all' ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
                    All
                  </button>
                  {allRoles.map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                        ${roleFilter === r ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
                      {JOB_META[r].icon} {JOB_META[r].label}
                    </button>
                  ))}
                </div>

                {loading && <p className="text-forest-600 text-sm text-center py-12">Loading…</p>}

                {!loading && filtered.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-5xl mb-4">💼</p>
                    <p className="text-forest-300 font-medium">No workers listed yet</p>
                    <p className="text-forest-600 text-sm mt-1">Be the first — register a job on My Job tab</p>
                    <button onClick={() => setTab('my')}
                      className="mt-4 px-4 py-2 bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm rounded-xl transition-colors">
                      Register a job →
                    </button>
                  </div>
                )}

                {filtered.map(([role, workers]) => (
                  <div key={role}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{JOB_META[role].icon}</span>
                      <p className="text-forest-300 font-medium text-sm">{JOB_META[role].label}</p>
                      <span className="text-forest-700 text-xs">({workers.length})</span>
                      <p className="text-forest-600 text-xs ml-auto">{JOB_META[role].tagline}</p>
                    </div>
                    <div className="space-y-2">
                      {workers.map(job => (
                        <JobCard key={job.id} job={job} meta={JOB_META[role]}
                          onRate={j => setRateTarget({ job: j, role })}
                          onHire={j => setHireTarget({ job: j, role })} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── MY JOB ── */}
        {tab === 'my' && (
          <div className="p-4 space-y-4">
            {loading && <p className="text-forest-600 text-sm text-center py-12">Loading…</p>}

            {/* Unemployed — show all job listings */}
            {!loading && !myJob && (
              <>
                <p className="text-forest-400 text-sm text-center pt-2">Pick a job to start earning seeds.</p>
                <div className="space-y-3">
                  {allRoles.map(role => {
                    const m = JOB_META[role]
                    return (
                      <div key={role}
                        className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl mt-0.5">{m.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-forest-100 font-medium">{m.label}</p>
                              <span className="text-forest-300 font-mono text-xs flex-shrink-0">
                                🌱 {m.baseRate} {m.unit}
                              </span>
                            </div>
                            <p className="text-forest-500 text-xs leading-relaxed mb-2">{JOB_DETAIL[role]}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-forest-700 text-xs">Requirements: <span className="text-forest-500">{m.req}</span></span>
                              <button onClick={() => setRegisterRole(role)}
                                className="text-xs px-3 py-1.5 rounded-full bg-forest-700 hover:bg-forest-600
                                           text-forest-100 transition-colors font-medium">
                                Register
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Employed — show job card + workspace */}
            {!loading && myJob && (() => {
              const m = JOB_META[myJob.role]
              const avg = myJob.rating_count > 0 ? (myJob.rating_sum / myJob.rating_count).toFixed(1) : null
              return (
                <>
                  {/* Job header card */}
                  <div className="rounded-2xl border border-forest-600 bg-forest-900/60 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{m.icon}</span>
                      <div className="flex-1">
                        <p className="text-forest-100 font-display text-lg leading-none">{m.label}</p>
                        <p className="text-forest-500 text-xs mt-0.5">{m.tagline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-forest-200 font-mono font-bold">🌱 {myJob.hourly_rate}</p>
                        <p className="text-forest-600 text-xs">{m.unit}</p>
                      </div>
                    </div>
                    {myJob.bio && <p className="text-forest-400 text-xs italic mb-3">"{myJob.bio}"</p>}
                    <div className="flex items-center justify-between border-t border-forest-800 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <StarRating value={avg ? parseFloat(avg) : 0} />
                        <span className="text-forest-500 text-xs">
                          {avg ? `${avg} (${myJob.rating_count})` : 'No ratings yet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registered notice */}
                  <div className="rounded-2xl bg-forest-900/30 border border-forest-800 p-4 text-center">
                    <p className="text-forest-200 text-sm font-medium mb-0.5">
                      You are registered as a <span className="text-forest-100">{JOB_META[myJob.role]?.label}</span> {JOB_META[myJob.role]?.icon}
                    </p>

                  </div>

                  {/* Workspace */}
                  {WorkspaceComp && <WorkspaceComp job={myJob} />}

                  {/* Resign button */}
                  <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-red-400/80 text-sm font-medium">Resign from job</p>
                      <p className="text-red-900/60 text-xs">You can re-register at any time</p>
                    </div>
                    <button onClick={doUnregister}
                      className="px-4 py-1.5 rounded-lg border border-red-900/50 text-red-400/70
                                 hover:border-red-700 hover:text-red-300 hover:bg-red-950/20 text-sm transition-colors">
                      Resign
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Rate Modal */}
      {rateTarget && (
        <RateModal job={rateTarget.job} meta={JOB_META[rateTarget.role]}
          onClose={() => setRateTarget(null)}
          onDone={() => { setRateTarget(null); reload() }} />
      )}


      {/* Hire Modal */}
      {hireTarget && (
        <HireModal
          job={hireTarget.job} role={hireTarget.role} meta={JOB_META[hireTarget.role]}
          onClose={() => setHireTarget(null)}
          onDone={() => { setHireTarget(null); reload() }} />
      )}

      {/* Register Modal — opens directly for the clicked job */}
      {registerRole && (
        <RegisterModal
          role={registerRole}
          meta={JOB_META[registerRole]}
          detail={JOB_DETAIL[registerRole]}
          onClose={() => setRegisterRole(null)}
          onDone={() => { setRegisterRole(null); reload(); setTab('my') }} />
      )}
    </div>
  )
}
