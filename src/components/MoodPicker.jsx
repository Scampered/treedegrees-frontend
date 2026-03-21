// src/components/MoodPicker.jsx
// Two-step: click emoji to stage it, then click "Update" to submit.
// 4-hour cooldown between updates.
import { useState, useEffect } from 'react'
import { usersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export const MOODS = ['😄','😢','😡','😴','🤔','🥹']
export const MOOD_LABELS = {
  '😄': 'Happy', '😢': 'Sad', '😡': 'Angry',
  '😴': 'Tired', '🤔': 'Thinking', '🥹': 'Emotional',
}
const COOLDOWN_H = 4  // hours between mood updates

export default function MoodPicker({ compact = false }) {
  const { user, updateUser } = useAuth()

  // active = what's currently set on the server
  // staged = what the user has clicked but not yet confirmed
  const [active, setActive]   = useState(null)
  const [staged, setStaged]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [status, setStatus]   = useState('')   // feedback message
  const [hoursLeft, setHours] = useState(0)    // cooldown hours remaining

  // Sync active mood from user context + localStorage cooldown
  useEffect(() => {
    const serverMood = user?.mood || null
    setActive(serverMood)
    setStaged(serverMood)  // staged matches active until user picks something else

    // Calculate remaining cooldown from localStorage timestamp
    try {
      const raw = localStorage.getItem('td_mood_ts')
      if (raw) {
        const { setAt } = JSON.parse(raw)
        const elapsed = (Date.now() - setAt) / 3600000
        const remaining = Math.max(0, COOLDOWN_H - elapsed)
        setHours(remaining)
      }
    } catch {}
  }, [user?.mood])

  const canUpdate = hoursLeft <= 0 || !active  // can always set first mood

  const handleStage = (emoji) => {
    if (saving) return
    // Toggle: clicking the same emoji unstages it (revert to active)
    if (staged === emoji && emoji !== active) {
      setStaged(active)
    } else {
      setStaged(emoji)
    }
    setStatus('')
  }

  const handleUpdate = async () => {
    if (saving || staged === active) return
    setSaving(true)
    setStatus('')
    try {
      if (staged) {
        await usersApi.setMood(staged)
      } else {
        await usersApi.clearMood()
      }
      setActive(staged)
      updateUser({ mood: staged })
      localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() }))
      setHours(COOLDOWN_H)
      setStatus('✓ Mood updated — visible on map!')
    } catch (err) {
      setStatus(err?.response?.data?.error || 'Could not update mood')
      setStaged(active)  // revert stage on error
    } finally {
      setSaving(false)
    }
  }

  const hasChange = staged !== active

  if (compact) {
    return (
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>Mood</span>
          {MOODS.map(emoji => {
            const isActive  = active === emoji
            const isStaged  = staged === emoji
            const highlight = isStaged
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleStage(emoji)}
                title={MOOD_LABELS[emoji]}
                disabled={saving}
                style={{
                  width: 38, height: 38, fontSize: 20,
                  borderRadius: 10, border: `2px solid ${highlight ? '#4dba4d' : isActive ? '#2d6a35' : 'rgba(255,255,255,0.08)'}`,
                  background: highlight ? 'rgba(74,186,74,0.2)' : isActive ? 'rgba(74,186,74,0.08)' : 'transparent',
                  transform: highlight ? 'scale(1.15)' : 'scale(1)',
                  cursor: saving ? 'wait' : 'pointer',
                  transition: 'all 0.15s', outline: 'none',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                {emoji}
              </button>
            )
          })}
          {hasChange && (
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: '#14532d', border: '1px solid #2d6a35',
                color: '#4ade80', cursor: saving ? 'wait' : 'pointer',
                transition: 'all 0.15s', outline: 'none',
              }}>
              {saving ? '…' : 'Update'}
            </button>
          )}
        </div>
        {status && (
          <p style={{ fontSize: 11, color: status.startsWith('✓') ? '#4ade80' : '#f87171', marginTop: 4 }}>
            {status}
          </p>
        )}
        {active && !hasChange && (
          <p style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>
            {active} {MOOD_LABELS[active]} · on map{hoursLeft > 0 ? ` · next update in ${hoursLeft.toFixed(1)}h` : ''}
          </p>
        )}
      </div>
    )
  }

  // Full picker (Notes page)
  return (
    <div>
      <p className="text-forest-600 text-xs mb-2 uppercase tracking-wide">Today's mood</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        {MOODS.map(emoji => {
          const isActive  = active === emoji
          const isStaged  = staged === emoji
          const highlight = isStaged
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => handleStage(emoji)}
              title={MOOD_LABELS[emoji]}
              disabled={saving}
              style={{
                width: 46, height: 46, fontSize: 24,
                borderRadius: 12, border: `2px solid ${highlight ? '#4dba4d' : isActive ? '#2d6a35' : 'rgba(255,255,255,0.08)'}`,
                background: highlight ? 'rgba(74,186,74,0.22)' : isActive ? 'rgba(74,186,74,0.08)' : 'transparent',
                transform: highlight ? 'scale(1.18)' : 'scale(1)',
                cursor: saving ? 'wait' : 'pointer',
                transition: 'all 0.15s', outline: 'none',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
              {emoji}
            </button>
          )
        })}
      </div>

      {/* Confirm row */}
      <div style={{ marginTop: 8, display:'flex', alignItems:'center', gap:10 }}>
        {hasChange ? (
          <button
            type="button"
            onClick={handleUpdate}
            disabled={saving}
            style={{
              padding: '6px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: '#14532d', border: '1px solid #2d6a35',
              color: '#4ade80', cursor: saving ? 'wait' : 'pointer',
              transition: 'all 0.15s',
            }}>
            {saving ? 'Updating…' : `Update mood → ${staged || 'Clear'}`}
          </button>
        ) : active ? (
          <p style={{ fontSize: 11, color: '#4ade80' }}>
            {active} {MOOD_LABELS[active]} — showing on map
            {hoursLeft > 0 ? ` · next update in ${hoursLeft.toFixed(1)}h` : ''}
          </p>
        ) : (
          <p style={{ fontSize: 11, color: '#4b5563' }}>Pick an emoji and click Update to show it on the map</p>
        )}
        {status && (
          <p style={{ fontSize: 11, color: status.startsWith('✓') ? '#4ade80' : '#f87171' }}>{status}</p>
        )}
      </div>
    </div>
  )
}
