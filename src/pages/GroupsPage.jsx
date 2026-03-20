// src/pages/GroupsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { groupsApi, friendsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const GROUP_COLORS = [
  '#4dba4d','#e84444','#e8a020','#4444e8','#e044e0','#20c8c8','#e87820','#8844e8',
]

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {GROUP_COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition-all ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
          style={{ background: c }} />
      ))}
    </div>
  )
}

function GroupBadge({ color, name, size = 'sm' }) {
  const sz = size === 'lg' ? 'text-base px-3 py-1.5' : 'text-xs px-2.5 py-1'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sz}`}
      style={{ background: color + '22', color, border: `1px solid ${color}55` }}>
      <span>☘️</span> {name}
    </span>
  )
}

// ── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ onCreated, onClose }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const { data } = await groupsApi.create({ name, description: desc, color })
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <h2 className="font-display text-forest-100 text-xl">☘️ New Group</h2>
          <button onClick={onClose} className="text-forest-500 hover:text-forest-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Group name *</label>
            <input type="text" className="input text-sm" value={name} maxLength={60}
              onChange={e => setName(e.target.value)} placeholder="e.g. Uni Squad" autoFocus />
          </div>
          <div>
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Description</label>
            <input type="text" className="input text-sm" value={desc} maxLength={120}
              onChange={e => setDesc(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-2">Group colour</label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 text-sm py-2 rounded-xl">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !name.trim()}
              className="btn-primary flex-1 text-sm py-2 rounded-xl">
              {saving ? 'Creating…' : 'Create ☘️'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Group Detail Panel ────────────────────────────────────────────────────────
function GroupDetail({ group, friends, onUpdated, onBack }) {
  const { user } = useAuth()
  const [members, setMembers]   = useState([])
  const [letters, setLetters]   = useState([])
  const [tab, setTab]           = useState('letters')
  const [content, setContent]   = useState('')
  const [sending, setSending]   = useState(false)
  const [addingId, setAddingId] = useState('')
  const [loading, setLoading]   = useState(true)

  const reload = useCallback(async () => {
    try {
      const [m, l] = await Promise.all([groupsApi.members(group.id), groupsApi.letters(group.id)])
      setMembers(m.data)
      setLetters(l.data)
    } catch {} finally { setLoading(false) }
  }, [group.id])

  useEffect(() => { reload() }, [reload])

  const memberIds = new Set(members.map(m => m.id))
  const addableFriends = friends.filter(f => !memberIds.has(f.id))

  const handleSend = async () => {
    if (!content.trim()) return
    setSending(true)
    try {
      await groupsApi.sendLetter(group.id, content)
      setContent('')
      reload()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send')
    } finally { setSending(false) }
  }

  const handleAdd = async (friendId) => {
    try {
      await groupsApi.addMember(group.id, friendId)
      reload()
    } catch (err) { alert(err.response?.data?.error || 'Failed to add') }
  }

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this member?')) return
    try {
      await groupsApi.removeMember(group.id, memberId)
      reload()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="text-forest-500 hover:text-forest-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800 transition-colors">←</button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
          <h2 className="font-display text-forest-100 text-xl truncate">{group.name}</h2>
        </div>
        <span className="text-forest-600 text-xs">{group.memberCount} members</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 py-2 border-b border-forest-800 flex-shrink-0">
        {['letters','members'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors
              ${tab === t ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
            {t === 'letters' ? '✉️ Letters' : '👥 Members'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Letters tab */}
        {tab === 'letters' && (
          <div className="p-5 space-y-4">
            {/* Compose */}
            <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4 space-y-3">
              <textarea className="w-full bg-forest-950/60 border border-forest-800 focus:border-forest-600 text-forest-100
                placeholder-forest-700 rounded-xl px-3 py-2.5 text-sm resize-none outline-none transition-colors"
                rows={3} placeholder={`Write to ${group.name}…`} maxLength={500}
                value={content} onChange={e => setContent(e.target.value)} />
              <div className="flex items-center justify-between">
                <span className="text-forest-700 text-xs">{content.length}/500</span>
                <button onClick={handleSend} disabled={sending || !content.trim()}
                  className="btn-primary text-sm py-1.5 px-5 rounded-full">
                  {sending ? 'Sending…' : 'Send to group ✉️'}
                </button>
              </div>
            </div>

            {/* Letter list */}
            {loading && <p className="text-forest-600 text-sm text-center py-6">Loading…</p>}
            {letters.map(l => (
              <div key={l.id} className={`rounded-2xl border p-4 transition-all
                ${l.inTransit ? 'bg-forest-900/20 border-forest-900 opacity-75' : 'bg-forest-900/40 border-forest-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{l.isSender ? '↑' : '↓'}</span>
                  <span className="text-forest-300 text-sm font-medium">{l.isSender ? 'You' : l.senderName}</span>
                  <span className="text-forest-700 text-xs ml-auto">
                    {l.inTransit ? `arrives in ~${Math.ceil((new Date(l.arrivesAt) - Date.now()) / 60000)}m` : new Date(l.sentAt).toLocaleDateString()}
                  </span>
                </div>
                {l.inTransit ? (
                  <p className="text-forest-600 text-sm italic">Letter on its way… ✉️</p>
                ) : (
                  <p className="text-forest-200 text-sm leading-relaxed">{l.content}</p>
                )}
              </div>
            ))}
            {!loading && letters.length === 0 && (
              <p className="text-forest-600 text-sm text-center py-8">No letters yet — write the first one!</p>
            )}
          </div>
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <div className="p-5 space-y-4">
            {/* Add member (admin only) */}
            {group.isAdmin && addableFriends.length > 0 && (
              <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
                <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Add a connection</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {addableFriends.map(f => (
                    <div key={f.id} className="flex items-center gap-3 py-1">
                      <div className="w-7 h-7 rounded-full bg-forest-700 flex items-center justify-center text-xs text-forest-200 flex-shrink-0">
                        {f.displayName?.[0]?.toUpperCase()}
                      </div>
                      <p className="text-forest-200 text-sm flex-1">{f.displayName}</p>
                      <button onClick={() => handleAdd(f.id)}
                        className="text-xs text-forest-400 hover:text-forest-200 px-3 py-1 rounded-lg bg-forest-800 hover:bg-forest-700 transition-colors">
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current members */}
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-forest-900/40 border border-forest-800">
                  <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-forest-200 text-sm flex-shrink-0">
                    {m.displayName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-forest-200 text-sm font-medium">{m.displayName}</p>
                    <p className="text-forest-600 text-xs">{m.city || m.country}</p>
                  </div>
                  {m.isAdmin && <span className="text-xs text-forest-500 bg-forest-800 px-2 py-0.5 rounded-full">Admin</span>}
                  {m.id !== user?.id && group.isAdmin && !m.isAdmin && (
                    <button onClick={() => handleRemove(m.id)}
                      className="text-forest-700 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-950/40 transition-colors">
                      Remove
                    </button>
                  )}
                  {m.id === user?.id && !group.isAdmin && (
                    <button onClick={() => handleRemove(m.id)}
                      className="text-forest-700 hover:text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-950/40 transition-colors">
                      Leave
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Delete group (admin only) */}
            {group.isAdmin && (
              <button onClick={async () => {
                if (!window.confirm('Delete this group? This cannot be undone.')) return
                try { await groupsApi.delete(group.id); onBack(); onUpdated() }
                catch (err) { alert(err.response?.data?.error || 'Failed') }
              }} className="w-full text-red-500 hover:text-red-300 text-sm py-2.5 rounded-xl border border-red-900/50 hover:bg-red-950/30 transition-colors mt-2">
                🗑️ Delete group
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main GroupsPage ───────────────────────────────────────────────────────────
export default function GroupsPage() {
  const [groups, setGroups]     = useState([])
  const [friends, setFriends]   = useState([])
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]   = useState(true)

  const reload = useCallback(async () => {
    try {
      const [g, f] = await Promise.all([groupsApi.list(), friendsApi.list()])
      setGroups(g.data)
      setFriends(f.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  if (selected) {
    const group = groups.find(g => g.id === selected)
    if (group) return (
      <GroupDetail
        group={group}
        friends={friends}
        onUpdated={reload}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-forest-50">☘️ Groups</h1>
          <p className="text-forest-600 text-xs mt-0.5">Shared spaces with your connections</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-forest-600 hover:bg-forest-500 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">
          + New group
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading && <p className="text-forest-600 text-sm text-center py-12">Loading groups…</p>}

        {!loading && groups.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">☘️</div>
            <p className="text-forest-400 font-medium">No groups yet</p>
            <p className="text-forest-600 text-sm mt-1 mb-5">Create a group to share letters with multiple connections at once.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm rounded-full px-6">
              Create your first group
            </button>
          </div>
        )}

        {groups.map(g => (
          <button key={g.id} onClick={() => setSelected(g.id)}
            className="w-full rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-600 p-4 text-left transition-all group">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: g.color + '22', border: `1px solid ${g.color}44` }}>
                ☘️
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-forest-100 font-medium" style={{ color: g.color }}>{g.name}</p>
                {g.description && <p className="text-forest-500 text-xs mt-0.5 truncate">{g.description}</p>}
                <p className="text-forest-700 text-xs mt-1">{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}{g.isAdmin ? ' · Admin' : ''}</p>
              </div>
              <span className="text-forest-700 group-hover:text-forest-400 text-lg transition-colors">→</span>
            </div>
          </button>
        ))}
      </div>

      {showCreate && <CreateGroupModal onCreated={g => { setGroups(prev => [g, ...prev]); reload() }} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
