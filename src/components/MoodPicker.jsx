// src/components/MoodPicker.jsx
import { useState, useEffect, useRef } from 'react'
import { usersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export const MOODS = ['😄','😢','😡','😴','🤔','🥹']
export const MOOD_LABELS = {
  '😄':'Happy','😢':'Sad','😡':'Angry','😴':'Tired','🤔':'Thinking','🥹':'Emotional',
}
const COOLDOWN_MS = 4 * 3600 * 1000

function getStoredCooldown() {
  try {
    const raw = localStorage.getItem('td_mood_ts')
    if (!raw) return 0
    const { setAt } = JSON.parse(raw)
    return Math.max(0, COOLDOWN_MS - (Date.now() - setAt))
  } catch { return 0 }
}
function setCooldown() {
  localStorage.setItem('td_mood_ts', JSON.stringify({ setAt: Date.now() }))
}

// ── Emoji picker popup ────────────────────────────────────────────────────────
// Common expressive emojis grouped for quick access
const EMOJI_GROUPS = [
  ['😄','😂','🥰','😎','🤩','😮','😤','😭','🥺','😈'],
  ['🔥','⭐','💯','✨','🎉','💀','👀','🙏','💪','🌟'],
  ['🌸','🌊','🌙','☀️','🍀','🌈','❤️','💚','🖤','🤍'],
]

function EmojiPickerPopup({ onSelect, onClose }) {
  const ref = useRef(null)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position:'absolute', zIndex:100, top:'100%', left:0, marginTop:4,
      background:'#0d1f0d', border:'1px solid rgba(74,107,79,0.4)',
      borderRadius:14, padding:10, width:220, boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {EMOJI_GROUPS.map((row, i) => (
        <div key={i} style={{ display:'flex', gap:4, marginBottom:4 }}>
          {row.map(e => (
            <button key={e} onClick={() => { onSelect(e); onClose() }}
              style={{
                width:32, height:32, fontSize:18, borderRadius:8, border:'none',
                background:'transparent', cursor:'pointer', display:'flex',
                alignItems:'center', justifyContent:'center',
                transition:'background 0.1s',
              }}
              onMouseEnter={ev => ev.target.style.background='rgba(74,186,74,0.15)'}
              onMouseLeave={ev => ev.target.style.background='transparent'}>
              {e}
            </button>
          ))}
        </div>
      ))}
      <div style={{ borderTop:'1px solid rgba(74,107,79,0.2)', paddingTop:6, display:'flex', gap:4 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)}
          placeholder="Paste any emoji"
          maxLength={2}
          style={{
            flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(74,107,79,0.3)',
            borderRadius:8, color:'#c8d8c8', fontSize:14, padding:'4px 8px', outline:'none',
          }}/>
        <button onClick={() => { if (custom.trim()) { onSelect(custom.trim()); onClose() } }}
          style={{
            background:'#14532d', border:'none', borderRadius:8, color:'#4ade80',
            padding:'4px 8px', fontSize:11, cursor:'pointer', fontWeight:600,
          }}>
          Use
        </button>
      </div>
    </div>
  )
}

