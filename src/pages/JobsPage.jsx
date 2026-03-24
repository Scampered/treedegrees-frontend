// src/pages/JobsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { jobsApi } from '../api/client'

const JOB_DESCRIPTIONS = {
  courier:     { pay: '~20 🌱 per delivery',  req: 'Any user',           detail: 'Deliver letters instantly on behalf of clients. Earn per delivery. Oil price affects your fuel costs.' },
  writer:      { pay: '~1 🌱 per 20 chars',   req: 'Any user',           detail: 'Accept writing commissions. Clients set a topic, you write it. Tips available up to 50% of base rate.' },
  seed_broker: { pay: '10% of client profits', req: 'Connections only',  detail: 'Invest seeds for clients using the Grove. Full market exposure — 100% active stake. High risk, high reward.' },
  accountant:  { pay: '30–80 🌱 per report',  req: 'Any connection',     detail: 'Review client portfolios and send written advice. Read-only access. One report per client per week.' },
  steward:     { pay: '30 🌱/week + bonuses',  req: 'Any user',           detail: 'Monitor client streaks. Get notified when streaks are at risk. Earn bonuses for every streak saved.' },
  forecaster:  { pay: '5–25 🌱/week per sub',  req: 'Any user',           detail: 'Post market analysis and social notes. Subscribers pay weekly. Build a following, earn recurring income.' },
  farmer:      { pay: 'Lower fees (10%)',       req: '100 🌱 plot cost',   detail: 'Invest in up to 5 connections simultaneously. Harvest weekly windows only — patience rewarded with lower fees.' },
}

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

