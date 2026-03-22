// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react'

const Ctx = createContext({})
export const useTheme = () => useContext(Ctx)

const PREF_KEY  = 'td_theme_pref'
const CACHE_KEY = 'td_weather_cache'
const CACHE_MS  = 5 * 60 * 1000   // 5 minutes — weather changes fast

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
  // Check cache
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.at < CACHE_MS) {
      console.log('[Theme] Using cached weather theme:', cached.theme, 'age:', Math.round((Date.now()-cached.at)/1000)+'s')
      return cached.theme
    }
  } catch {}

  const location = `${city},${country}`
  console.log('[Theme] Fetching weather for:', location)

  // Try wttr.in first — no API key needed, generous rate limits
  try {
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const d   = await res.json()
      const code = parseInt(d.current_condition?.[0]?.weatherCode || '113')
      // wttr.in weather codes → OWM-style mapping
      // 113=clear, 116=partly cloudy, 119=cloudy, 122=overcast
      // 143=mist, 176+=drizzle/rain, 200+=thunder, 227+=snow, 260+=fog, 281+=sleet
      let id = 800
      if (code === 113)                   id = 800  // clear
      else if (code === 116)              id = 801  // partly cloudy
      else if (code === 119 || code === 122) id = 804 // overcast
      else if (code === 143 || code === 248 || code === 260) id = 741 // fog
      else if (code >= 263 && code <= 281) id = 300  // drizzle
      else if (code >= 293 && code <= 321) id = 500  // rain
      else if (code >= 353 && code <= 395) id = 500  // rain showers
      else if (code >= 200 && code <= 232) id = 200  // thunder
      else if (code >= 386 && code <= 395) id = 200  // thunder with rain
      else if (code >= 227 && code <= 260) id = 600  // snow
      else if (code >= 323 && code <= 350) id = 600  // snow showers
      // Determine day/night from astronomy data
      const sunriseStr = d.weather?.[0]?.astronomy?.[0]?.sunrise || '06:00 AM'
      const sunsetStr  = d.weather?.[0]?.astronomy?.[0]?.sunset  || '08:00 PM'
      const parse12 = s => {
        const [time, period] = s.split(' ')
        let [h, m] = time.split(':').map(Number)
        if (period === 'PM' && h !== 12) h += 12
        if (period === 'AM' && h === 12) h = 0
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
      }
      const now = new Date()
      const isDay = now >= parse12(sunriseStr) && now < parse12(sunsetStr)
      const theme = weatherIdToTheme(id, isDay)
      console.log('[Theme] wttr.in → code:', code, 'id:', id, 'isDay:', isDay, 'theme:', theme)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, at: Date.now() }))
      return theme
    }
  } catch (e) { console.warn('[Theme] wttr.in failed:', e.message) }

  // Fallback: OpenWeatherMap
  try {
    const q   = encodeURIComponent(`${city},${country}`)
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OWM_KEY}`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const d     = await res.json()
      const id    = d.weather?.[0]?.id || 800
      const isDay = Date.now() >= d.sys.sunrise * 1000 && Date.now() < d.sys.sunset * 1000
      const theme = weatherIdToTheme(id, isDay)
      console.log('[Theme] OWM → id:', id, 'isDay:', isDay, 'theme:', theme)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ theme, at: Date.now() }))
      return theme
    }
  } catch (e) { console.warn('[Theme] OWM failed:', e.message) }

  console.warn('[Theme] All weather fetches failed, using dark')
  return 'dark'
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
