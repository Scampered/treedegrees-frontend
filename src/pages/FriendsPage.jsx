// src/pages/FriendsPage.jsx
import { useEffect, useState } from 'react'
import { friendsApi } from '../api/client'

function DegreeBadge({ d }) {
  const map = { 1: ['badge-1', '1st'], 2: ['badge-2', '2nd'], 3: ['badge-3', '3rd'] }
  const [cls, label] = map[d] || ['badge-1', '1st']
  return <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${cls}`}>{label}°</span>
}

export default function FriendsPage() {
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [addCode, setAddCode] = useState('')
  const [addStatus, setAddStatus] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('friends') // 'friends' | 'requests'
  const [removeConfirm, setRemoveConfirm] = useState(null)

  const reload = async () => {
    const [f, r] = await Promise.all([friendsApi.list(), friendsApi.requests()])
    setFriends(f.data)
    setRequests(r.data)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addCode.trim()) return
    setAddLoading(true)
    setAddStatus('')
    try {
      const { data } = await friendsApi.add(addCode.trim())
      setAddStatus(`✓ ${data.message}`)
      setAddCode('')
      reload()
    } catch (err) {
      setAddStatus(err.response?.data?.error || 'Failed to send request')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRespond = async (requestId, action) => {
    try {
      await friendsApi.respond(requestId, action)
      reload()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemove = async (userId) => {
    try {
      await friendsApi.remove(userId)
      setRemoveConfirm(null)
      reload()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-forest-50 mb-6">🌱 Connections</h1>

      {/* Add by friend code */}
      <div className="glass rounded-xl p-5 mb-6">
        <h2 className="font-medium text-forest-200 mb-1">Add by Friend Code</h2>
        <p className="text-forest-500 text-xs mb-4">Enter someone's 16-character code to send a connection request</p>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text"
            className="input font-mono tracking-widest uppercase flex-1"
            placeholder="XXXXXXXXXXXXXXXX"
            value={addCode}
            onChange={e => setAddCode(e.target.value.toUpperCase())}
            maxLength={16}
          />
          <button type="submit" className="btn-primary px-5" disabled={addLoading || addCode.length !== 16}>
            {addLoading ? '…' : 'Connect'}
          </button>
        </form>
        {addStatus && (
          <p className={`text-sm mt-2 ${addStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
            {addStatus}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-forest-900 rounded-xl p-1">
        {['friends', 'requests'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors capitalize
              ${tab === t ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300'}`}
          >
            {t === 'friends' ? `Connections (${friends.length})` : `Requests (${requests.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-forest-600">Loading…</div>
      ) : (
        <>
          {/* Friends list */}
          {tab === 'friends' && (
            <div className="space-y-3">
              {friends.length === 0 && (
                <div className="glass rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="text-forest-400">No connections yet.</p>
                  <p className="text-forest-600 text-sm mt-1">Share your friend code to start growing your tree!</p>
                </div>
              )}
              {friends.map(f => (
                <div key={f.id} className="glass rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-forest-100 font-medium text-sm">{f.fullName}</p>
                      <DegreeBadge d={1} />
                      {!f.isPublic && <span className="text-xs text-forest-600">🔒 Private</span>}
                    </div>
                    <p className="text-forest-500 text-xs mt-0.5">{f.city}, {f.country}</p>
                    {f.dailyNote && (
                      <p className="text-forest-400 text-xs mt-2 italic border-l-2 border-forest-700 pl-2 truncate">
                        "{f.dailyNote}"
                      </p>
                    )}
                    <p className="text-forest-700 text-xs mt-1">
                      Connected {new Date(f.connectedSince).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {removeConfirm === f.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleRemove(f.id)} className="text-xs text-red-400 hover:text-red-300">
                          Confirm
                        </button>
                        <button onClick={() => setRemoveConfirm(null)} className="text-xs text-forest-500 hover:text-forest-300">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRemoveConfirm(f.id)}
                        className="text-forest-700 hover:text-red-400 text-xs transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Requests */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {requests.length === 0 && (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-forest-400">No pending requests</p>
                </div>
              )}
              {requests.map(r => (
                <div key={r.requestId} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-forest-100 font-medium text-sm">{r.user.fullName}</p>
                    <p className="text-forest-500 text-xs">{r.user.city}, {r.user.country}</p>
                    <p className="text-forest-700 text-xs mt-0.5">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(r.requestId, 'accept')}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(r.requestId, 'decline')}
                      className="btn-ghost text-xs py-1.5 px-3"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
