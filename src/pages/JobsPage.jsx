// src/pages/JobsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { jobsApi } from '../api/client'

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

// ── Workspace placeholders (real logic added per job later) ───────────────────
function CourierWorkspace({ job }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-300 text-sm font-medium mb-1">📬 Delivery Queue</p>
        <p className="text-forest-600 text-xs">No pending deliveries. Clients can request courier delivery when sending letters.</p>
      </div>
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4 flex items-center justify-between">
        <div>
          <p className="text-forest-400 text-xs">Today's fuel cost</p>
          <p className="text-forest-200 font-mono text-sm">🌱 10/day</p>
        </div>
        <div className="text-right">
          <p className="text-forest-400 text-xs">Earnings today</p>
          <p className="text-green-400 font-mono text-sm">🌱 0</p>
        </div>
      </div>
    </div>
  )
}

function WriterWorkspace({ job }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-300 text-sm font-medium mb-1">📝 Commission Inbox</p>
        <p className="text-forest-600 text-xs">No pending commissions. Clients can hire you from the For Hire tab.</p>
      </div>
    </div>
  )
}

function BrokerWorkspace({ job }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-300 text-sm font-medium mb-1">💼 Client Wallets</p>
        <p className="text-forest-600 text-xs">No active clients. Connections can allocate seeds to your broker wallet.</p>
      </div>
    </div>
  )
}

function AccountantWorkspace({ job }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-300 text-sm font-medium mb-1">📊 Client Portfolios</p>
        <p className="text-forest-600 text-xs">No active clients. Connections can hire you for portfolio analysis.</p>
      </div>
    </div>
  )
}

function StewardWorkspace({ job }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-300 text-sm font-medium mb-1">🔔 Streak Dashboard</p>
        <p className="text-forest-600 text-xs">No active clients. Users can hire you as their Steward from For Hire.</p>
      </div>
    </div>
  )
}

function ForecasterWorkspace({ job }) {
  const [note, setNote]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [sent, setSent]   = useState(false)
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-300 text-sm font-medium mb-2">📡 Post Analysis</p>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Share your market or social analysis with subscribers..."
          className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-sm
                     text-forest-100 placeholder-forest-600 resize-none outline-none h-24 mb-2"/>
        {sent && <p className="text-green-400 text-xs mb-2">Posted to subscribers!</p>}
        <button disabled={busy || !note.trim()}
          onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); setSent(true); setNote('') }, 500) }}
          className="w-full py-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm rounded-xl transition-colors">
          {busy ? 'Posting…' : 'Post to subscribers'}
        </button>
        <p className="text-forest-700 text-xs mt-2 text-center">0 subscribers · 0 🌱 pending</p>
      </div>
    </div>
  )
}

function FarmerWorkspace({ job }) {
  // Farm plot — 5 slots, each can hold a client's seed deposit
  const slots = Array.from({ length: 5 }, (_, i) => i)
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-amber-950/40 border border-amber-900/50 p-4">
        <p className="text-amber-300 text-sm font-medium mb-3">🌾 Your Plot</p>
        <div className="grid grid-cols-5 gap-2">
          {slots.map(i => (
            <div key={i} className="aspect-square rounded-lg flex flex-col items-center justify-center
              bg-amber-950/60 border border-amber-900/40 text-xs text-amber-700">
              <span className="text-lg">🪨</span>
              <span className="text-[9px] mt-0.5">Empty</span>
            </div>
          ))}
        </div>
        <p className="text-amber-800 text-xs mt-3 text-center">Clients deposit seeds · You plant them · Harvest weekly</p>
      </div>
      <div className="rounded-xl bg-forest-900/50 border border-forest-800 p-4">
        <p className="text-forest-400 text-xs mb-1">Rate: <span className="text-forest-200 font-mono">{job?.hourly_rate} 🌱 per seed planted</span></p>
        <p className="text-forest-600 text-xs">No deposits yet. Clients pay your rate to plant a seed on your plot.</p>
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
function JobCard({ job, meta, onRate }) {
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
          <button onClick={() => onRate(job)}
            className="text-xs px-3 py-1 rounded-full border border-forest-700 text-forest-400
                       hover:border-forest-500 hover:text-forest-200 transition-colors">
            Rate
          </button>
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
                      onRate={j => setRateTarget({ job: j, role })} />
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
