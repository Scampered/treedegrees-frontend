// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react'

const Ctx = createContext({})
export const useTheme = () => useContext(Ctx)

const PREF_KEY  = 'td_theme_pref'
const CACHE_KEY = 'td_weather_cache'
const CACHE_MS  = 30 * 60 * 1000

const OWM_KEY = import.meta.env.VITE_OWM_KEY || 'bd5e378503939ddaee76f12ad7a97608'

function weatherIdToTheme(id, isDay) {
  // Weather condition is always prioritised over time of day.
  // Night only applies when sky is clear (800) or nearly clear (801).
  if (id >= 200 && id < 300)                return 'storm'
  if (id >= 300 && id < 600)                return 'rain'
  if (id >= 600 && id < 700)                return 'snow'
  if (id === 711 || id === 762)             return 'ash'
  if (id === 731 || id === 751 || id === 761) return 'dust'
  if (id === 771 || id === 781)             return 'cyclone'
  if (id >= 700 && id < 800)                return 'foggy'
  // Clear / few clouds — now apply time of day
  if (id === 800)  return isDay ? 'sunny' : 'night'
  if (id === 801)  return isDay ? 'partly-cloudy' : 'night'
  if (id === 802)  return 'partly-cloudy'   // scattered clouds, ok either way
  if (id >= 803)   return 'cloudy'          // broken/overcast — same day or night
  return isDay ? 'dark' : 'night'
}

async function fetchThemeForLocation(city, country) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.theme
  } catch {}
  localStorage.removeItem(CACHE_KEY) // clear before fetch so stale data never blocks
  try {
    const q   = encodeURIComponent(`${city},${country}`)
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OWM_KEY}`)
    if (!res.ok) return 'dark'
    const d     = await res.json()
    const id    = d.weather?.[0]?.id || 800
    const isDay = Date.now() >= d.sys.sunrise * 1000 && Date.now() < d.sys.sunset * 1000
    const theme = weatherIdToTheme(id, isDay)
    localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, at: Date.now() }))
    return theme
  } catch { return 'dark' }
}

function setDocTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }) {
  const [pref, setPref]     = useState(() => localStorage.getItem(PREF_KEY) || 'dark')
  const [active, setActive] = useState('dark')
  const [loading, setLoading] = useState(false)
  const applied = useRef(false)

  // Apply static theme immediately on first render
  useEffect(() => {
    const p = localStorage.getItem(PREF_KEY) || 'dark'
    if (p !== 'adaptive') {
      setDocTheme(p)
      setActive(p)
    }
    applied.current = true
  }, [])

  // Called from Layout once user data is available
  function applyForUser(user) {
    const p = localStorage.getItem(PREF_KEY) || 'dark'
    if (p === 'dark' || p === 'light') {
      setDocTheme(p); setActive(p); return
    }
    // adaptive
    const city    = user?.city    || ''
    const country = user?.country || ''
    if (!city && !country) { setDocTheme('dark'); setActive('dark'); return }
    setLoading(true)
    fetchThemeForLocation(city, country).then(theme => {
      setDocTheme(theme); setActive(theme); setLoading(false)
    })
  }

  function setPreference(newPref, user) {
    localStorage.setItem(PREF_KEY, newPref)
    localStorage.removeItem(CACHE_KEY) // clear weather cache on pref change
    setPref(newPref)
    if (newPref === 'dark' || newPref === 'light') {
      setDocTheme(newPref); setActive(newPref)
    } else if (user) {
      applyForUser(user)
    }
  }

  return (
    <Ctx.Provider value={{ pref, active, loading, setPreference, applyForUser }}>
      {children}
    </Ctx.Provider>
  )
}
