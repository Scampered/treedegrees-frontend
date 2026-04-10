// src/pages/MarketplacePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { groveApi, jobActionsApi } from '../api/client'

// ── Theme definitions ────────────────────────────────────────────────────────
const PURCHASABLE_THEMES = [
  {
    id: 'storm',
    name: 'Storm',
    emoji: '⛈️',
    price: 400,
    desc: 'Dark electric skies, violet rain, thunder vibes.',
    preview: ['#0f0a1e', '#1a103a', '#2d1b69'],
    tag: 'Exclusive',
  },
  {
    id: 'snow',
    name: 'Snow',
    emoji: '❄️',
    price: 400,
    desc: 'Crisp winter whites, icy blues, soft snowfall.',
    preview: ['#0d1b2a', '#1b2d3e', '#2e4a5e'],
    tag: 'Exclusive',
  },
]

const FREE_THEMES = [
  { id: 'dark',  name: 'Dark',     emoji: '🪨', desc: 'Slate dark — calm, desaturated, easy on the eyes.' },
  { id: 'light', name: 'Light',    emoji: '🌿', desc: 'Soft sage — bright, airy, mint greens.' },
  { id: 'adaptive', name: 'Adaptive', emoji: '🌦️', desc: 'Changes with your local weather automatically.' },
]

// ── Hired services ────────────────────────────────────────────────────────────
const HIRED_SERVICES = [
  {
    role: 'courier',
    name: 'Courier',
    emoji: '🚐',
    desc: 'Hire someone to speed-deliver your letters across the globe.',
    action: 'Hire a courier',
    to: '/jobs?tab=courier',
  },
  {
    role: 'writer',
    name: 'Writer',
    emoji: '🖊️',
    desc: 'Commission a writer to craft a letter or note for you.',
    action: 'Hire a writer',
    to: '/jobs?tab=writer',
  },
  {
    role: 'seed_broker',
    name: 'Seed Broker',
    emoji: '📈',
    desc: 'Let a broker invest your grove seeds on your behalf.',
    action: 'Hire a broker',
    to: '/jobs?tab=broker',
  },
  {
    role: 'accountant',
    name: 'Accountant',
    emoji: '📊',
    desc: 'Get an accountant to audit and grow your seeds portfolio.',
    action: 'Hire an accountant',
    to: '/jobs?tab=accountant',
  },
  {
    role: 'steward',
    name: 'Steward',
    emoji: '🌿',
    desc: 'A steward maintains your grove and waters your connections.',
    action: 'Hire a steward',
    to: '/jobs?tab=steward',
  },
]

