// src/components/MoodPicker.jsx
// Click emoji to stage → click Update to submit. 4h server-enforced cooldown.
import { useState, useEffect, useCallback } from 'react'
import { usersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export const MOODS = ['😄','😢','😡','😴','🤔','🥹']
export const MOOD_LABELS = {
  '😄': 'Happy', '😢': 'Sad', '😡': 'Angry',
  '😴': 'Tired', '🤔': 'Thinking', '🥹': 'Emotional',
}
const COOLDOWN_MS = 4 * 3600 * 1000

function getStoredCooldown() {
  try {
    const raw = localStorage.getItem('td_mood_ts')
    if (!raw) return 0
    const { setAt } = JSON.parse(raw)
    const remaining = COOLDOWN_MS - (Date.now() - setAt)
    return Math.max(0, remaining)
  } catch { return 0 }
}

function setCooldown() {
  localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() }))
}

export default function MoodPicker({ compact = false }) {
  const { user, updateUser } = useAuth()

  const [active, setActive]       = useState(null)   // confirmed on server
  const [staged, setStaged]       = useState(null)   // selected by user, not yet sent
  const [saving, setSaving]       = useState(false)
  const [status, setStatus]       = useState('')
  const [cooldownMs, setCooldownMs] = useState(0)    // ms remaining

  // Tick the cooldown counter every 10s
  useEffect(() => {
    const tick = () => setCooldownMs(getStoredCooldown())
    tick()
    const iv = setInterval(tick, 10000)
    return () => clearInterval(iv)
  }, [])

  // Sync from user context
  useEffect(() => {
    const m = user?.mood || null
    setActive(m)
    setStaged(m)
    // If server says mood was set, start cooldown from moodUpdatedAt
    if (user?.moodUpdatedAt) {
      const ageMs = Date.now() - new Date(user.moodUpdatedAt).getTime()
      const remaining = Math.max(0, COOLDOWN_MS - ageMs)
      if (remaining > 0) {
        // Overwrite localStorage with server's timestamp so it's accurate
        localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() - ageMs }))
        setCooldownMs(remaining)
      }
    }
  }, [user?.mood, user?.moodUpdatedAt])

  const locked = cooldownMs > 0 && !!active  // frozen if cooldown active
  const hasChange = staged !== active

  const hoursLeft = (cooldownMs / 3600000)
  const hoursStr = hoursLeft >= 1
    ? `${Math.floor(hoursLeft)}h ${Math.round((hoursLeft % 1) * 60)}m`
    : `${Math.round(hoursLeft * 60)}m`

  const handleStage = (emoji) => {
    if (saving || locked) return
    setStaged(prev => prev === emoji ? active : emoji)
    setStatus('')
  }

  const handleUpdate = async () => {
    if (saving || locked || !hasChange || !staged) return
    setSaving(true); setStatus('')
    try {
      await usersApi.setMood(staged)
      setActive(staged)
      updateUser({ mood: staged, moodUpdatedAt: new Date().toISOString() })
      setCooldown()
      setCooldownMs(COOLDOWN_MS)
      setStatus('✓ Updated — showing on map!')
    } catch (err) {
      const msg = err?.response?.data?.error || 'Could not update'
      const hl  = err?.response?.data?.hoursLeft
      setStatus(msg)
      if (hl) {
        localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() - (COOLDOWN_MS - hl * 3600000) }))
        setCooldownMs(hl * 3600000)
      }
      setStaged(active) // revert
    } finally { setSaving(false) }
  }

  // ── Compact (dashboard inline) ────────────────────────────────────────────
  if (compact) return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>
          Mood
        </span>
        {MOODS.map(emoji => {
          const isActive = active === emoji
          const isStaged = staged === emoji
          return (
            <button key={emoji} type="button" onClick={() => handleStage(emoji)}
              title={locked ? `Locked for ${hoursStr}` : MOOD_LABELS[emoji]}
              disabled={saving}
              style={{
                width:36, height:36, fontSize:19, borderRadius:9, outline:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                border: `2px solid ${isStaged ? '#4dba4d' : isActive ? '#2d6a35' : 'rgba(255,255,255,0.07)'}`,
                background: isStaged ? 'rgba(74,186,74,0.2)' : isActive ? 'rgba(74,186,74,0.07)' : 'transparent',
                transform: isStaged ? 'scale(1.13)' : 'scale(1)',
                cursor: (locked || saving) ? 'not-allowed' : 'pointer',
                opacity: locked && !isActive ? 0.35 : 1,
                transition: 'all 0.15s',
              }}>
              {emoji}
            </button>
          )
        })}
        {!locked && hasChange && staged && (
          <button type="button" onClick={handleUpdate} disabled={saving}
            style={{
              padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:600,
              background:'#14532d', border:'1px solid #2d6a35', color:'#4ade80',
              cursor: saving ? 'wait' : 'pointer', outline:'none',
            }}>
            {saving ? '…' : 'Update'}
          </button>
        )}
      </div>
      <div style={{ marginTop:3, fontSize:10, color: status.startsWith('✓') ? '#4ade80' : locked ? '#4b5563' : '#6b7280' }}>
        {status || (locked ? `🔒 Locked for ${hoursStr}` : active ? `${active} showing on map` : 'Pick a mood')}
      </div>
    </div>
  )

  // ── Full (Notes page) ─────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <p className="text-forest-600 text-xs uppercase tracking-wide">Today's mood</p>
        {locked && (
          <span style={{ fontSize:10, color:'#4b5563' }}>🔒 Next update in {hoursStr}</span>
        )}
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {MOODS.map(emoji => {
          const isActive = active === emoji
          const isStaged = staged === emoji
          return (
            <button key={emoji} type="button" onClick={() => handleStage(emoji)}
              title={locked ? `Locked for ${hoursStr}` : MOOD_LABELS[emoji]}
              disabled={saving}
              style={{
                width:46, height:46, fontSize:24, borderRadius:12, outline:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                border: `2px solid ${isStaged ? '#4dba4d' : isActive ? '#2d6a35' : 'rgba(255,255,255,0.08)'}`,
                background: isStaged ? 'rgba(74,186,74,0.22)' : isActive ? 'rgba(74,186,74,0.07)' : 'transparent',
                transform: isStaged ? 'scale(1.18)' : 'scale(1)',
                cursor: (locked || saving) ? 'not-allowed' : 'pointer',
                opacity: locked && !isActive ? 0.3 : 1,
                transition: 'all 0.15s',
              }}>
              {emoji}
            </button>
          )
        })}
      </div>

      {/* Confirm / status row */}
      <div style={{ marginTop:8, minHeight:28, display:'flex', alignItems:'center', gap:10 }}>
        {!locked && hasChange && staged && (
          <button type="button" onClick={handleUpdate} disabled={saving}
            style={{
              padding:'6px 18px', borderRadius:20, fontSize:13, fontWeight:600,
              background:'#14532d', border:'1px solid #2d6a35', color:'#4ade80',
              cursor: saving ? 'wait' : 'pointer', outline:'none', transition:'all 0.15s',
            }}>
            {saving ? 'Updating…' : `Set ${staged} ${MOOD_LABELS[staged]}`}
          </button>
        )}
        <p style={{ fontSize:11, color: status.startsWith('✓') ? '#4ade80' : locked ? '#4b5563' : '#6b7280' }}>
          {status || (locked
            ? `🔒 ${active} ${MOOD_LABELS[active] || ''} — showing on map. Next update in ${hoursStr}`
            : active && !hasChange
              ? `${active} ${MOOD_LABELS[active]} — showing on map for your connections`
              : !active ? 'Pick an emoji then click Set to show on the map' : ''
          )}
        </p>
      </div>
    </div>
  )
}
