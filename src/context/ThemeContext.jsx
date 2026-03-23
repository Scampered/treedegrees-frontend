// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react'

const Ctx = createContext({})
export const useTheme = () => useContext(Ctx)

const PREF_KEY  = 'td_theme_pref'
const CACHE_KEY = 'td_weather_cache'
const CACHE_MS  = 5 * 60 * 1000
const OWM_KEY   = import.meta.env.VITE_OWM_KEY || 'bd5e378503939ddaee76f12ad7a97608'

// ── Weather ID → theme ────────────────────────────────────────────────────────
function weatherIdToTheme(id, isDay) {
  if (id >= 200 && id < 300)                  return 'storm'
  if (id >= 300 && id < 600)                  return 'rain'
  if (id >= 600 && id < 700)                  return 'snow'
  if (id === 711 || id === 762)               return 'ash'
  if (id === 731 || id === 751 || id === 761) return 'dust'
  if (id === 771 || id === 781)               return 'cyclone'
  if (id >= 700 && id < 800)                  return 'foggy'
  if (id === 800) return isDay ? 'sunny' : 'night'
  if (id === 801) return isDay ? 'partly-cloudy' : 'night'
  if (id === 802) return 'partly-cloudy'
  if (id >= 803)  return 'cloudy'
  return isDay ? 'dark' : 'night'
}