function JobCard({ job, meta, onRate }) {
  const avg    = job.avgRating
  const count  = job.rating_count
  const isConn = job.is_connection

  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-800 border border-forest-700 flex items-center justify-center text-xl flex-shrink-0">
              {meta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-forest-100 font-medium text-sm">{job.name}</p>
                {isConn && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest-700 text-forest-300">1st degree</span>}
              </div>
              <p className="text-forest-500 text-xs">{job.city}{job.country ? `, ${job.country}` : ''}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-forest-200 font-mono text-sm font-medium">{job.hourly_rate} 🌱</p>
            <p className="text-forest-600 text-xs">{meta.unit}</p>
          </div>
        </div>

        {job.bio && (
          <p className="mt-2.5 text-forest-400 text-xs leading-relaxed line-clamp-2">{job.bio}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <StarRating value={avg || 0} />
            <span className="text-forest-500 text-xs">
              {avg ? `${avg} (${count})` : 'No ratings yet'}
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

function RateModal({ job, meta, onClose, onDone }) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  const submit = async () => {
    if (!rating) return setErr('Choose a rating')
    setBusy(true); setErr('')
    try {
      await jobsApi.rate(job.id, rating, review)
      onDone()
    } catch (e) { setErr(e.response?.data?.error || 'Failed'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <p className="text-forest-100 font-medium">Rate {job.name} — {meta.label}</p>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="Optional review (max 300 chars)..."
            maxLength={300}
            className="w-full bg-forest-900 border border-forest-700 rounded-xl px-3 py-2 text-sm
                       text-forest-100 placeholder-forest-600 resize-none outline-none h-20"/>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button onClick={submit} disabled={busy || !rating}
            className="w-full py-2.5 bg-forest-600 hover:bg-forest-500 disabled:opacity-40
                       text-white rounded-xl font-medium text-sm transition-colors">
            {busy ? 'Saving…' : 'Submit rating'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RegisterModal({ onClose, onDone }) {
  const [step, setStep]       = useState(1) // 1=pick role, 2=set details
  const [role, setRole]       = useState(null)
  const [bio, setBio]         = useState('')
  const [rate, setRate]       = useState('')
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')
  const [meta, setMeta]       = useState(null)

  const pickRole = (r, m) => { setRole(r); setMeta(m); setRate(m.baseRate); setStep(2) }

  const submit = async () => {
    setBusy(true); setErr('')
    try {
      await jobsApi.register(role, bio, rate)
      onDone()
    } catch (e) { setErr(e.response?.data?.error || 'Failed'); setBusy(false) }
  }

  const roles = [
    ['courier','🚚','Courier','Deliver letters fast'],
    ['writer','✍️','Writer','Write on commission'],
    ['seed_broker','🌱','Seed Broker','Invest for clients'],
    ['accountant','📊','Accountant','Portfolio reports'],
    ['steward','🔔','Steward','Protect streaks'],
    ['forecaster','📡','Forecaster','Market analysis'],
    ['farmer','🌾','Farmer','Multi-invest'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <p className="text-forest-100 font-medium">
            {step === 1 ? 'Choose a job' : `Register as ${meta?.label}`}
          </p>
          <button onClick={onClose} className="text-forest-600 hover:text-forest-300 text-xl leading-none">✕</button>
        </div>

        {step === 1 && (
          <div className="p-3 grid grid-cols-2 gap-2">
            {roles.map(([r, icon, label, tagline]) => (
              <button key={r} onClick={() => pickRole(r, { baseRate: JOB_DESCRIPTIONS[r] ? 20 : 20, label, icon })}
                className="p-3 rounded-xl border border-forest-700 hover:border-forest-500 hover:bg-forest-900
                           text-left transition-colors group">
                <span className="text-2xl block mb-1">{icon}</span>
                <p className="text-forest-200 text-xs font-medium">{label}</p>
                <p className="text-forest-600 text-[10px] mt-0.5 group-hover:text-forest-500">{tagline}</p>
              </button>
            ))}
          </div>
        )}

        {step === 2 && meta && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-forest-900/50 border border-forest-800 px-4 py-3">
              <p className="text-forest-300 text-xs leading-relaxed">{JOB_DESCRIPTIONS[role]?.detail}</p>
              <p className="text-forest-500 text-xs mt-1.5">Estimated pay: <span className="text-forest-300">{JOB_DESCRIPTIONS[role]?.pay}</span></p>
            </div>
            <div>
              <label className="text-forest-400 text-xs block mb-1">Your rate ({role === 'seed_broker' ? '% of profits' : '🌱 seeds'})</label>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)}
                className="input text-sm w-full"/>
            </div>
            <div>
              <label className="text-forest-400 text-xs block mb-1">Bio / pitch (optional)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                placeholder="Tell clients why they should hire you..."
                maxLength={200}
                className="w-full bg-forest-900 border border-forest-700 rounded-xl px-3 py-2 text-sm
                           text-forest-100 placeholder-forest-600 resize-none outline-none h-20"/>
            </div>
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-forest-700 text-forest-400 text-sm hover:border-forest-500 transition-colors">
                Back
              </button>
              <button onClick={submit} disabled={busy}
                className="flex-1 py-2 bg-forest-600 hover:bg-forest-500 disabled:opacity-40
                           text-white rounded-xl font-medium text-sm transition-colors">
                {busy ? 'Registering…' : 'Register'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [tab, setTab]           = useState('hire')   // 'hire' | 'my'
  const [listings, setListings] = useState({})
  const [meta, setMeta]         = useState({})
  const [myJob, setMyJob]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [rateTarget, setRateTarget] = useState(null)
  const [showRegister, setShowRegister] = useState(false)
  const [roleFilter, setRoleFilter]     = useState('all')

  const reload = useCallback(async () => {
    try {
      const [listRes, myRes] = await Promise.all([jobsApi.listings(), jobsApi.my()])
      setListings(listRes.data.listings || {})
      setMeta(listRes.data.meta || {})
      setMyJob(myRes.data.job)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const allRoles = Object.keys(meta)
  const filteredListings = roleFilter === 'all'
    ? Object.entries(listings)
    : Object.entries(listings).filter(([r]) => r === roleFilter)

  const doUnregister = async () => {
    if (!window.confirm('Unregister from your job? This cannot be undone while you have active clients.')) return
    try { await jobsApi.unregister(); reload() } catch (e) { alert(e.response?.data?.error || 'Failed') }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-forest-50">💼 Jobs</h1>
            <p className="text-forest-600 text-xs mt-0.5">Services, work & earnings</p>
          </div>
          {myJob && (
            <div className="px-3 py-1.5 rounded-xl bg-forest-800 border border-forest-700">
              <p className="text-forest-200 text-xs font-medium">
                {meta[myJob.role]?.icon} {meta[myJob.role]?.label}
              </p>
            </div>
          )}
        </div>

        {/* Toggle — same pill style as friend request public/private toggle */}
        <div className="mt-3 flex rounded-xl bg-forest-900 border border-forest-800 p-0.5 gap-0.5">
          {[['hire', '🏪 For Hire'], ['my', '👤 My Job']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all duration-150
                ${tab === k
                  ? 'bg-forest-700 text-forest-100 shadow-sm'
                  : 'text-forest-500 hover:text-forest-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── FOR HIRE TAB ── */}
        {tab === 'hire' && (
          <div className="p-4 space-y-4">
            {/* Role filter pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => setRoleFilter('all')}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${roleFilter === 'all' ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
                All
              </button>
              {allRoles.map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors
                    ${roleFilter === r ? 'bg-forest-700 border-forest-600 text-forest-100' : 'border-forest-800 text-forest-500 hover:border-forest-600'}`}>
                  {meta[r]?.icon} {meta[r]?.label}
                </button>
              ))}
            </div>

            {loading && <p className="text-forest-600 text-sm text-center py-12">Loading…</p>}

            {!loading && filteredListings.length === 0 && (
              <div className="text-center py-16">
                <p className="text-5xl mb-4">💼</p>
                <p className="text-forest-300 font-medium">No workers listed yet</p>
                <p className="text-forest-600 text-sm mt-2">Be the first to offer your services</p>
                <button onClick={() => setTab('my')}
                  className="mt-4 px-4 py-2 bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm rounded-xl transition-colors">
                  Register a job →
                </button>
              </div>
            )}

            {filteredListings.map(([role, workers]) => (
              <div key={role}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{meta[role]?.icon}</span>
                  <p className="text-forest-300 font-medium text-sm">{meta[role]?.label}</p>
                  <span className="text-forest-700 text-xs">({workers.length})</span>
                  <p className="text-forest-600 text-xs ml-auto">{meta[role]?.tagline}</p>
                </div>
                <div className="space-y-2">
                  {workers.map(job => (
                    <JobCard key={job.id} job={job} meta={meta[role]}
                      onRate={j => setRateTarget({ job: j, meta: meta[role] })} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MY JOB TAB ── */}
        {tab === 'my' && (
          <div className="p-4 space-y-4">
            {loading && <p className="text-forest-600 text-sm text-center py-12">Loading…</p>}

            {!loading && !myJob && (
              <>
                <div className="text-center pt-6 pb-2">
                  <p className="text-forest-400 text-sm">You don't have a job yet.</p>
                  <p className="text-forest-600 text-xs mt-1">Register for one to start earning seeds.</p>
                </div>

                {/* Job listing cards for unregistered users */}
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(JOB_DESCRIPTIONS).map(([role, info]) => {
                    const m = meta[role] || { icon: '💼', label: role }
                    return (
                      <div key={role}
                        className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{m.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-forest-100 font-medium text-sm">{m.label}</p>
                              <span className="text-forest-300 font-mono text-xs flex-shrink-0">{info.pay}</span>
                            </div>
                            <p className="text-forest-500 text-xs mt-0.5 leading-relaxed">{info.detail}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-forest-700 text-xs">Req: {info.req}</span>
                              <button onClick={() => setShowRegister(true)}
                                className="text-xs px-3 py-1 rounded-full bg-forest-700 hover:bg-forest-600
                                           text-forest-100 transition-colors">
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

            {!loading && myJob && (
              <>
                {/* My job card */}
                <div className="rounded-2xl border border-forest-600 bg-forest-900/60 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{meta[myJob.role]?.icon}</span>
                    <div>
                      <p className="text-forest-100 font-display text-lg">{meta[myJob.role]?.label}</p>
                      <p className="text-forest-500 text-xs">{meta[myJob.role]?.tagline}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-forest-200 font-mono text-base font-bold">{myJob.hourly_rate} 🌱</p>
                      <p className="text-forest-600 text-xs">{meta[myJob.role]?.unit}</p>
                    </div>
                  </div>
                  {myJob.bio && (
                    <p className="text-forest-400 text-sm mb-3 italic">"{myJob.bio}"</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StarRating value={myJob.rating_count > 0 ? myJob.rating_sum / myJob.rating_count : 0} />
                      <span className="text-forest-500 text-xs">
                        {myJob.rating_count > 0
                          ? `${(myJob.rating_sum / myJob.rating_count).toFixed(1)} (${myJob.rating_count})`
                          : 'No ratings yet'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workspace placeholder */}
                <div className="rounded-2xl bg-forest-900/20 border border-dashed border-forest-800 p-6 text-center">
                  <p className="text-forest-500 text-sm">🚧 Job workspace coming soon</p>
                  <p className="text-forest-700 text-xs mt-1">Full {meta[myJob.role]?.label} tools will appear here</p>
                </div>

                <button onClick={doUnregister}
                  className="w-full py-2 rounded-xl border border-red-900/50 text-red-400/70
                             hover:border-red-700 hover:text-red-300 text-sm transition-colors">
                  Unregister from job
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Rate Modal */}
      {rateTarget && (
        <RateModal job={rateTarget.job} meta={rateTarget.meta}
          onClose={() => setRateTarget(null)}
          onDone={() => { setRateTarget(null); reload() }} />
      )}

      {/* Register Modal */}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onDone={() => { setShowRegister(false); reload() }} />
      )}
    </div>
  )
}
