// src/pages/FeedPage.jsx
import { useEffect, useState } from 'react'
import { usersApi } from '../api/client'

function timeAgo(date) {
  const d = new Date(date)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

export default function FeedPage() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersApi.feed()
      .then(r => setNotes(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="font-display text-3xl text-forest-50 mb-2">📋 Daily Notes</h1>
      <p className="text-forest-500 text-sm mb-6">
        One note per day from your direct connections. No algorithm — just real updates.
      </p>

      {loading && (
        <div className="text-center py-12 text-forest-600">Loading feed…</div>
      )}

      {!loading && notes.length === 0 && (
        <div className="glass rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">🌿</div>
          <p className="text-forest-400 font-medium">Nothing yet</p>
          <p className="text-forest-600 text-sm mt-1">
            Your connections' daily notes will appear here within 48 hours of posting.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {notes.map(note => (
          <div key={note.id} className="glass rounded-xl p-5 slide-up">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-forest-100 font-medium text-sm">{note.displayName}</p>
                <p className="text-forest-500 text-xs">{note.city}, {note.country}</p>
              </div>
              <span className="text-forest-600 text-xs flex-shrink-0">{timeAgo(note.postedAt)}</span>
            </div>
            <p className="text-forest-300 text-sm leading-relaxed italic">
              "{note.note}"
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