// ── Fetch weather (wttr.in primary, OWM fallback) ─────────────────────────────
async function fetchThemeForLocation(city, country, bust = false) {
  const locKey = (city + '|' + country).toLowerCase()
  if (!bust) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cached && cached.locKey === locKey && Date.now() - cached.at < CACHE_MS) {
        console.log('[Theme] cache hit:', cached.theme, 'for', locKey)
        return cached.theme
      }
    } catch {}
  }

  const loc = `${city},${country}`
  console.log('[Theme] fetching weather for:', loc)

  // wttr.in
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(loc)}?format=j1`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const d    = await res.json()
      const code = parseInt(d.current_condition?.[0]?.weatherCode || '113')
      // wttr.in weather codes
      let id = 800
      if (code === 113)                                    id = 800 // Clear
      else if (code === 116)                               id = 801 // Partly cloudy
      else if (code === 119 || code === 122)               id = 804 // Cloudy/overcast
      else if (code === 143 || code === 248 || code === 260) id = 741 // Fog/mist
      else if (code === 263 || code === 266 || code === 281 || code === 284) id = 300 // Drizzle
      else if (code === 176 || (code >= 293 && code <= 320)) id = 500 // Rain
      else if (code >= 353 && code <= 377)                 id = 500 // Rain showers
      else if (code === 386 || code === 389)               id = 200 // Thunder + rain ⛈️
      else if (code === 392 || code === 395)               id = 200 // Thunder + snow
      else if (code >= 179 && code <= 230)                 id = 601 // Blizzard/heavy snow
      else if (code >= 323 && code <= 350 || code === 368 || code === 371) id = 600 // Snow
      const sun = d.weather?.[0]?.astronomy?.[0]
      const parse12 = s => {
        if (!s) return null
        const [time, period] = s.split(' ')
        let [h, m] = time.split(':').map(Number)
        if (period === 'PM' && h !== 12) h += 12
        if (period === 'AM' && h === 12) h = 0
        const n = new Date()
        return new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m)
      }
      const now = new Date()
      const rise = parse12(sun?.sunrise)
      const set  = parse12(sun?.sunset)
      const isDay = rise && set ? now >= rise && now < set : true
      const theme = weatherIdToTheme(id, isDay)
      console.log('[Theme] wttr.in code:', code, '→', theme, '(isDay:', isDay + ')')
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, locKey, at: Date.now() }))
      return theme
    }
  } catch (e) { console.warn('[Theme] wttr.in failed:', e.message) }

  // OWM fallback
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(loc)}&appid=${OWM_KEY}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const d     = await res.json()
      const id    = d.weather?.[0]?.id || 800
      const isDay = Date.now() >= d.sys.sunrise * 1000 && Date.now() < d.sys.sunset * 1000
      const theme = weatherIdToTheme(id, isDay)
      console.log('[Theme] OWM id:', id, '→', theme)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, locKey, at: Date.now() }))
      return theme
    }
  } catch (e) { console.warn('[Theme] OWM failed:', e.message) }

  return 'dark'
}

function setDocTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

// ── Particle engine ───────────────────────────────────────────────────────────
const PARTICLE_CONFIG = {
  rain:         { type: 'rain',    count: 120, col: '#a0c8e0', vxBase: 1.5, storm: false },
  storm:        { type: 'rain',    count: 150, col: '#8080ff', vxBase: 3,   storm: true  },
  tropical:     { type: 'rain',    count: 90,  col: '#20a878', vxBase: 1.5, storm: false },
  snow:         { type: 'flake',   count: 80,  col: '220,235,255' },
  hail:         { type: 'flake',   count: 60,  col: '100,160,210' },
  dust:         { type: 'dust',    count: 60,  col: '200,150,80'  },
  ash:          { type: 'dust',    count: 50,  col: '180,140,100' },
  cyclone:      { type: 'cyclone', count: 50  },
  foggy:        { type: 'fog',     count: 12  },
  night:        { type: 'star',    count: 80,  col: '210,220,255', move: false },
  flight:       { type: 'star',    count: 120, col: '200,210,255', move: true  },
}

class ParticleEngine {
  constructor(canvas) {
    this.canvas  = canvas
    this.ctx     = canvas.getContext('2d')
    this.particles = []
    this.config  = null
    this.raf     = null
    this.resize()
    window.addEventListener('resize', () => this.resize())
  }

  resize() {
    this.W = this.canvas.width  = window.innerWidth
    this.H = this.canvas.height = window.innerHeight
  }

  setTheme(theme) {
    this.config = PARTICLE_CONFIG[theme] || null
    this.particles = []
    if (!this.config) { this.stop(); return }
    this.spawn()
    this.start()
  }

  rand(a, b) { return a + Math.random() * (b - a) }

  spawnOne() {
    const { type, col, vxBase, storm, move } = this.config || {}
    const W = this.W, H = this.H

    if (type === 'rain') return {
      type, col,
      x: Math.random() * W, y: Math.random() * H - H,
      vx: vxBase, vy: this.rand(14, 20),
      len: this.rand(12, 30), alpha: this.rand(0.2, 0.55),
    }
    if (type === 'flake') return {
      type, col,
      x: Math.random() * W, y: Math.random() * H,
      vx: this.rand(-1.5, 1.5), vy: this.rand(1.5, 4),
      r: this.rand(1.5, 5), alpha: this.rand(0.4, 0.8),
    }
    if (type === 'dust') return {
      type, col,
      x: -20, y: Math.random() * H,
      vx: this.rand(3, 6), vy: this.rand(-0.8, 0.8),
      r: this.rand(2, 7), alpha: this.rand(0.06, 0.18),
    }
    if (type === 'cyclone') {
      const angle  = Math.random() * Math.PI * 2
      const radius = this.rand(50, 250)
      return { type, angle, radius, speed: this.rand(0.02, 0.06), r: this.rand(1, 3.5), alpha: this.rand(0.15, 0.4) }
    }
    if (type === 'fog') return {
      type,
      x: Math.random() * W, y: Math.random() * H,
      vx: this.rand(0.2, 0.6), r: this.rand(60, 180), alpha: this.rand(0.03, 0.08),
    }
    if (type === 'star') return {
      type, col, move,
      x: Math.random() * W, y: Math.random() * H,
      r: this.rand(0.5, 2), baseAlpha: Math.random(),
      pulse: Math.random() * Math.PI * 2, pulseSpeed: this.rand(0.02, 0.06),
    }
  }

  spawn() {
    const count = this.config?.count || 0
    for (let i = 0; i < count; i++) this.particles.push(this.spawnOne())
  }

  tick() {
    const { ctx, W, H, config } = this
    if (!config) return
    ctx.clearRect(0, 0, W, H)

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      if (p.type === 'rain') {
        p.x += p.vx; p.y += p.vy
        ctx.beginPath()
        ctx.strokeStyle = p.col
        ctx.globalAlpha = p.alpha
        ctx.lineWidth   = 1
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x + p.vx, p.y + p.len)
        ctx.stroke()
        if (p.y > H + 20) { p.x = Math.random() * W; p.y = -20 }
      }
      else if (p.type === 'flake') {
        p.x += p.vx; p.y += p.vy
        p.vx += this.rand(-0.05, 0.05)
        p.vx = Math.max(-1.5, Math.min(1.5, p.vx))
        ctx.beginPath()
        ctx.fillStyle   = `rgba(${p.col},${p.alpha})`
        ctx.globalAlpha = 1
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        if (p.y > H + 10) { p.x = Math.random() * W; p.y = -10 }
      }
      else if (p.type === 'dust') {
        p.x += p.vx; p.y += p.vy
        ctx.beginPath()
        ctx.fillStyle   = `rgba(${p.col},${p.alpha})`
        ctx.globalAlpha = 1
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        if (p.x > W + 20) { p.x = -20; p.y = Math.random() * H }
      }
      else if (p.type === 'cyclone') {
        p.angle  += p.speed
        p.radius *= 0.999
        if (p.radius < 5) { this.particles[i] = this.spawnOne(); continue }
        const cx = W / 2, cy = H / 2
        const x  = cx + Math.cos(p.angle) * p.radius
        const y  = cy + Math.sin(p.angle) * p.radius * 0.5
        ctx.beginPath()
        ctx.fillStyle   = `rgba(80,160,100,${p.alpha})`
        ctx.globalAlpha = 1
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      else if (p.type === 'fog') {
        p.x += p.vx
        ctx.beginPath()
        ctx.fillStyle   = `rgba(180,185,190,${p.alpha})`
        ctx.globalAlpha = 1
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        if (p.x > W + p.r) { p.x = -p.r; p.y = Math.random() * H }
      }
      else if (p.type === 'star') {
        if (p.move) p.x -= 0.3
        p.pulse += p.pulseSpeed
        const a = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.pulse))
        ctx.beginPath()
        ctx.fillStyle   = `rgba(${p.col},${a})`
        ctx.globalAlpha = 1
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
        if (p.move && p.x < -2) { p.x = W + 2; p.y = Math.random() * H }
      }

      ctx.globalAlpha = 1
    }
  }

  start() {
    if (this.raf) return
    const loop = () => { this.tick(); this.raf = requestAnimationFrame(loop) }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null }
    if (this.ctx) this.ctx.clearRect(0, 0, this.W, this.H)
  }

  destroy() {
    this.stop()
    window.removeEventListener('resize', () => this.resize())
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }) {
  const [pref, setPref]     = useState(() => localStorage.getItem(PREF_KEY) || 'dark')
  const [active, setActive] = useState('dark')
  const [loading, setLoading] = useState(false)
  const engineRef  = useRef(null)
  const lastLocRef = useRef('')    // track last applied city+country

  // Init grain + particle canvas on mount
  useEffect(() => {
    const p = localStorage.getItem(PREF_KEY) || 'dark'
    if (p !== 'adaptive') { setDocTheme(p); setActive(p) }

    // Create particle canvas
    const canvas = document.createElement('canvas')
    canvas.id    = 'particles'
    canvas.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;'
    document.body.prepend(canvas)
    engineRef.current = new ParticleEngine(canvas)

    return () => {
      engineRef.current?.destroy()
      canvas.remove()
    }
  }, [])

  // Update particles when active theme changes
  useEffect(() => {
    engineRef.current?.setTheme(active)
  }, [active])

  function applyTheme(theme) {
    setDocTheme(theme)
    setActive(theme)
  }

  async function applyAdaptive(city, country, bust = false) {
    if (!city && !country) { applyTheme('dark'); return }
    setLoading(true)
    const theme = await fetchThemeForLocation(city, country, bust)
    applyTheme(theme)
    setLoading(false)
  }

  // Called from Layout whenever user changes (id OR city/country)
  function applyForUser(user) {
    const p    = localStorage.getItem(PREF_KEY) || 'dark'
    const city = user?.city    || ''
    const cntry = user?.country || ''
    const loc  = `${city}|${cntry}`

    if (p === 'dark' || p === 'light') { applyTheme(p); return }

    // Adaptive — bust cache if location changed
    const bust = loc !== lastLocRef.current && lastLocRef.current !== ''
    if (bust) {
      console.log('[Theme] Location changed → bust cache:', lastLocRef.current, '→', loc)
      localStorage.removeItem(CACHE_KEY)
    }
    lastLocRef.current = loc
    applyAdaptive(city, cntry, bust)
  }

  function setPreference(newPref, user) {
    localStorage.setItem(PREF_KEY, newPref)
    localStorage.removeItem(CACHE_KEY)
    setPref(newPref)
    if (newPref === 'dark' || newPref === 'light') {
      applyTheme(newPref)
    } else if (user) {
      lastLocRef.current = ''  // force fresh fetch
      applyForUser(user)
    }
  }

  return (
    <Ctx.Provider value={{ pref, active, loading, setPreference, applyForUser }}>
      {children}
    </Ctx.Provider>
  )
}
