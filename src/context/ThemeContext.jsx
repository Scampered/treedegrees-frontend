// src/context/ThemeContext.jsx
// Manages dark / light / adaptive theme. Adaptive fetches weather and maps it.
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext({})
export const useTheme = () => useContext(ThemeContext)

// ── OpenWeatherMap condition code → theme key ─────────────────────────────────
// Free API, no account needed for basic weather by city name
const OWM_KEY = 'bd5e378503939ddaee76f12ad7a97608' // public demo key — replace if needed

function conditionToTheme(weatherId, isDay) {
  if (!isDay) return 'night'
  if (weatherId >= 200 && weatherId < 300) return 'storm'
  if (weatherId >= 300 && weatherId < 400) return 'rain'
  if (weatherId >= 500 && weatherId < 600) return 'rain'
  if (weatherId >= 600 && weatherId < 700) return 'snow'
  if (weatherId === 701) return 'foggy'
  if (weatherId === 711) return 'ash'
  if (weatherId === 721) return 'foggy'
  if (weatherId === 731 || weatherId === 761) return 'dust'
  if (weatherId === 741) return 'foggy'
  if (weatherId === 751 || weatherId === 762) return 'dust'
  if (weatherId === 771) return 'cyclone'
  if (weatherId === 781) return 'cyclone'
  if (weatherId >= 700 && weatherId < 800) return 'foggy'
  if (weatherId === 800) return 'sunny'
  if (weatherId === 801) return 'partly-cloudy'
  if (weatherId === 802) return 'partly-cloudy'
  if (weatherId >= 803) return 'cloudy'
  return 'dark'
}

async function fetchWeatherTheme(city, country) {
  try {
    const q   = encodeURIComponent(`${city},${country}`)
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${OWM_KEY}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const id    = data.weather?.[0]?.id
    const sunrise = data.sys?.sunrise * 1000
    const sunset  = data.sys?.sunset  * 1000
    const now     = Date.now()
    const isDay   = now >= sunrise && now < sunset
    return conditionToTheme(id, isDay)
  } catch { return null }
}

const PREF_KEY   = 'td_theme_pref'   // 'dark' | 'light' | 'adaptive'
const CACHE_KEY  = 'td_theme_cache'  // { theme, fetchedAt }
const CACHE_MS   = 30 * 60 * 1000   // 30 min weather cache

export function ThemeProvider({ children }) {
  const [pref, setPref]   = useState(() => localStorage.getItem(PREF_KEY) || 'dark')
  const [active, setActive] = useState('dark') // the actual data-theme value
  const [loading, setLoading] = useState(false)

  const applyTheme = useCallback((theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    setActive(theme)
  }, [])

  const resolveTheme = useCallback(async (preference, user) => {
    if (preference === 'dark')  { applyTheme('dark');  return }
    if (preference === 'light') { applyTheme('light'); return }

    // Adaptive — try cache first
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
        applyTheme(cached.theme); return
      }
    } catch {}

    // Fetch weather
    setLoading(true)
    const city    = user?.city    || ''
    const country = user?.country || ''
    if (!city && !country) { applyTheme('dark'); setLoading(false); return }

    const theme = await fetchWeatherTheme(city, country)
    const result = theme || 'dark'
    applyTheme(result)
    localStorage.setItem(CACHE_KEY, JSON.stringify({ theme: result, fetchedAt: Date.now() }))
    setLoading(false)
  }, [applyTheme])

  const setPreference = useCallback((newPref, user) => {
    localStorage.setItem(PREF_KEY, newPref)
    setPref(newPref)
    // Clear weather cache so next adaptive load re-fetches
    if (newPref === 'adaptive') localStorage.removeItem(CACHE_KEY)
    resolveTheme(newPref, user)
  }, [resolveTheme])

  // Apply on mount and when user changes
  useEffect(() => {
    // We'll call resolveTheme from App once user is loaded
    const storedPref = localStorage.getItem(PREF_KEY) || 'dark'
    if (storedPref !== 'adaptive') {
      applyTheme(storedPref === 'light' ? 'light' : 'dark')
    }
  }, [applyTheme])

  return (
    <ThemeContext.Provider value={{ pref, active, loading, setPreference, resolveTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
