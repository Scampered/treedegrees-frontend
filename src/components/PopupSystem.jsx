// src/components/PopupSystem.jsx
// Checks for admin popups on mount and shows them one at a time.
import { useEffect, useState } from 'react'

export default function PopupSystem() {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('td_token')
    if (!token) return

    fetch(`${import.meta.env.VITE_API_URL || ''}/api/popups`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(popups => {
        if (popups.length > 0) {
          setQueue(popups.slice(1))
          setCurrent(popups[0])
        }
      })
      .catch(() => {})
  }, [])

  const dismiss = async (popup) => {
    const token = localStorage.getItem('td_token')
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL || ''}/api/popups/${popup.id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    // Show next in queue
    if (queue.length > 0) {
      setCurrent(queue[0])
      setQueue(q => q.slice(1))
    } else {
      setCurrent(null)
    }
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden slide-up">
        {/* Header bar */}
        <div className="px-6 pt-6 pb-4 border-b border-forest-800">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xl">📢</span>
            <h2 className="font-display text-forest-50 text-xl">{current.header}</h2>
          </div>
        </div>

        {/* Body */}
        {current.subheader && (
          <div className="px-6 py-5">
            <p className="text-forest-300 text-sm leading-relaxed">{current.subheader}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={() => dismiss(current)}
            className="bg-forest-600 hover:bg-forest-500 text-white font-medium px-8 py-2.5 rounded-full transition-colors text-sm"
          >
            {current.buttonText || 'Okay'}
          </button>
        </div>
      </div>
    </div>
  )
}
