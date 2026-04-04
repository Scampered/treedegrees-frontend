// src/components/NotificationPanel.jsx — flat list, oldest first, 24h window
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/client'

const TYPE_META = {
  letter_arrived:      { icon:'✉️',  label:'Letter arrived',    link:'/letters'  },
  seeds_earned:        { icon:'🌱',  label:'Seeds earned',      link:'/grove'    },
  grove_invest:        { icon:'📈',  label:'New investment',    link:'/grove'    },
  grove_withdraw:      { icon:'📉',  label:'Withdrawal',        link:'/grove'    },
  job_hired:           { icon:'💼',  label:'Job update',        link:'/jobs'     },
  job_advice:          { icon:'📊',  label:'Advice received',   link:'/jobs'     },
  job_commission:      { icon:'✍️',  label:'Commission ready',  link:'/jobs'     },
  job_nudge:           { icon:'🔔',  label:'Streak nudge',      link:'/letters'  },
  connection_request:  { icon:'🌿',  label:'Connection request',link:'/friends'  },
  connection_accepted: { icon:'✅',  label:'Connected',         link:'/friends'  },
  note_posted:         { icon:'📝',  label:'Note posted',       link:'/feed'     },
  forecaster_post:     { icon:'📡',  label:'Forecast',          link:'/jobs'     },
}

function fmtTime(d) {
  const ms = Date.now() - new Date(d)
  const min = Math.floor(ms/60000), hr = Math.floor(ms/3600000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  return `${hr}h ago`
}

export default function NotificationPanel({ onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const panelRef = useRef(null)

  useEffect(() => {
    // Fetch raw notifications, flatten, filter to 24h, sort oldest first
    notificationsApi.get().then(r => {
      const all = []
      for (const n of (r.data.notifications || [])) {
        // Each grouped item — expand back to individual for flat display
        // Since we only have grouped data, show each group as one item sorted by latest_at
        all.push(n)
      }
      // Filter to last 24h, sort oldest first
      const cutoff = Date.now() - 86400000
      const filtered = all
        .filter(n => new Date(n.latest_at).getTime() > cutoff)
        .sort((a,b) => new Date(a.latest_at) - new Date(b.latest_at))
      setItems(filtered)
    }).catch(()=>{}).finally(()=>setLoading(false))
    notificationsApi.readAll().catch(()=>{})
  }, [])

  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  const handleClick = (item) => {
    const meta = TYPE_META[item.type]
    navigate(meta?.link || item.link || '/dashboard')
    onClose()
  }

  return (
    <div ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 max-h-[500px] overflow-y-auto
                 bg-forest-950 border border-forest-700 rounded-2xl shadow-2xl flex flex-col"
      style={{ minWidth: 300 }}>

      <div className="flex items-center justify-between px-4 py-3 border-b border-forest-800 flex-shrink-0">
        <p className="text-forest-100 font-medium text-sm">Notifications</p>
        <span className="text-forest-600 text-xs">Last 24h</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin"/>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-10">
          <p className="text-4xl mb-2">🔔</p>
          <p className="text-forest-600 text-sm">No notifications in the last 24 hours</p>
        </div>
      )}

      {/* Flat list — oldest first */}
      <div className="flex flex-col">
        {items.map((n, i) => {
          const meta = TYPE_META[n.type] || { icon:'🔔', label: n.type }
          return (
            <button key={`${n.type}-${i}`} onClick={() => handleClick(n)}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-forest-900/60 transition-colors text-left
                         border-b border-forest-800/50 last:border-0
                         ${n.has_unread ? 'bg-forest-900/30' : ''}`}>
              <span className="text-xl flex-shrink-0 mt-0.5">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${n.has_unread ? 'text-forest-100' : 'text-forest-400'}`}>
                    {n.count > 1 ? `${n.title} (×${n.count})` : n.title}
                  </p>
                  <span className="text-forest-700 text-xs flex-shrink-0">{fmtTime(n.latest_at)}</span>
                </div>
                {n.body && <p className="text-forest-500 text-xs truncate mt-0.5">{n.body}</p>}
              </div>
              {n.has_unread && <div className="w-1.5 h-1.5 rounded-full bg-forest-400 flex-shrink-0 mt-2"/>}
            </button>
          )
        })}
      </div>

      {items.length > 0 && (
        <div className="border-t border-forest-800 px-4 py-2 flex-shrink-0">
          <button onClick={() => { notificationsApi.readAll(); onClose() }}
            className="text-forest-600 text-xs hover:text-forest-400 transition-colors">
            Mark all read
          </button>
        </div>
      )}
    </div>
  )
}
