// src/components/NotificationPanel.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/client'

const TYPE_META = {
  letter_arrived:      { icon: '✉️',  label: 'Letters',            section: 'Letters'     },
  letter_sent:         { icon: '📤',  label: 'Letter sent',        section: 'Letters'     },
  seeds_earned:        { icon: '🌱',  label: 'Seeds',              section: 'Grove'       },
  grove_invest:        { icon: '📈',  label: 'Grove',              section: 'Grove'       },
  grove_withdraw:      { icon: '📉',  label: 'Grove',              section: 'Grove'       },
  job_hired:           { icon: '💼',  label: 'Jobs',               section: 'Jobs'        },
  job_advice:          { icon: '📊',  label: 'Advice',             section: 'Jobs'        },
  job_commission:      { icon: '✍️',  label: 'Commission',         section: 'Jobs'        },
  job_nudge:           { icon: '🔔',  label: 'Streak nudge',       section: 'Letters'     },
  connection_request:  { icon: '🌿',  label: 'Connection request', section: 'Connections' },
  connection_accepted: { icon: '✅',  label: 'Connected',          section: 'Connections' },
  note_posted:         { icon: '📝',  label: 'Note',               section: 'Notes'       },
  forecaster_post:     { icon: '📡',  label: 'Forecast',           section: 'Jobs'        },
}

const SECTION_ORDER = ['Letters', 'Connections', 'Grove', 'Jobs', 'Notes']

function fmtTime(d) {
  const ms  = Date.now() - new Date(d)
  const min = Math.floor(ms / 60000)
  const hr  = Math.floor(ms / 3600000)
  const day = Math.floor(ms / 86400000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  if (hr  < 24) return `${hr}h ago`
  return `${day}d ago`
}

export default function NotificationPanel({ onClose }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate            = useNavigate()
  const panelRef            = useRef(null)

  const load = useCallback(async () => {
    try {
      const r = await notificationsApi.get()
      setData(r.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Mark all read when panel opens
  useEffect(() => {
    notificationsApi.readAll().catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleClick = (notif) => {
    notificationsApi.readType(notif.type).catch(() => {})
    navigate(notif.link || '/dashboard')
    onClose()
  }

  // Group by section
  const grouped = {}
  if (data?.notifications) {
    for (const n of data.notifications) {
      const meta = TYPE_META[n.type] || { icon: '🔔', label: n.type, section: 'Other' }
      const section = meta.section
      if (!grouped[section]) grouped[section] = []
      grouped[section].push({ ...n, meta })
    }
  }

  const sections = SECTION_ORDER.filter(s => grouped[s])
  if (grouped['Other']) sections.push('Other')

  return (
    <div ref={panelRef}
      className="absolute right-0 top-10 z-50 w-80 max-h-[480px] overflow-y-auto
                 bg-forest-950 border border-forest-700 rounded-2xl shadow-2xl
                 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-forest-800 flex-shrink-0">
        <p className="text-forest-100 font-medium text-sm">Notifications</p>
        <button onClick={onClose}
          className="text-forest-600 hover:text-forest-300 text-lg leading-none">✕</button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin"/>
        </div>
      )}

      {!loading && sections.length === 0 && (
        <div className="text-center py-10">
          <p className="text-4xl mb-2">🔔</p>
          <p className="text-forest-500 text-sm">No notifications yet</p>
        </div>
      )}

      {/* Sections */}
      {sections.map(section => (
        <div key={section}>
          <p className="px-4 pt-3 pb-1 text-forest-600 text-[10px] font-medium uppercase tracking-wider">
            {section}
          </p>
          {grouped[section].map(n => (
            <button key={n.type} onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 px-4 py-2.5 hover:bg-forest-900/60
                         transition-colors text-left
                         ${n.has_unread ? 'bg-forest-900/30' : ''}`}>
              <span className="text-xl flex-shrink-0 mt-0.5">{n.meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${n.has_unread ? 'text-forest-100' : 'text-forest-400'}`}>
                    {n.count > 1 ? `${n.title} (×${n.count})` : n.title}
                  </p>
                  <span className="text-forest-700 text-xs flex-shrink-0">{fmtTime(n.latest_at)}</span>
                </div>
                {n.body && (
                  <p className="text-forest-500 text-xs truncate mt-0.5">{n.body}</p>
                )}
              </div>
              {n.has_unread && (
                <div className="w-1.5 h-1.5 rounded-full bg-forest-400 flex-shrink-0 mt-2"/>
              )}
            </button>
          ))}
        </div>
      ))}

      {/* Footer */}
      {sections.length > 0 && (
        <div className="border-t border-forest-800 px-4 py-2 flex-shrink-0">
          <button onClick={() => { notificationsApi.readAll(); load() }}
            className="text-forest-600 text-xs hover:text-forest-400 transition-colors">
            Mark all read
          </button>
        </div>
      )}
    </div>
  )
}
