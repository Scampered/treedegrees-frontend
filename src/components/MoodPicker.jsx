// src/components/MoodPicker.jsx
import { useState, useEffect, useRef } from 'react'
import { usersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export const MOODS = ['😄','😢','😡','😴','🤔','🥹']
const COOLDOWN_MS = 4 * 3600 * 1000

function getStoredCooldown() {
  try {
    const raw = localStorage.getItem('td_mood_ts')
    if (!raw) return 0
    const { setAt } = JSON.parse(raw)
    return Math.max(0, COOLDOWN_MS - (Date.now() - setAt))
  } catch { return 0 }
}
function storeCooldown() {
  localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() }))
}

// Check if a string is a valid single emoji
function isValidEmoji(str) {
  if (!str || str.trim().length === 0) return false
  const s = str.trim()
  if (s.length > 8) return false
  // Check for emoji using multiple patterns
  const hasEmoji = /\p{Emoji_Presentation}/u.test(s) ||
    /\p{Extended_Pictographic}/u.test(s) ||
    /[\u{1F000}-\u{1FFFF}]/u.test(s) ||
    /[\u{2600}-\u{27BF}]/u.test(s)
  // Reject if it looks like plain ASCII text
  const isPlainText = /^[a-zA-Z0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/.test(s)
  return hasEmoji && !isPlainText
}

export default function MoodPicker({ compact = false }) {
  const { user, updateUser } = useAuth()
  const [active, setActive]     = useState(null)
  const [staged, setStaged]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [status, setStatus]     = useState('')
  const [cooldownMs, setCooldownMs] = useState(0)
  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const tick = () => setCooldownMs(getStoredCooldown())
    tick()
    const iv = setInterval(tick, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const m = user?.mood || null
    setActive(m); setStaged(m)
    if (user?.moodUpdatedAt) {
      const ageMs = Date.now() - new Date(user.moodUpdatedAt).getTime()
      const remaining = Math.max(0, COOLDOWN_MS - ageMs)
      if (remaining > 0) {
        localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() - ageMs }))
        setCooldownMs(remaining)
      }
    }
  }, [user?.mood, user?.moodUpdatedAt])

  const locked    = cooldownMs > 0 && !!active
  const hasChange = staged !== active
  const hoursLeft = cooldownMs / 3600000
  const hoursStr  = hoursLeft >= 1
    ? `${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m`
    : `${Math.round(hoursLeft * 60)}m`

  const stage = (emoji) => {
    if (locked || saving) return
    setStaged(prev => prev === emoji ? active : emoji)
    setStatus('')
    setCustomError('')
  }

  const handleCustom = (val) => {
    setCustomInput(val)
    setCustomError('')
    if (!val || !val.trim()) {
      // Clear custom if user deletes
      if (staged && !MOODS.includes(staged)) setStaged(active)
      return
    }
    const trimmed = val.trim()
    if (isValidEmoji(trimmed)) {
      setStaged(trimmed)  // directly set, bypassing locked check
      setStatus('')
    } else {
      setCustomError('Type or paste an emoji')
    }
  }

  const handleUpdate = async () => {
    if (saving || locked || !hasChange || !staged) return
    setSaving(true); setStatus('')
    try {
      await usersApi.setMood(staged)
      setActive(staged)
      updateUser({ mood: staged, moodUpdatedAt: new Date().toISOString() })
      storeCooldown(); setCooldownMs(COOLDOWN_MS)
      setStatus('✓ Showing on map!')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not update'
      const hl  = err?.response?.data?.hoursLeft
      setStatus(msg)
      if (hl) {
        localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() - (COOLDOWN_MS - hl * 3600000) }))
        setCooldownMs(hl * 3600000)
      }
      setStaged(active)
    } finally { setSaving(false) }
  }

  const btnStyle = (emoji) => ({
    width: compact ? 34 : 44,
    height: compact ? 34 : 44,
    fontSize: compact ? 18 : 23,
    borderRadius: 10,
    outline: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: `2px solid ${staged === emoji ? '#4dba4d' : active === emoji ? '#2d6a35' : 'rgba(255,255,255,0.08)'}`,
    background: staged === emoji ? 'rgba(74,186,74,0.22)' : active === emoji ? 'rgba(74,186,74,0.07)' : 'transparent',
    transform: staged === emoji ? 'scale(1.15)' : 'scale(1)',
    cursor: (locked || saving) ? 'not-allowed' : 'pointer',
    opacity: locked && active !== emoji ? 0.3 : 1,
    transition: 'all 0.15s',
  })

  return (
    <div>
      {!compact && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <p className="text-forest-600 text-xs uppercase tracking-wide">Mood</p>
          {locked && <span style={{ fontSize:10, color:'#4b5563' }}>🔒 Next in {hoursStr}</span>}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:compact?5:7, flexWrap:'wrap' }}>
        {compact && (
          <span style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Mood</span>
        )}

        {/* Default emojis */}
        {MOODS.map(emoji => (
          <button key={emoji} type="button" onClick={() => stage(emoji)}
            disabled={saving} style={btnStyle(emoji)}>
            {emoji}
          </button>
        ))}

        {/* Custom emoji via keyboard input */}
        {!locked && (
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <input
              ref={inputRef}
              value={customInput}
              onChange={e => handleCustom(e.target.value)}
              placeholder="+"
              maxLength={8}
              style={{
                width: compact ? 34 : 44,
                height: compact ? 34 : 44,
                fontSize: compact ? 18 : 22,
                textAlign: 'center',
                borderRadius: 10,
                border: staged && !MOODS.includes(staged) && staged === customInput.trim()
                  ? '2px solid #4dba4d'
                  : '2px dashed rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#c8d8c8',
                outline: 'none',
                cursor: 'text',
              }}
              title="Type or paste any emoji"
              onFocus={() => setCustomError('')}
            />
            {customError && (
              <span style={{ fontSize:8, color:'#f87171', textAlign:'center', lineHeight:1 }}>{customError}</span>
            )}
          </div>
        )}

        {/* Set button */}
        {!locked && hasChange && staged && (
          <button type="button" onClick={handleUpdate} disabled={saving}
            style={{
              padding: compact ? '3px 10px' : '5px 14px',
              borderRadius: 20, fontSize: compact ? 11 : 12, fontWeight: 600,
              background: '#14532d', border: '1px solid #2d6a35', color: '#4ade80',
              cursor: saving ? 'wait' : 'pointer', outline: 'none',
            }}>
            {saving ? '…' : `Set ${staged}`}
          </button>
        )}
      </div>

      {/* Status line */}
      <div style={{ marginTop: compact ? 3 : 6, fontSize:10, color: status.startsWith('✓') ? '#4ade80' : locked ? '#4b5563' : '#6b7280' }}>
        {status || (locked
          ? `🔒 ${active} locked — ${hoursStr} left`
          : active && !hasChange ? `${active} showing on map` : !active ? 'Pick a mood' : ''
        )}
      </div>
    </div>
  )
}
