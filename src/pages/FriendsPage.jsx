// src/pages/FriendsPage.jsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { friendsApi, nicknamesApi } from '../api/client'
import QRCodeCard from '../components/QRCodeCard'
import { useAuth } from '../context/AuthContext'

// ── 3-dot dropdown menu ───────────────────────────────────────────────────────
function FriendMenu({ friend, onRemove, onTogglePrivacy }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-forest-600 hover:text-forest-300 hover:bg-forest-800 transition-colors text-lg"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-52 rounded-xl bg-forest-900 border border-forest-700 shadow-xl overflow-hidden">
          <button
            onClick={() => { onTogglePrivacy(friend); setOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm text-forest-200 hover:bg-forest-800 transition-colors flex items-center gap-2"
          >
            {friend.isPrivate ? (
              <><span>🌐</span> Make public connection</>
            ) : (
              <><span>🔒</span> Make private connection</>
            )}
          </button>
          <div className="h-px bg-forest-800" />
          <button
            onClick={() => { onRemove(friend); setOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-950/40 transition-colors flex items-center gap-2"
          >
            <span>✕</span> Remove connection
          </button>
        </div>
      )}
    </div>
  )
}

// ── Privacy toggle pill ───────────────────────────────────────────────────────
function PrivacyPill({ value, onChange }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-forest-800 text-xs">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 px-3 py-2 transition-colors ${!value
          ? 'bg-forest-700 text-forest-100'
          : 'bg-forest-900/60 text-forest-500 hover:text-forest-300'}`}
      >
        🌐 Public
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 px-3 py-2 transition-colors ${value
          ? 'bg-forest-700 text-forest-100'
          : 'bg-forest-900/60 text-forest-500 hover:text-forest-300'}`}
      >
        🔒 Private
      </button>
    </div>
  )
}


