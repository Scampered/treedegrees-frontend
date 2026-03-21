// src/components/MoodPicker.jsx — shared mood picker, works on mobile + PC
import { useState, useEffect, useRef } from 'react'
import { usersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export const MOODS = ['😄','😢','😡','😴','🤔','🥹']
export const MOOD_LABELS = {
  '😄':'Happy', '😢':'Sad', '😡':'Angry',
  '😴':'Tired', '🤔':'Thinking', '🥹':'Emotional',
}
const MOOD_DURATION_H = 24 // hours

export default function MoodPicker({ compact = false }) {
  const { user, updateUser } = useAuth()
  const [myMood, setMyMood]   = useState(null)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)

  // Load from user context OR localStorage fallback
  useEffect(() => {
    const ctxMood = user?.mood
    const ls = (() => {
      try {
        const raw = localStorage.getItem('td_mood')
        if (!raw) return null
        const { mood, setAt } = JSON.parse(raw)
        const ageH = (Date.now() - setAt) / 3600000
        return ageH < MOOD_DURATION_H ? mood : null
      } catch { return null }
    })()
    setMyMood(ctxMood || ls || null)
  }, [user?.mood])

  const handleMood = async (emoji) => {
    if (loading) return
    const next = myMood === emoji ? null : emoji
    // Optimistic update
    setMyMood(next)
    if (next) {
      localStorage.setItem('td_mood', JSON.stringify({ mood: next, setAt: Date.now() }))
    } else {
      localStorage.removeItem('td_mood')
    }
    updateUser({ mood: next })
    setLoading(true)
    try {
      if (next) {
        await usersApi.setMood(next)
      } else {
        await usersApi.clearMood()
      }
    } catch {
      // revert on error
      setMyMood(myMood)
      updateUser({ mood: myMood })
    } finally { setLoading(false) }
  }

  // Use native pointer events attached to the container — most reliable on mobile
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onPointer = (e) => {
      const btn = e.target.closest('[data-mood]')
      if (!btn) return
      e.preventDefault()
      e.stopPropagation()
      const emoji = btn.dataset.mood
      if (emoji) handleMood(emoji)
    }

    container.addEventListener('pointerdown', onPointer, { passive: false })
    return () => container.removeEventListener('pointerdown', onPointer)
  }) // run every render so handleMood closure is fresh

  if (compact) {
    // Compact row for dashboard — inline in the note card
    return (
      <div ref={containerRef} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {MOODS.map(emoji => {
          const selected = myMood === emoji
          return (
            <div
              key={emoji}
              data-mood={emoji}
              title={MOOD_LABELS[emoji]}
              style={{
                width: 40, height: 40,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
                cursor: loading ? 'wait' : 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation',
                transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
                transform: selected ? 'scale(1.18)' : 'scale(1)',
                background: selected ? 'rgba(74,186,74,0.22)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${selected ? '#4dba4d' : 'rgba(255,255,255,0.09)'}`,
                boxShadow: selected ? '0 0 10px rgba(74,186,74,0.25)' : 'none',
                opacity: loading ? 0.6 : 1,
              }}>
              {emoji}
            </div>
          )
        })}
        {myMood && !loading && (
          <div data-mood={myMood}
            style={{ fontSize: 11, color: '#4b5563', cursor: 'pointer', padding: '0 4px', touchAction:'manipulation' }}>
            Clear
          </div>
        )}
        {myMood && (
          <span style={{ fontSize: 10, color: '#374151' }}>·</span>
        )}
        {myMood && (
          <span style={{ fontSize: 10, color: '#4dba4d' }}>showing on map 24h</span>
        )}
      </div>
    )
  }

  // Full picker for Notes page
  return (
    <div>
      <p className="text-forest-600 text-xs mb-2 uppercase tracking-wide">Today's mood</p>
      <div ref={containerRef} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {MOODS.map(emoji => {
          const selected = myMood === emoji
          return (
            <div
              key={emoji}
              data-mood={emoji}
              title={MOOD_LABELS[emoji]}
              style={{
                width: 46, height: 46,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
                cursor: loading ? 'wait' : 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation',
                transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
                transform: selected ? 'scale(1.2)' : 'scale(1)',
                background: selected ? 'rgba(74,186,74,0.2)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${selected ? '#4dba4d' : 'rgba(255,255,255,0.09)'}`,
                boxShadow: selected ? '0 0 12px rgba(74,186,74,0.3)' : 'none',
                opacity: loading ? 0.55 : 1,
              }}>
              {emoji}
            </div>
          )
        })}
        {myMood && !loading && (
          <div data-mood={myMood}
            style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer', padding: '0 4px', touchAction:'manipulation' }}>
            Clear
          </div>
        )}
      </div>
      {myMood && (
        <p style={{ marginTop: 6, fontSize: 11, color: '#4ade80' }}>
          {myMood} {MOOD_LABELS[myMood]} — showing on map for 24h
        </p>
      )}
    </div>
  )
}