// ── Category pill ─────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0
        ${active
          ? 'bg-forest-700 text-forest-100 border border-forest-500'
          : 'bg-forest-900/50 text-forest-500 border border-forest-800 hover:border-forest-600 hover:text-forest-300'}`}>
      {label}
    </button>
  )
}

export default function MarketplacePage() {
  const { user } = useAuth()
  const { pref, active: activeTheme, setPreference } = useTheme()
  const navigate = useNavigate()
  const [seeds, setSeeds]       = useState(user?.seeds || 0)
  const [tab, setTab]           = useState('themes')
  const [buying, setBuying]     = useState(null)
  // Use DB-backed owned themes from user context (falls back to localStorage for instant UI)
  const [owned, setOwned] = useState(() => {
    if (user?.ownedThemes?.length) return user.ownedThemes
    try { return JSON.parse(localStorage.getItem('td_owned_themes') || '[]') } catch { return [] }
  })
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState('ok')

  useEffect(() => {
    groveApi.seeds().then(r => setSeeds(r.data?.seeds ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.ownedThemes?.length) setOwned(user.ownedThemes)
  }, [user?.ownedThemes])

  const handleBuyTheme = async (theme) => {
    if (owned.includes(theme.id)) {
      // Already owned — just apply
      setPreference(theme.id, user)
      setMsg(`✓ ${theme.name} theme applied!`)
      setMsgType('ok')
      return
    }
    if (seeds < theme.price) {
      setMsg(`Not enough seeds — you need ${theme.price} 🌱`)
      setMsgType('err')
      return
    }
    setBuying(theme.id)
    try {
      // Deduct seeds via grove API
      await groveApi.spendSeeds(theme.price, `theme_purchase_${theme.id}`, theme.id)
      const newOwned = [...owned, theme.id]
      setOwned(newOwned)
      localStorage.setItem('td_owned_themes', JSON.stringify(newOwned)) // cache locally too
      setSeeds(s => s - theme.price)
      setPreference(theme.id, user)
      setMsg(`✓ ${theme.name} theme unlocked and applied!`)
      setMsgType('ok')
    } catch (e) {
      setMsg(e.response?.data?.error || 'Purchase failed. Try again.')
      setMsgType('err')
    } finally { setBuying(null) }
  }

  const handleApplyFree = (themeId) => {
    setPreference(themeId, user)
    setMsg('✓ Theme applied!')
    setMsgType('ok')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display text-2xl text-forest-50">🛒 Marketplace</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-900/60 border border-forest-800">
            <span className="text-sm">🌱</span>
            <span className="text-forest-200 text-sm font-semibold">{seeds.toLocaleString()}</span>
          </div>
        </div>
        <p className="text-forest-600 text-xs">Themes, services & more — paid with grove seeds</p>
      </div>

      {/* Category pills */}
      <div className="px-5 flex gap-2 overflow-x-auto pb-3 scrollbar-none flex-shrink-0">
        <Pill label="🎨 Themes"   active={tab === 'themes'}   onClick={() => setTab('themes')} />
        <Pill label="🤝 Services" active={tab === 'services'} onClick={() => setTab('services')} />
      </div>

      {/* Status message */}
      {msg && (
        <div className={`mx-5 mb-3 px-4 py-2.5 rounded-xl text-sm flex-shrink-0
          ${msgType === 'ok'
            ? 'bg-forest-900/60 border border-forest-700 text-forest-300'
            : 'bg-red-950/60 border border-red-800 text-red-300'}`}>
          {msg}
        </div>
      )}

      <div className="flex-1 px-5 pb-8 space-y-5">

        {/* ── THEMES TAB ─────────────────────────────────────────────────── */}
        {tab === 'themes' && (
          <>
            {/* Purchasable themes */}
            <div>
              <p className="text-forest-500 text-xs uppercase tracking-wide mb-3">Premium Themes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PURCHASABLE_THEMES.map(theme => {
                  const isOwned   = owned.includes(theme.id)
                  const isActive  = activeTheme === theme.id || pref === theme.id
                  const canAfford = seeds >= theme.price
                  return (
                    <div key={theme.id}
                      className={`rounded-2xl border overflow-hidden transition-all
                        ${isActive ? 'border-forest-400' : 'border-forest-800 hover:border-forest-700'}`}>
                      {/* Colour swatch */}
                      <div className="h-16 flex"
                        style={{ background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]}, ${theme.preview[2]})` }}>
                        <div className="flex items-end p-3 w-full justify-between">
                          <span className="text-2xl">{theme.emoji}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-black/30 text-white/70 backdrop-blur">{theme.tag}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-forest-900/50">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-forest-100 font-medium">{theme.name}</p>
                          {isActive && <span className="text-xs text-forest-400 flex-shrink-0">✓ Active</span>}
                        </div>
                        <p className="text-forest-500 text-xs mb-3 leading-relaxed">{theme.desc}</p>
                        <button
                          onClick={() => handleBuyTheme(theme)}
                          disabled={buying === theme.id || (!isOwned && !canAfford)}
                          className={`w-full py-2 rounded-xl text-sm font-medium transition-all
                            ${isOwned
                              ? isActive
                                ? 'bg-forest-800 text-forest-400 cursor-default'
                                : 'bg-forest-700 hover:bg-forest-600 text-forest-100'
                              : canAfford
                                ? 'bg-forest-600 hover:bg-forest-500 text-white'
                                : 'bg-forest-900 text-forest-600 cursor-not-allowed'}`}>
                          {buying === theme.id ? '…'
                            : isOwned
                              ? isActive ? 'Currently active' : 'Apply theme'
                              : `Buy for 🌱 ${theme.price}`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Free themes */}
            <div>
              <p className="text-forest-500 text-xs uppercase tracking-wide mb-3">Free Themes</p>
              <div className="space-y-2">
                {FREE_THEMES.map(theme => {
                  const isActive = pref === theme.id
                  return (
                    <button key={theme.id}
                      onClick={() => handleApplyFree(theme.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all
                        ${isActive
                          ? 'border-forest-500 bg-forest-800/60'
                          : 'border-forest-800 bg-forest-900/30 hover:border-forest-700'}`}>
                      <span className="text-2xl flex-shrink-0">{theme.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-forest-200 text-sm font-medium">{theme.name}</p>
                        <p className="text-forest-600 text-xs">{theme.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0
                        ${isActive ? 'border-forest-400 bg-forest-400' : 'border-forest-600'}`} />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* More coming soon */}
            <div className="rounded-2xl border border-dashed border-forest-800 p-5 text-center">
              <p className="text-forest-500 text-sm mb-1">More themes coming soon</p>
              <p className="text-forest-700 text-xs">Earn seeds by staying active to unlock future drops</p>
            </div>
          </>
        )}

        {/* ── SERVICES TAB ───────────────────────────────────────────────── */}
        {tab === 'services' && (
          <>
            <div>
              <p className="text-forest-500 text-xs uppercase tracking-wide mb-3">Hire from your connections</p>
              <div className="space-y-3">
                {HIRED_SERVICES.map(svc => (
                  <div key={svc.role}
                    className="rounded-2xl border border-forest-800 bg-forest-900/40 p-4 flex items-center gap-4 hover:border-forest-700 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-forest-800 border border-forest-700 flex items-center justify-center text-2xl flex-shrink-0">
                      {svc.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-forest-100 font-medium text-sm">{svc.name}</p>
                      <p className="text-forest-500 text-xs leading-relaxed">{svc.desc}</p>
                    </div>
                    <Link to={svc.to}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs font-medium transition-colors">
                      Hire →
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-forest-800 p-5 text-center">
              <p className="text-forest-500 text-sm mb-1">More services coming soon</p>
              <p className="text-forest-700 text-xs">Plane tickets, travel perks and more</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