export default function MoodPicker({ compact = false }) {
  const { user, updateUser } = useAuth()
  const [active, setActive]       = useState(null)
  const [staged, setStaged]       = useState(null)
  const [saving, setSaving]       = useState(false)
  const [status, setStatus]       = useState('')
  const [cooldownMs, setCooldownMs] = useState(0)
  const [showPicker, setShowPicker] = useState(false)

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

  const locked     = cooldownMs > 0 && !!active
  const hasChange  = staged !== active
  const hoursLeft  = cooldownMs / 3600000
  const hoursStr   = hoursLeft >= 1
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
      setCooldown(); setCooldownMs(COOLDOWN_MS)
      setStatus('✓ Updated — showing on map!')
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

  // ── Compact (dashboard) ───────────────────────────────────────────────────
  if (compact) return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>
          Mood
        </span>
        {MOODS.map(emoji => {
          const isStaged = staged === emoji
          return (
            <button key={emoji} type="button" onClick={() => handleStage(emoji)}
              disabled={saving}
              style={{
                width:36, height:36, fontSize:19, borderRadius:9, outline:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:`2px solid ${isStaged ? '#4dba4d' : active === emoji ? '#2d6a35' : 'rgba(255,255,255,0.07)'}`,
                background: isStaged ? 'rgba(74,186,74,0.2)' : active === emoji ? 'rgba(74,186,74,0.07)' : 'transparent',
                transform: isStaged ? 'scale(1.13)' : 'scale(1)',
                cursor:(locked || saving) ? 'not-allowed' : 'pointer',
                opacity: locked && active !== emoji ? 0.35 : 1,
                transition:'all 0.15s',
              }}>
              {emoji}
            </button>
          )
        })}

        {/* + custom emoji button */}
        {!locked && (
          <div style={{ position:'relative' }}>
            <button type="button" onClick={() => setShowPicker(s => !s)}
              style={{
                width:36, height:36, fontSize:16, borderRadius:9, outline:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'2px dashed rgba(255,255,255,0.15)',
                background: staged && !MOODS.includes(staged) ? 'rgba(74,186,74,0.2)' : 'transparent',
                cursor:'pointer', color:'#6b7280', transition:'all 0.15s',
              }}>
              {staged && !MOODS.includes(staged) ? staged : '+'}
            </button>
            {showPicker && (
              <EmojiPickerPopup
                onSelect={e => { handleStage(e) }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        )}

        {!locked && hasChange && staged && (
          <button type="button" onClick={handleUpdate} disabled={saving}
            style={{
              padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:600,
              background:'#14532d', border:'1px solid #2d6a35', color:'#4ade80',
              cursor:saving ? 'wait' : 'pointer', outline:'none',
            }}>
            {saving ? '…' : 'Set'}
          </button>
        )}
      </div>
      <div style={{ marginTop:3, fontSize:10, color:status.startsWith('✓') ? '#4ade80' : locked ? '#4b5563' : '#6b7280' }}>
        {status || (locked ? `🔒 Locked for ${hoursStr}` : active ? `${active} showing on map` : 'Pick a mood or emoji')}
      </div>
    </div>
  )

  // ── Full ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <p className="text-forest-600 text-xs uppercase tracking-wide">Today's mood</p>
        {locked && <span style={{ fontSize:10, color:'#4b5563' }}>🔒 Next in {hoursStr}</span>}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', position:'relative' }}>
        {MOODS.map(emoji => {
          const isStaged = staged === emoji
          return (
            <button key={emoji} type="button" onClick={() => handleStage(emoji)} disabled={saving}
              style={{
                width:46, height:46, fontSize:24, borderRadius:12, outline:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:`2px solid ${isStaged ? '#4dba4d' : active === emoji ? '#2d6a35' : 'rgba(255,255,255,0.08)'}`,
                background: isStaged ? 'rgba(74,186,74,0.22)' : active === emoji ? 'rgba(74,186,74,0.07)' : 'transparent',
                transform: isStaged ? 'scale(1.18)' : 'scale(1)',
                cursor:(locked || saving) ? 'not-allowed' : 'pointer',
                opacity: locked && active !== emoji ? 0.3 : 1,
                transition:'all 0.15s',
              }}>
              {emoji}
            </button>
          )
        })}
        {/* + custom emoji */}
        {!locked && (
          <div style={{ position:'relative' }}>
            <button type="button" onClick={() => setShowPicker(s => !s)}
              style={{
                width:46, height:46, fontSize:22, borderRadius:12, outline:'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'2px dashed rgba(255,255,255,0.15)',
                background: staged && !MOODS.includes(staged) ? 'rgba(74,186,74,0.22)' : 'transparent',
                cursor:'pointer', color:'#6b7280', transition:'all 0.15s',
              }}>
              {staged && !MOODS.includes(staged) ? staged : '+'}
            </button>
            {showPicker && (
              <EmojiPickerPopup
                onSelect={e => handleStage(e)}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        )}
      </div>
      <div style={{ marginTop:8, minHeight:28, display:'flex', alignItems:'center', gap:10 }}>
        {!locked && hasChange && staged && (
          <button type="button" onClick={handleUpdate} disabled={saving}
            style={{
              padding:'6px 18px', borderRadius:20, fontSize:13, fontWeight:600,
              background:'#14532d', border:'1px solid #2d6a35', color:'#4ade80',
              cursor:saving ? 'wait' : 'pointer', outline:'none', transition:'all 0.15s',
            }}>
            {saving ? 'Updating…' : `Set ${staged}`}
          </button>
        )}
        <p style={{ fontSize:11, color:status.startsWith('✓') ? '#4ade80' : locked ? '#4b5563' : '#6b7280' }}>
          {status || (locked
            ? `🔒 ${active} showing on map. Next in ${hoursStr}`
            : active && !hasChange ? `${active} showing on map` : 'Pick a mood or any emoji'
          )}
        </p>
      </div>
    </div>
  )
}
