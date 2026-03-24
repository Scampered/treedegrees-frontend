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
  const [data, setData]   = useState(null)
  const [busy, setBusy]   = useState({})
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
      {/* Vehicle status */}
      {v && (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 flex items-center justify-between">
          <div>
            <p className="text-forest-200 text-sm font-medium">{tier?.emoji} {tier?.label}</p>
            <p className="text-forest-600 text-xs">{v.deliveries} deliveries · {tier?.speedMult}× speed</p>
          </div>
          {nextTier && (
            <p className="text-forest-600 text-xs text-right">Next: {nextTier[1].emoji} {nextTier[1].label}<br/>at {nextTier[1].minDeliveries} deliveries</p>
          )}
        </div>
      )}
      {/* Queue */}
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <p className="text-forest-300 text-sm font-medium mb-2">📬 Delivery Queue</p>
        {!data && <p className="text-forest-600 text-xs">Loading…</p>}
        {data?.queue?.length === 0 && <p className="text-forest-600 text-xs">No pending requests.</p>}
        {data?.queue?.map(req => (
          <div key={req.id} className="mb-2 p-3 rounded-lg bg-forest-800/60 border border-forest-700">
            <p className="text-forest-200 text-xs font-medium">From: {req.sender_name}</p>
            <p className="text-forest-500 text-xs">{req.from_country} → {req.to_country} · ~{req.est_hours}h · 🌱{req.fee_seeds}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => respond(req.id, 'accept')} disabled={busy[req.id]}
                className="flex-1 py-1 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs disabled:opacity-40 transition-colors">
                Accept 🌱{req.fee_seeds}
              </button>
              <button onClick={() => respond(req.id, 'decline')} disabled={busy[req.id]}
                className="flex-1 py-1 rounded-lg border border-forest-700 text-forest-500 text-xs disabled:opacity-40 hover:border-forest-500 transition-colors">
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
  const [msg, setMsg]   = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.writerCommissions(); setCommissions(r.data.commissions) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!content.trim() || content.length < 50) return setMsg('Write at least 50 characters')
    setBusy(true); setMsg('')
    try {
      await jobActionsApi.submitCommission(active.id, content)
      setMsg('Submitted!'); setActive(null); setContent(''); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {active ? (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-forest-300 text-sm font-medium">✍️ Writing commission</p>
            <button onClick={() => setActive(null)} className="text-forest-600 text-xs hover:text-forest-300">Cancel</button>
          </div>
          <div className="rounded-lg bg-forest-800/60 px-3 py-2">
            <p className="text-forest-400 text-xs">Prompt: <span className="text-forest-200">{active.prompt}</span></p>
            <p className="text-forest-600 text-xs">Fee: 🌱{active.fee_seeds} · from {active.client_name}</p>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write the letter here... (min 50 characters)"
            className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-sm
                       text-forest-100 placeholder-forest-600 resize-none outline-none h-36"/>
          <p className="text-forest-700 text-xs">{content.length} chars</p>
          {msg && <p className={`text-xs ${msg === 'Submitted!' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
          <button onClick={submit} disabled={busy || content.length < 50}
            className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors">
            {busy ? 'Submitting…' : 'Submit to client'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-300 text-sm font-medium mb-2">📝 Commission Inbox</p>
          {commissions.length === 0 && <p className="text-forest-600 text-xs">No commissions yet.</p>}
          {commissions.map(c => (
            <div key={c.id} className="mb-2 p-3 rounded-lg bg-forest-800/60 border border-forest-700">
              <p className="text-forest-200 text-xs font-medium">"{c.prompt}"</p>
              <p className="text-forest-500 text-xs">From {c.client_name} · 🌱{c.fee_seeds} · {c.status}</p>
              {c.status === 'pending' && (
                <button onClick={() => { setActive(c); setContent('') }}
                  className="mt-1.5 w-full py-1 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs transition-colors">
                  Write this
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
  const [data, setData]     = useState(null)
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.brokerSession(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const activeSession = data?.sessions?.[0]

  const invest = async (targetId, targetType) => {
    if (!activeSession) return
    setBusy(true); setMsg('')
    try {
      await jobActionsApi.brokerInvest(activeSession.id, targetId, targetType)
      setMsg('Invested!'); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  const close = async () => {
    if (!activeSession) return
    setBusy(true)
    try {
      const r = await jobActionsApi.closeBrokerSession(activeSession.id)
      setMsg(`Closed. Client gets 🌱${r.data.clientGet}, you earn 🌱${r.data.brokerCut}`); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {!data && <p className="text-forest-600 text-xs">Loading…</p>}
      {activeSession ? (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-forest-300 text-sm font-medium">Active Session</p>
            <span className="text-forest-400 text-xs">Client: {activeSession.client_name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-forest-800/60 p-2">
              <p className="text-forest-500">Escrow</p>
              <p className="text-forest-200 font-mono">🌱 {activeSession.escrow_seeds}</p>
            </div>
            <div className="rounded-lg bg-forest-800/60 p-2">
              <p className="text-forest-500">Target</p>
              <p className="text-forest-200">{activeSession.target_type || 'Not set'}</p>
            </div>
          </div>
          <p className="text-forest-600 text-xs">100% active · 5% fee · 10% profit cut</p>
          <p className="text-forest-300 text-xs font-medium mt-1">Invest in:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data?.connections?.map(c => (
              <button key={c.id} onClick={() => invest(c.id, 'grove')} disabled={busy}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-forest-800/60
                           hover:bg-forest-700 text-xs transition-colors disabled:opacity-40">
                <span className="text-forest-200">{c.name}</span>
                <span className="text-forest-400 font-mono">🌱{c.seeds}</span>
              </button>
            ))}
            <button onClick={() => invest(null, 'canopy')} disabled={busy}
              className="w-full px-2 py-1.5 rounded-lg bg-amber-950/40 border border-amber-900/40 text-amber-300 text-xs hover:bg-amber-950/60 disabled:opacity-40 transition-colors">
              🌳 Invest in Canopy
            </button>
            <button onClick={() => invest(null, 'crude')} disabled={busy}
              className="w-full px-2 py-1.5 rounded-lg bg-orange-950/40 border border-orange-900/40 text-orange-300 text-xs hover:bg-orange-950/60 disabled:opacity-40 transition-colors">
              🛢️ Invest in Crude
            </button>
          </div>
          {msg && <p className="text-xs text-green-400">{msg}</p>}
          <button onClick={close} disabled={busy}
            className="w-full py-2 rounded-xl border border-red-900/50 text-red-400/80 text-sm hover:border-red-700 hover:text-red-300 transition-colors disabled:opacity-40">
            Close & distribute returns
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-300 text-sm font-medium mb-1">🌱 Broker Dashboard</p>
          <p className="text-forest-600 text-xs">No active session. Clients hire you from For Hire.</p>
          <p className="text-forest-700 text-xs mt-1">One client at a time · 100% active · 5% fee · 10% profit</p>
        </div>
      )}
    </div>
  )
}

// ── ACCOUNTANT WORKSPACE ──────────────────────────────────────────────────────
function AccountantWorkspace({ job }) {
  const [data, setData]   = useState(null)
  const [active, setActive] = useState(null)
  const [action, setAction] = useState('hold')
  const [note, setNote]   = useState('')
  const [amt, setAmt]     = useState(0)
  const [idx, setIdx]     = useState(0)
  const [busy, setBusy]   = useState(false)
  const [msg, setMsg]     = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.accountantClients(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const sendAdvice = async () => {
    setBusy(true); setMsg('')
    try {
      await jobActionsApi.sendAdvice(active.session_id, action, amt, note, idx)
      setMsg('Advice sent!'); setActive(null); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {!data && <p className="text-forest-600 text-xs">Loading…</p>}
      {active ? (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-forest-300 text-sm font-medium">📊 Send Advice to {active.client_name}</p>
            <button onClick={() => setActive(null)} className="text-forest-600 text-xs">Cancel</button>
          </div>
          {/* Client investments (anonymised by index) */}
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {active.investments?.map((inv, i) => {
              const mult = inv.current_seeds / Math.max(1, inv.seeds_at_invest)
              const profit = Math.floor(inv.amount * mult) - inv.amount
              return (
                <button key={inv.id} onClick={() => setIdx(i)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors
                    ${idx === i ? 'bg-forest-700' : 'bg-forest-800/60 hover:bg-forest-700'}`}>
                  <span className="text-forest-400">Investment #{i + 1}</span>
                  <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                    ×{mult.toFixed(2)} ({profit >= 0 ? '+' : ''}{profit} 🌱)
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-1">
            {['buy','hold','sell'].map(a => (
              <button key={a} onClick={() => setAction(a)}
                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors
                  ${action === a ? 'bg-forest-700 text-forest-100' : 'text-forest-500 border border-forest-800 hover:border-forest-600'}`}>
                {a === 'buy' ? '📈 Buy' : a === 'hold' ? '⏸ Hold' : '📉 Sell'}
              </button>
            ))}
          </div>
          {action !== 'hold' && (
            <input type="number" value={amt} onChange={e => setAmt(parseInt(e.target.value) || 0)}
              placeholder="Amount (seeds)" className="input text-xs w-full"/>
          )}
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Your analysis..."
            maxLength={200}
            className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs
                       text-forest-100 placeholder-forest-600 resize-none outline-none h-16"/>
          {msg && <p className={`text-xs ${msg.includes('sent') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
          <button onClick={sendAdvice} disabled={busy}
            className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors">
            {busy ? 'Sending…' : `Send advice · 🌱${active.fee_seeds} fee`}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-300 text-sm font-medium mb-2">📊 Clients</p>
          {data?.clients?.length === 0 && <p className="text-forest-600 text-xs">No active clients.</p>}
          {data?.clients?.map(c => (
            <div key={c.session_id} className="mb-2 p-2 rounded-lg bg-forest-800/60 border border-forest-700">
              <div className="flex items-center justify-between">
                <p className="text-forest-200 text-xs font-medium">{c.client_name}</p>
                <p className="text-forest-500 text-xs">🌱{c.client_seeds}</p>
              </div>
              <p className="text-forest-600 text-xs">{c.investments?.length || 0} investments · fee 🌱{c.fee_seeds}</p>
              <button onClick={() => setActive(c)}
                className="mt-1.5 w-full py-1 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs transition-colors">
                View & advise
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── STEWARD WORKSPACE ─────────────────────────────────────────────────────────
function StewardWorkspace({ job }) {
  const [data, setData]   = useState(null)
  const [busy, setBusy]   = useState({})

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.stewardDashboard(); setData(r.data) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  const nudge = async (clientId) => {
    setBusy(b => ({ ...b, [clientId]: true }))
    try { await jobActionsApi.stewardNudge(clientId); alert('Nudge sent!') }
    catch (e) { alert(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [clientId]: false })) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <p className="text-forest-300 text-sm font-medium mb-2">🔔 Streak Dashboard</p>
        {!data && <p className="text-forest-600 text-xs">Loading…</p>}
        {data?.clients?.length === 0 && <p className="text-forest-600 text-xs">No active clients.</p>}
        {data?.clients?.map(c => (
          <div key={c.steward_client_id} className="mb-2 p-2 rounded-lg bg-forest-800/60 border border-forest-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-forest-300 text-xs font-medium">Client #{c.client_id.slice(-4)}</p>
              <p className="text-forest-500 text-xs">🌱{c.client_seeds}</p>
            </div>
            {c.streaks?.length === 0 && <p className="text-forest-700 text-xs">No active streaks</p>}
            {c.streaks?.map((s, i) => (
              <div key={i} className={`flex items-center justify-between text-xs mt-0.5 px-1 py-0.5 rounded
                ${s.fuel <= 1 ? 'bg-amber-950/40 border border-amber-900/40' : ''}`}>
                <span className="text-forest-400">Streak #{i+1}: 🔥{s.streak_days}d</span>
                <span className={`font-mono ${s.fuel <= 1 ? 'text-amber-400' : 'text-forest-400'}`}>⛽{s.fuel}/3</span>
              </div>
            ))}
            {c.streaks?.some(s => s.fuel <= 1) && (
              <button onClick={() => nudge(c.client_id)} disabled={busy[c.client_id]}
                className="mt-1.5 w-full py-1 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 text-xs disabled:opacity-40 transition-colors">
                ⚠️ Send streak nudge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FORECASTER WORKSPACE ──────────────────────────────────────────────────────
function ForecasterWorkspace({ job }) {
  const [posts, setPosts]   = useState([])
  const [subCount, setSub]  = useState(0)
  const [content, setContent] = useState('')
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState('')

  const load = useCallback(async () => {
    try {
      const r = await jobActionsApi.forecasterPosts(job.user_id)
      setPosts(r.data.posts); setSub(r.data.subscriberCount)
    } catch {}
  }, [job.user_id])
  useEffect(() => { load() }, [load])

  const post = async () => {
    if (!content.trim() || content.length < 10) return setMsg('Write at least 10 characters')
    setBusy(true); setMsg('')
    try {
      const r = await jobActionsApi.forecasterPost(content)
      setMsg(`Posted! Notified ${r.data.notified} subscriber(s).`)
      setContent(''); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-forest-300 text-sm font-medium">📡 Post Analysis</p>
          <span className="text-forest-500 text-xs">{subCount} subscriber{subCount !== 1 ? 's' : ''}</span>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Share your market or social forecast..."
          maxLength={500}
          className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-sm
                     text-forest-100 placeholder-forest-600 resize-none outline-none h-20 mb-2"/>
        {msg && <p className={`text-xs mb-2 ${msg.includes('Posted') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        <button onClick={post} disabled={busy || !content.trim()}
          className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors">
          {busy ? 'Posting…' : 'Post to subscribers'}
        </button>
      </div>
      {posts.length > 0 && (
        <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
          <p className="text-forest-400 text-xs font-medium mb-2">Recent posts</p>
          {posts.slice(0, 5).map(p => (
            <div key={p.id} className="mb-2 p-2 rounded-lg bg-forest-800/60 border border-forest-700">
              <p className="text-forest-200 text-xs">{p.content}</p>
              <p className="text-forest-700 text-xs mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FARMER WORKSPACE ──────────────────────────────────────────────────────────
const HARVEST_OUTCOMES = { rotten: '🪲', poor: '🥀', normal: '🌱', good: '✨', great: '🌟', bumper: '💫' }

function FarmerWorkspace({ job }) {
  const [slots, setSlots]   = useState([])
  const [planting, setPlanting] = useState(null) // slot index
  const [seeds, setSeeds]   = useState(10)
  const [busy, setBusy]     = useState({})
  const [msg, setMsg]       = useState('')

  const load = useCallback(async () => {
    try { const r = await jobActionsApi.farmerPlot(); setSlots(r.data.slots) } catch {}
  }, [])
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [load])

  const doPlant = async (slotIndex) => {
    setBusy(b => ({ ...b, [slotIndex]: true })); setMsg('')
    try {
      await jobActionsApi.farmerPlant(slotIndex, seeds)
      setMsg(`Planted 🌱${seeds} in slot ${slotIndex + 1}`); setPlanting(null); load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [slotIndex]: false })) }
  }

  const doHarvest = async (slotId, slotIndex) => {
    setBusy(b => ({ ...b, [slotIndex]: true })); setMsg('')
    try {
      const r = await jobActionsApi.farmerHarvest(slotId)
      const { outcome, result } = r.data
      setMsg(`${HARVEST_OUTCOMES[outcome]} ${outcome.charAt(0).toUpperCase()+outcome.slice(1)} harvest! Got 🌱${result}`)
      load()
    } catch (e) { setMsg(e.response?.data?.error || 'Failed') }
    finally { setBusy(b => ({ ...b, [slotIndex]: false })) }
  }

  const timeLeft = (harvestAt) => {
    const ms = new Date(harvestAt) - Date.now()
    if (ms <= 0) return 'Ready!'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-3">
      {msg && <p className="text-center text-sm font-medium" style={{ color: msg.includes('Failed') ? '#f87171' : '#4ade80' }}>{msg}</p>}
      {/* Plot grid */}
      <div className="rounded-xl bg-amber-950/30 border border-amber-900/40 p-3">
        <p className="text-amber-300 text-sm font-medium mb-3">🌾 Your Plot</p>
        <div className="grid grid-cols-5 gap-1.5">
          {slots.map(slot => {
            const isReady    = slot.status === 'ready'
            const isPlanted  = slot.status === 'planted'
            const isEmpty    = slot.status === 'empty'
            const isPlanting = planting === slot.slot_index
            return (
              <div key={slot.slot_index} className="flex flex-col items-center">
                <button
                  onClick={() => {
                    if (isReady)   doHarvest(slot.id, slot.slot_index)
                    if (isEmpty)   setPlanting(planting === slot.slot_index ? null : slot.slot_index)
                  }}
                  disabled={busy[slot.slot_index] || isPlanted}
                  className={`aspect-square w-full rounded-lg flex flex-col items-center justify-center text-xs
                    transition-all border disabled:opacity-60
                    ${isReady    ? 'bg-green-950/60 border-green-800/60 hover:bg-green-900/60 cursor-pointer' : ''}
                    ${isPlanted  ? 'bg-amber-950/60 border-amber-900/40 cursor-default' : ''}
                    ${isEmpty    ? 'bg-amber-950/20 border-amber-900/30 hover:bg-amber-950/40 cursor-pointer' : ''}
                    ${isPlanting ? 'ring-1 ring-forest-500' : ''}
                  `}>
                  <span className="text-base">{isReady ? '🌾' : isPlanted ? '🌱' : '🪨'}</span>
                  {isPlanted && <span className="text-[9px] text-amber-600 mt-0.5">{timeLeft(slot.harvest_at)}</span>}
                  {isReady    && <span className="text-[9px] text-green-400 mt-0.5">Harvest!</span>}
                  {isEmpty    && <span className="text-[9px] text-amber-800 mt-0.5">Empty</span>}
                </button>
                {isPlanting && !isReady && !isPlanted && (
                  <div className="absolute mt-1 z-10 bg-forest-950 border border-forest-700 rounded-xl p-2 shadow-xl" style={{ width: 140 }}>
                    <p className="text-forest-300 text-xs mb-1">Plant your seeds</p>
                    <input type="number" value={seeds} onChange={e => setSeeds(Math.max(1, parseInt(e.target.value)||1))}
                      className="input text-xs w-full mb-1" min={1}/>
                    <button onClick={() => doPlant(slot.slot_index)} disabled={busy[slot.slot_index]}
                      className="w-full py-1 bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs rounded-lg disabled:opacity-40 transition-colors">
                      Plant 🌱{seeds}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-amber-800 text-xs mt-2 text-center">Click empty slot to plant your own seeds · Clients can also deposit</p>
      </div>
      {/* Slot details */}
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-3">
        <p className="text-forest-400 text-xs font-medium mb-1">Harvest rate: 24h · Fee: 10% of deposit</p>
        <p className="text-forest-600 text-xs">Outcomes: 5% bumper (×2.5) · 15% great (×1.8) · 25% good (×1.4) · 33% normal (×1.1) · 14% poor (×0.5) · 8% rotten (×0)</p>
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
  const avg  = job.rating_count > 0 ? (job.rating_sum / job.rating_count) : 0
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
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <StarRating value={avg} />
            <span className="text-forest-500 text-xs">
              {job.rating_count > 0 ? `${avg.toFixed(1)} (${job.rating_count})` : 'No ratings yet'}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onHire(job)}
              className="text-xs px-3 py-1 rounded-full bg-forest-700 hover:bg-forest-600 text-forest-100 transition-colors">
              Hire
            </button>
            <button onClick={() => onRate(job)}
              className="text-xs px-3 py-1 rounded-full border border-forest-700 text-forest-400
                         hover:border-forest-500 hover:text-forest-200 transition-colors">
              Rate
            </button>
          </div>
        </div>
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


// ── Hire Modal ────────────────────────────────────────────────────────────────
function HireModal({ job, role, meta, onClose, onDone }) {
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')
  const [extra, setExtra] = useState({ seeds: 50, hours: 24, days: 7, prompt: '', fee: job.hourly_rate })

  const hire = async () => {
    setBusy(true); setErr('')
    try {
      if (role === 'courier')     await jobActionsApi.courierRequest(job.user_id)
      if (role === 'writer')      await jobActionsApi.hireWriter(job.user_id, extra.prompt, extra.fee)
      if (role === 'seed_broker') await jobActionsApi.openBrokerSession(job.user_id, extra.seeds, extra.hours)
      if (role === 'accountant')  await jobActionsApi.hireAccountant(job.user_id)
      if (role === 'steward')     await jobActionsApi.hireSteward(job.user_id, extra.days)
      if (role === 'forecaster')  await jobActionsApi.forecasterSub(job.user_id, 'subscribe')
      if (role === 'farmer')      {} // deposit handled separately in farmer plot
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
              <div>
                <label className="text-forest-400 text-xs block mb-1">Fee (🌱 seeds)</label>
                <input type="number" value={extra.fee} onChange={e => setExtra(x => ({...x, fee: parseInt(e.target.value)||5}))}
                  className="input text-sm w-full" min={5}/>
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
            <p className="text-forest-400 text-xs">Request a courier delivery. The courier sees your country and estimated route — not the content or recipient.</p>
          )}
          {role === 'accountant' && (
            <p className="text-forest-400 text-xs">Grant {job.name} read-only access to your investment portfolio. They charge 🌱{job.hourly_rate} per report.</p>
          )}
          {role === 'farmer' && (
            <p className="text-forest-400 text-xs">To deposit seeds, visit the farmer's plot directly. Ask them to share their slot availability.</p>
          )}
          {err && <p className="text-red-400 text-xs">{err}</p>}
          {role !== 'farmer' && (
            <button onClick={hire} disabled={busy}
              className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors">
              {busy ? 'Hiring…' : role === 'forecaster' ? 'Subscribe (free)' : `Hire for 🌱${role === 'steward' ? job.hourly_rate : role === 'writer' ? extra.fee : role === 'seed_broker' ? extra.seeds : job.hourly_rate}`}
            </button>
          )}
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
  const [registerRole, setRegisterRole] = useState(null)
  const [roleFilter, setRoleFilter]     = useState('all')

  const reload = useCallback(async () => {
    try {
      const [listRes, myRes] = await Promise.all([jobsApi.listings(), jobsApi.my()])
      setListings(listRes.data.listings || {})
      setMyJob(myRes.data.job)
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
                    <p className="text-forest-600 text-xs">Full job workspace coming soon. Clients can already find you in For Hire.</p>
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
