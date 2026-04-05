// src/pages/ProfilePage.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api, { groveApi } from '../api/client'

const OWM_KEY = 'bd5e378503939ddaee76f12ad7a97608'
const JOB_META = {
  courier:'🚚 Courier', writer:'✍️ Writer', seed_broker:'🌱 Seed Broker',
  accountant:'📊 Accountant', steward:'🔔 Steward', forecaster:'📡 Forecaster', farmer:'🌾 Farmer'
}
const THEME_EMOJI = { sunny:'☀️','partly-cloudy':'⛅',cloudy:'☁️',rain:'🌧️',storm:'⛈️',snow:'❄️',foggy:'🌫️',night:'🌙',dark:'🌑' }

function weatherEmoji(theme) {
  const h = new Date().getHours()
  if (!theme) return (h < 6 || h >= 20) ? '🌙' : '🌤️'
  return THEME_EMOJI[theme] || '🌤️'
}
function timeAgo(date) {
  if (!date) return ''
  const d = new Date(date); if (isNaN(d)) return ''
  const s = (Date.now()-d)/1000
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return d.toLocaleDateString()
}
function joinedDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB',{month:'long',year:'numeric'})
}
async function fetchWeatherTheme(city, country) {
  if (!city && !country) return null
  try {
    const q = city ? `${city},${country||''}` : country
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${OWM_KEY}`)
    if (!r.ok) { if (country && city) return fetchWeatherTheme(null, country); return null }
    const d = await r.json()
    const id = d.weather?.[0]?.id||800
    const isDay = Date.now()>=d.sys.sunrise*1000 && Date.now()<d.sys.sunset*1000
    if (id>=200&&id<300) return 'storm'; if (id>=300&&id<600) return 'rain'
    if (id>=600&&id<700) return 'snow'; if (id>=700&&id<800) return 'foggy'
    if (id===800) return isDay?'sunny':'night'; if (id<=802) return 'partly-cloudy'; return 'cloudy'
  } catch { return null }
}

// ── Mini static map widget using OpenStreetMap tiles ─────────────────────────
function MiniMap({ lat, lng, city, country, onClick }) {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

  // Convert lat/lng to tile coordinates at zoom 10
  const zoom = 10
  const toTile = (lat, lng, z) => {
    const n = Math.pow(2, z)
    const x = Math.floor((lng + 180) / 360 * n)
    const latRad = lat * Math.PI / 180
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1/Math.cos(latRad)) / Math.PI) / 2 * n)
    return { x, y }
  }

  const { x: cx, y: cy } = toTile(lat, lng, zoom)
  // Show a 3x2 grid of tiles centred on the location
  const tileSize = 256
  const cols = 3, rows = 2
  const offsetX = Math.round((lng + 180) / 360 * Math.pow(2, zoom) % 1 * tileSize)
  const offsetY = Math.round((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180)) / Math.PI) / 2 * Math.pow(2, zoom) % 1 * tileSize)

  const tiles = []
  for (let dy = -1; dy <= rows - 1; dy++) {
    for (let dx = -1; dx <= cols - 1; dx++) {
      const tx = cx + dx, ty = cy + dy
      tiles.push({ tx, ty, dx, dy })
    }
  }

  // Use a 50km box: at zoom 10, 1 tile ≈ 40km wide near equator
  // We just show a 300×160 cropped static map
  const W = 300, H = 160

  return (
    <div
      onClick={onClick}
      className="rounded-xl overflow-hidden border border-forest-700 cursor-pointer hover:border-forest-500 transition-colors relative"
      style={{ width: '100%', height: H, background: '#0d1f0d' }}
      title="Click to open on Globe Map"
    >
      {/* Tile grid */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.75 }}>
        {tiles.map(({ tx, ty, dx, dy }) => (
          <img
            key={`${tx}-${ty}`}
            src={`https://a.basemaps.cartocdn.com/dark_all/${zoom}/${tx}/${ty}.png`}
            alt=""
            style={{
              position: 'absolute',
              left: (dx + 1) * tileSize - offsetX,
              top:  (dy + 1) * tileSize - offsetY,
              width: tileSize, height: tileSize,
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      {/* Dark vignette edges */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at center, transparent 40%, rgba(5,15,5,0.7) 100%)',
      }}/>

      {/* Centre dot — their location */}
      <div style={{
        position:'absolute', left:'50%', top:'50%',
        transform:'translate(-50%,-50%)',
        width:14, height:14, borderRadius:'50%',
        background:'#4dba4d', border:'2.5px solid #80d580',
        boxShadow:'0 0 10px rgba(77,186,77,0.7)',
        zIndex:10,
      }}/>

      {/* City label top */}
      <div style={{
        position:'absolute', top:8, left:0, right:0,
        textAlign:'center', zIndex:10,
        pointerEvents:'none',
      }}>
        <span style={{
          background:'rgba(5,20,5,0.75)', backdropFilter:'blur(4px)',
          color:'#80d580', fontSize:11, fontWeight:600,
          padding:'2px 10px', borderRadius:99,
          border:'1px solid rgba(77,186,77,0.3)',
          fontFamily:'Dosis,sans-serif',
        }}>
          📍 {city || country}
        </span>
      </div>

      {/* ~50km scale indicator */}
      <div style={{
        position:'absolute', bottom:8, right:10, zIndex:10,
        display:'flex', alignItems:'center', gap:4, pointerEvents:'none',
      }}>
        <div style={{ width:40, height:2, background:'rgba(77,186,77,0.5)', borderRadius:1 }}/>
        <span style={{ color:'rgba(77,186,77,0.6)', fontSize:9, fontFamily:'monospace' }}>~50km</span>
      </div>

      {/* Click hint */}
      <div style={{
        position:'absolute', bottom:8, left:10, zIndex:10, pointerEvents:'none',
        color:'rgba(255,255,255,0.4)', fontSize:9, fontFamily:'Dosis,sans-serif',
      }}>
        tap to open map ↗
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { active: myTheme } = useTheme()
  const navigate = useNavigate()
  const isOwn = !id || id === 'me' || id === user?.id

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [weather, setWeather] = useState(null)
  const [grove, setGrove]   = useState(null)

  useEffect(() => {
    const endpoint = isOwn ? '/api/profile/me' : `/api/profile/${id}`
    api.get(endpoint)
      .then(r => {
        setProfile(r.data)
        fetchWeatherTheme(r.data.city, r.data.country).then(setWeather)
        // Fetch grove data — use connections list and find this person
        if (!isOwn) {
          groveApi.connections().then(g => {
            const conns = Array.isArray(g.data) ? g.data : (g.data?.connections || [])
            const match = conns.find(c => c.id === r.data.id)
            if (match) setGrove(match)
          }).catch(() => {})
        } else {
          groveApi.me().then(g => setGrove(g.data)).catch(() => {})
        }
      })
      .catch(e => {
        if (e.response?.status===403) setError('This profile is only visible to their connections.')
        else setError('Profile not found.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin"/>
    </div>
  )
  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <p className="text-5xl">🔒</p>
      <p className="text-forest-300 font-medium text-lg">{error}</p>
      <button onClick={() => navigate(-1)} className="text-forest-500 text-sm hover:text-forest-300 underline">← Go back</button>
    </div>
  )
  if (!profile) return null

  const displayWeather = isOwn ? (myTheme||weather) : weather
  const wEmoji = weatherEmoji(displayWeather)
  const avatarEmoji = profile.mood || wEmoji
  const noteIsFresh = profile.notePostedAt && (Date.now()-new Date(profile.notePostedAt))<86400000

  const openOnMap = () => navigate('/map', {
    state: { flyTo: { lat: profile.latitude, lng: profile.longitude } }
  })

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-6 border-b border-forest-800 flex-shrink-0"
        style={{ background:'linear-gradient(160deg,rgb(var(--f900)/0.95),rgb(var(--f800)/0.7))' }}>
        <div className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">

            {/* Avatar */}
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              {isOwn
                ? <Link to="/settings" title="Change theme in Settings"
                    className="text-[80px] leading-none select-none hover:scale-105 transition-transform block">
                    {avatarEmoji}
                  </Link>
                : <div className="text-[80px] leading-none select-none">{avatarEmoji}</div>
              }
              {profile.mood && (
                <span className="text-sm text-forest-600 flex items-center gap-1">
                  {wEmoji} <span className="capitalize">{displayWeather?.replace('-',' ') || 'unknown'}</span>
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-display text-3xl sm:text-4xl text-forest-50 leading-none">
                {profile.nickname}
              </h1>
              {profile.fullName && profile.fullName !== profile.nickname && (
                <p className="text-forest-500 text-sm mt-1">{profile.fullName}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 mt-2">
                {(profile.city||profile.country) && (
                  <span className="text-forest-400 text-sm">📍 {[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                )}
                <span className="text-forest-700 text-xs">· {joinedDate(profile.createdAt)}</span>
              </div>
              {!profile.mood && displayWeather && (
                <p className="text-forest-600 text-xs mt-1">
                  {wEmoji} <span className="capitalize">{displayWeather.replace('-',' ')}</span>
                </p>
              )}
            </div>

            {/* Seeds — own only */}
            {isOwn && (
              <div className="flex flex-col items-center sm:items-end gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-2 bg-forest-900/60 border border-forest-700 rounded-full px-4 py-2">
                  <span>🌱</span>
                  <span className="text-forest-100 font-mono font-bold text-lg">{profile.seeds??0}</span>
                </div>
                <Link to="/settings" className="text-forest-600 text-xs hover:text-forest-400">⚙️ Edit profile</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-5 flex flex-col gap-4 max-w-xl mx-auto w-full pb-8">

        {/* Mini map — their location */}
        {(profile.latitude && profile.longitude) && (
          <div>
            <p className="text-forest-600 text-xs uppercase tracking-wide mb-2">Location</p>
            <MiniMap
              lat={Number(profile.latitude)}
              lng={Number(profile.longitude)}
              city={profile.city}
              country={profile.country}
              onClick={openOnMap}
            />
          </div>
        )}

        {/* Today's note */}
        {noteIsFresh && profile.dailyNote && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
            <p className="text-forest-600 text-xs uppercase tracking-wide mb-3">Today's note</p>
            <div className="flex items-start gap-3">
              {profile.noteEmoji && <span className="text-3xl flex-shrink-0">{profile.noteEmoji}</span>}
              <p className="text-forest-200 text-sm sm:text-base italic leading-relaxed flex-1">
                "{profile.dailyNote}"
              </p>
            </div>
            <p className="text-forest-700 text-xs mt-2 text-right">{timeAgo(profile.notePostedAt)}</p>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
            <p className="text-forest-600 text-xs uppercase tracking-wide mb-2">About</p>
            <p className="text-forest-300 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ['✉️', profile.lettersSent, 'Letters sent'],
            ['📬', profile.lettersReceived, 'Received'],
            ['🌿', profile.connectionCount, 'Connections'],
          ].map(([icon, val, label]) => (
            <div key={label} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4 text-center">
              <p className="text-lg mb-1">{icon}</p>
              <p className="text-forest-50 font-display text-2xl">{val}</p>
              <p className="text-forest-600 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Grove / stock */}
        {grove && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
            <p className="text-forest-600 text-xs uppercase tracking-wide mb-3">Grove</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-forest-50 font-display text-2xl">🌱 {grove.seeds ?? grove.currentSeeds ?? '—'}</p>
                <p className="text-forest-600 text-xs mt-0.5">seeds balance</p>
              </div>
              {!isOwn && (
                <Link to="/grove" className="text-forest-500 text-xs hover:text-forest-300">Invest →</Link>
              )}
            </div>
          </div>
        )}

        {/* Job */}
        {profile.jobRole && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">{JOB_META[profile.jobRole]?.split(' ')[0]}</span>
            <div>
              <p className="text-forest-600 text-xs uppercase tracking-wide">Currently working as</p>
              <p className="text-forest-200 text-sm font-medium">{JOB_META[profile.jobRole]}</p>
            </div>
            {!isOwn && <Link to="/jobs" className="ml-auto text-forest-500 text-xs hover:text-forest-300">Hire →</Link>}
          </div>
        )}

        {/* Streak */}
        {!isOwn && profile.streak && (
          <div className="rounded-2xl bg-forest-900/40 border border-forest-800 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-forest-600 text-xs uppercase tracking-wide mb-1">Your streak together</p>
              {(profile.streak.streak_days || profile.streak.streakDays || 0) > 0
                ? <div className="flex items-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="text-forest-100 font-display text-xl">
                      {profile.streak.streak_days || profile.streak.streakDays} days
                    </span>
                  </div>
                : <span className="text-forest-600 text-sm">No streak yet — write a letter!</span>
              }
            </div>
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full border-2
                  ${i<(profile.streak.fuel??0)
                    ? 'bg-forest-500 border-forest-300'
                    : 'bg-forest-900 border-forest-700'}`}/>
              ))}
            </div>
          </div>
        )}

        {/* Write letter */}
        {!isOwn && (
          <Link to="/letters" state={{ selectFriend:{id:profile.id,displayName:profile.nickname} }}
            className="flex items-center justify-center gap-2 w-full bg-forest-700 hover:bg-forest-600
                       text-forest-100 font-medium py-3.5 rounded-2xl transition-colors text-base">
            ✉️ Write a letter
          </Link>
        )}

        {/* Memories placeholder */}
        <div className="rounded-2xl border border-dashed border-forest-800 px-5 py-4 text-center opacity-40">
          <p className="text-forest-600 text-sm">🌳 Wall & Memories — coming soon</p>
        </div>

        {/* Friend code (own) */}
        {isOwn && (
          <div className="rounded-2xl bg-forest-800/40 border border-forest-700 p-4">
            <p className="text-forest-500 text-xs uppercase tracking-wide mb-2">Your Friend Code</p>
            <div className="flex items-center justify-between gap-3">
              <p className="friend-code text-forest-100 text-xl tracking-[0.18em]">{profile.friendCode}</p>
              <button onClick={() => navigator.clipboard?.writeText(profile.friendCode)}
                className="bg-forest-700 hover:bg-forest-600 text-forest-100 text-xs px-3 py-1.5 rounded-lg transition-colors">
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