// ── Per-connection nickname input ─────────────────────────────────────────────
function NicknameInput({ friend, savedNickname, onSave, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(savedNickname || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleSave = async () => {
    if (!value.trim()) {
      if (savedNickname) await onRemove()
      setEditing(false)
      return
    }
    await onSave(value.trim())
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setValue(savedNickname || ''); setEditing(false) }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-forest-700 text-xs">Your nickname for them:</span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-forest-500 hover:text-forest-300 transition-colors flex items-center gap-1"
        >
          {savedNickname
            ? <><span className="text-forest-400 font-medium">"{savedNickname}"</span> <span className="text-forest-700">✏️</span></>
            : <span className="text-forest-700 hover:text-forest-500">+ Add nickname</span>
          }
        </button>
        {savedNickname && (
          <button onClick={onRemove} className="text-forest-800 hover:text-red-400 text-xs transition-colors">✕</button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your personal nickname…"
        maxLength={50}
        className="text-xs bg-forest-950 border border-forest-700 focus:border-forest-500 text-forest-200
                   placeholder-forest-700 rounded-lg px-2.5 py-1 outline-none flex-1 min-w-0 transition-colors"
      />
      <button onClick={handleSave} className="text-xs text-forest-400 hover:text-forest-200 px-2 py-1 rounded-lg bg-forest-800 hover:bg-forest-700 transition-colors flex-shrink-0">
        Save
      </button>
      <button onClick={() => { setValue(savedNickname || ''); setEditing(false) }}
        className="text-xs text-forest-700 hover:text-forest-500 transition-colors flex-shrink-0">
        Cancel
      </button>
    </div>
  )
}

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [addCode, setAddCode] = useState('')
  const [addPrivate, setAddPrivate] = useState(false)
  const [addStatus, setAddStatus] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('friends')
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [myNicknames, setMyNicknames] = useState({}) // targetId -> nickname
  // Per-request privacy choice when accepting
  const [acceptPrivacy, setAcceptPrivacy] = useState({})

  const reload = async () => {
    const [f, r] = await Promise.all([friendsApi.list(), friendsApi.requests()])
    setFriends(f.data)
    setRequests(r.data)
  }

  const location = useLocation()
  useEffect(() => {
    // Pre-fill friend code from QR scan URL param
    const params = new URLSearchParams(location.search)
    const code = params.get('code')
    if (code) {
      setAddCode(code.trim().toUpperCase())
      setTab('add')
    }
  }, [location.search])

  useEffect(() => {
    reload().finally(() => setLoading(false))
    nicknamesApi.list().then(r => {
      const map = {}
      r.data.forEach(n => { map[n.targetId] = n.nickname })
      setMyNicknames(map)
    }).catch(() => {})
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addCode.trim()) return
    setAddLoading(true)
    setAddStatus('')
    try {
      const { data } = await friendsApi.add(addCode.trim(), addPrivate)
      setAddStatus(`✓ Request sent to ${data.target.displayName}!`)
      setAddCode('')
      setAddPrivate(false)
    } catch (err) {
      setAddStatus(err.response?.data?.error || 'Failed to send request')
    } finally {
      setAddLoading(false)
    }
  }

  const handleRespond = async (requestId, action) => {
    const isPrivate = acceptPrivacy[requestId] || false
    try {
      await friendsApi.respond(requestId, action, isPrivate)
      reload()
    } catch (err) { console.error(err) }
  }

  const handleSetNickname = async (targetId, nickname) => {
    try {
      await nicknamesApi.set(targetId, nickname)
      setMyNicknames(p => ({ ...p, [targetId]: nickname }))
    } catch (err) { console.error(err) }
  }

  const handleRemoveNickname = async (targetId) => {
    try {
      await nicknamesApi.remove(targetId)
      setMyNicknames(p => { const n = { ...p }; delete n[targetId]; return n })
    } catch (err) { console.error(err) }
  }

  const handleRemove = async (friend) => {
    try {
      await friendsApi.remove(friend.id)
      setRemoveConfirm(null)
      reload()
    } catch (err) { console.error(err) }
  }

  const handleTogglePrivacy = async (friend) => {
    try {
      await friendsApi.togglePrivacy(friend.friendshipId, !friend.isPrivate)
      reload()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-forest-50 mb-6">🌿 Connections</h1>

      {/* Your QR code */}
      <QRCodeCard friendCode={user?.friendCode} />

      {/* Add by friend code */}
      <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5 mb-6">
        <h2 className="text-forest-200 font-medium mb-1">Add someone</h2>
        <p className="text-forest-600 text-xs mb-4">Enter their 16-character friend code to send a request</p>
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            type="text"
            className="input font-mono tracking-widest uppercase text-center text-lg"
            placeholder="XXXXXXXXXXXXXXXX"
            value={addCode}
            onChange={e => setAddCode(e.target.value.toUpperCase())}
            maxLength={16}
          />
          {/* Privacy choice before sending */}
          <div>
            <p className="text-forest-500 text-xs mb-2">How do you want to connect?</p>
            <PrivacyPill value={addPrivate} onChange={setAddPrivate} />
            <p className="text-forest-700 text-xs mt-1.5">
              {addPrivate
                ? '🔒 Private — only you can see this connection on the map'
                : '🌐 Public — your mutual connections can see this link'}
            </p>
          </div>
          <button
            type="submit"
            className="btn-primary w-full rounded-full"
            disabled={addLoading || addCode.length !== 16}
          >
            {addLoading ? 'Sending…' : 'Send request'}
          </button>
        </form>
        {addStatus && (
          <p className={`text-sm mt-3 text-center ${addStatus.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>
            {addStatus}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-forest-900/60 rounded-xl p-1">
        {['friends', 'requests'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors
              ${tab === t ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300'}`}
          >
            {t === 'friends'
              ? `Your connections${friends.length > 0 ? ` (${friends.length})` : ''}`
              : `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-forest-700">Loading…</div>
      ) : (
        <>
          {/* Friends list */}
          {tab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 && (
                <div className="rounded-2xl bg-forest-900/30 border border-forest-800 p-10 text-center">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="text-forest-400 font-medium">No connections yet</p>
                  <p className="text-forest-600 text-sm mt-1">Share your friend code to get started!</p>
                </div>
              )}
              {friends.map(f => (
                <div key={f.id} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
                  {removeConfirm === f.id ? (
                    <div className="flex items-center justify-between">
                      <p className="text-forest-300 text-sm">Remove <span className="font-medium">{f.displayName}</span>?</p>
                      <div className="flex gap-2">
                        <button onClick={() => handleRemove(f)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-950/40 transition-colors">
                          Remove
                        </button>
                        <button onClick={() => setRemoveConfirm(null)} className="text-xs text-forest-500 hover:text-forest-300 px-3 py-1 rounded-lg hover:bg-forest-800 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-forest-700 flex items-center justify-center text-forest-200 font-medium flex-shrink-0">
                        {f.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-forest-100 font-medium text-sm">{f.displayName}</p>
                          {f.isPrivate
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-forest-900 border border-forest-700 text-forest-500">🔒 Private</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-forest-900 border border-forest-700 text-forest-500">🌐 Public</span>
                          }
                        </div>
                        <p className="text-forest-600 text-xs mt-0.5">{f.city}, {f.country}</p>
                        {f.dailyNote && (
                          <p className="text-forest-500 text-xs italic mt-1.5 border-l-2 border-forest-800 pl-2 truncate">
                            "{f.dailyNote}"
                          </p>
                        )}
                        <p className="text-forest-800 text-xs mt-1">
                          Since {new Date(f.connectedSince).toLocaleDateString()}
                        </p>
                        <NicknameInput
                          friend={f}
                          savedNickname={myNicknames[f.id]}
                          onSave={(nick) => handleSetNickname(f.id, nick)}
                          onRemove={() => handleRemoveNickname(f.id)}
                        />
                      </div>
                      {/* 3-dot menu */}
                      <FriendMenu
                        friend={f}
                        onRemove={() => setRemoveConfirm(f.id)}
                        onTogglePrivacy={handleTogglePrivacy}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Requests */}
          {tab === 'requests' && (
            <div className="space-y-3">
              {requests.length === 0 && (
                <div className="rounded-2xl bg-forest-900/30 border border-forest-800 p-10 text-center">
                  <p className="text-forest-500">No pending requests</p>
                </div>
              )}
              {requests.map(r => (
                <div key={r.requestId} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-forest-700 flex items-center justify-center text-forest-200 font-medium">
                      {r.user.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-forest-100 font-medium text-sm">{r.user.displayName}</p>
                      <p className="text-forest-600 text-xs">{r.user.city}, {r.user.country}</p>
                    </div>
                    <p className="text-forest-700 text-xs ml-auto">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Bio preview */}
                  {r.user.bio && (
                    <p className="text-forest-500 text-xs italic mb-3 pl-3 border-l-2 border-forest-800">
                      "{r.user.bio}"
                    </p>
                  )}

                  {/* Privacy choice before accepting */}
                  <div className="mb-3">
                    <p className="text-forest-500 text-xs mb-1.5">Add as:</p>
                    <PrivacyPill
                      value={acceptPrivacy[r.requestId] || false}
                      onChange={(val) => setAcceptPrivacy(p => ({ ...p, [r.requestId]: val }))}
                    />
                    <p className="text-forest-700 text-xs mt-1">
                      {acceptPrivacy[r.requestId]
                        ? '🔒 Only you can see this connection on the map'
                        : '🌐 Mutual connections can see this link'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(r.requestId, 'accept')}
                      className="flex-1 bg-forest-600 hover:bg-forest-500 text-white text-sm py-2 rounded-xl transition-colors font-medium"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(r.requestId, 'decline')}
                      className="flex-1 bg-transparent text-forest-500 hover:text-forest-300 text-sm py-2 rounded-xl border border-forest-800 hover:border-forest-600 transition-colors"
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
