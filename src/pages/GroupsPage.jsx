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

function timeUntil(date) {
  const ms = new Date(date) - Date.now()
  if (ms <= 0) return 'arrived'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m/60)}h ${m%60}m`
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
      onCreated(data); onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed')
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
            <label className="block text-forest-400 text-xs uppercase tracking-wide mb-2">Colour</label>
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

// ── Group Detail ──────────────────────────────────────────────────────────────
function GroupDetail({ group, friends, onUpdated, onBack }) {
  const { user } = useAuth()
  const [members, setMembers]     = useState([])
  const [outbound, setOutbound]   = useState([])
  const [letters, setLetters]     = useState([])
  const [tab, setTab]             = useState('letters')
  const [content, setContent]     = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)

  const reload = useCallback(async () => {
    try {
      const [m, l, o] = await Promise.all([
        groupsApi.members(group.id),
        groupsApi.letters(group.id),
        group.isAdmin ? groupsApi.outbound() : Promise.resolve({ data: [] }),
      ])
      setMembers(m.data)
      setLetters(l.data)
      setOutbound((o.data || []).filter(p => p.groupId === group.id))
    } catch {} finally { setLoading(false) }
  }, [group.id, group.isAdmin])

  useEffect(() => { reload() }, [reload])

  // Auto-refresh letters to show arrivals
  useEffect(() => {
    const iv = setInterval(() => {
      const hasTransit = letters.some(l => l.inTransit)
      if (hasTransit) reload()
    }, 5000)
    return () => clearInterval(iv)
  }, [letters, reload])

  const acceptedMembers = members.filter(m => m.status === 'accepted')
  const pendingMembers  = members.filter(m => m.status === 'pending')
  const memberIds = new Set(members.map(m => m.id))
  const outboundIds = new Set(outbound.map(o => o.inviteeId))
  const addableFriends = friends.filter(f => !memberIds.has(f.id) && !outboundIds.has(f.id))

  const handleSend = async () => {
    if (!content.trim()) return
    setSending(true)
    try { await groupsApi.sendLetter(group.id, content); setContent(''); reload() }
    catch (err) { alert(err.response?.data?.error || 'Failed to send') }
    finally { setSending(false) }
  }

  const handleInvite = async (friendId) => {
    try { await groupsApi.invite(group.id, friendId); reload() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const handleRecall = async (groupId, userId) => {
    if (!window.confirm('Recall this invite?')) return
    try { await groupsApi.recallInvite(groupId, userId); reload() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this member?')) return
    try { await groupsApi.removeMember(group.id, memberId); reload() }
    catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack} className="text-forest-500 hover:text-forest-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800">←</button>
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: group.color }} />
        <h2 className="font-display text-forest-100 text-xl truncate flex-1">{group.name}</h2>
        <span className="text-forest-600 text-xs">{acceptedMembers.length} members</span>
      </div>

      <div className="flex gap-1 px-5 py-2 border-b border-forest-800 flex-shrink-0">
        {[['letters','✉️ Letters'],['members','👥 Members']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab === t ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
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

            {loading && <p className="text-forest-600 text-sm text-center py-6">Loading…</p>}

            {letters.map(l => (
              <div key={l.id} className={`rounded-2xl border p-4 transition-all
                ${l.inTransit ? 'bg-forest-900/20 border-forest-900 opacity-75' : 'bg-forest-900/40 border-forest-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{l.isSender ? '↑' : '↓'}</span>
                  <span className="text-forest-300 text-sm font-medium">{l.isSender ? 'You' : l.senderName}</span>
                  <span className="text-forest-700 text-xs ml-auto">
                    {new Date(l.sentAt).toLocaleDateString()}
                  </span>
                </div>

                {l.inTransit ? (
                  <p className="text-forest-600 text-sm italic">Letter on its way… arrives in {timeUntil(l.arrivesAt)} ✉️</p>
                ) : (
                  <p className="text-forest-200 text-sm leading-relaxed">{l.content}</p>
                )}

                {/* Delivered to list — only show to sender */}
                {l.isSender && l.deliveries && l.deliveries.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-forest-800 space-y-1">
                    <p className="text-forest-600 text-xs uppercase tracking-wide mb-1.5">Delivery status</p>
                    {l.deliveries.map(d => (
                      <div key={d.recipientId} className="flex items-center gap-2 text-xs">
                        <span className={d.arrived ? 'text-forest-400' : 'text-forest-700'}>
                          {d.arrived ? '✓' : '✈️'}
                        </span>
                        <span className={d.arrived ? 'text-forest-300' : 'text-forest-600'}>
                          {d.displayName}
                        </span>
                        {!d.arrived && (
                          <span className="text-forest-700 ml-auto">~{timeUntil(d.arrivesAt)}</span>
                        )}
                        {d.arrived && d.openedAt && (
                          <span className="text-forest-600 ml-auto">opened ✓</span>
                        )}
                        {d.arrived && !d.openedAt && (
                          <span className="text-forest-700 ml-auto">unread</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {!loading && letters.length === 0 && (
              <p className="text-forest-600 text-sm text-center py-8">No letters yet — write the first one!</p>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="p-5 space-y-4">
            {/* Add member (admin only) */}
            {group.isAdmin && addableFriends.length > 0 && (
              <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
                <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Invite a connection</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {addableFriends.map(f => (
                    <div key={f.id} className="flex items-center gap-3 py-1">
                      <div className="w-7 h-7 rounded-full bg-forest-700 flex items-center justify-center text-xs text-forest-200 flex-shrink-0">
                        {f.displayName?.[0]?.toUpperCase()}
                      </div>
                      <p className="text-forest-200 text-sm flex-1">{f.displayName}</p>
                      <button onClick={() => handleInvite(f.id)}
                        className="text-xs text-forest-400 hover:text-forest-200 px-3 py-1 rounded-lg bg-forest-800 hover:bg-forest-700 transition-colors">
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending invites sent (outbound) */}
            {group.isAdmin && outbound.length > 0 && (
              <div className="rounded-2xl bg-forest-900/30 border border-forest-800 p-4">
                <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">⏳ Awaiting response</p>
                {outbound.map(o => (
                  <div key={o.inviteeId} className="flex items-center gap-3 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-forest-800 flex items-center justify-center text-xs text-forest-400 flex-shrink-0">
                      {o.inviteeName?.[0]?.toUpperCase()}
                    </div>
                    <p className="text-forest-400 text-sm flex-1">{o.inviteeName}</p>
                    <button onClick={() => handleRecall(o.groupId, o.inviteeId)}
                      className="text-xs text-red-500 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-950/30 transition-colors">
                      Recall
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Accepted members */}
            <div className="space-y-2">
              {acceptedMembers.map(m => (
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

            {group.isAdmin && (
              <button onClick={async () => {
                if (!window.confirm('Delete this group?')) return
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


// ── Mute menu ─────────────────────────────────────────────────────────────────
function MuteMenu({ group, onToggle }) {
  const [open, setOpen] = useState(false)

  const handleMute = async (muted) => {
    setOpen(false)
    try {
      await groupsApi.toggleMute(group.id, muted)
      onToggle()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-forest-600 hover:text-forest-300 hover:bg-forest-800 transition-colors text-sm">
        ···
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-40 rounded-xl bg-forest-900 border border-forest-700 shadow-xl overflow-hidden">
            <button onClick={() => handleMute(!group.muted)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-forest-200 hover:bg-forest-800 transition-colors text-left">
              <span>{group.muted ? '🔔' : '🔕'}</span>
              <span>{group.muted ? 'Unmute group' : 'Mute group'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main GroupsPage ───────────────────────────────────────────────────────────
export default function GroupsPage() {
  const [groups, setGroups]     = useState([])
  const [invites, setInvites]   = useState([])
  const [friends, setFriends]   = useState([])
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading]   = useState(true)

  const reload = useCallback(async () => {
    try {
      const [g, inv, f] = await Promise.all([
        groupsApi.list(), groupsApi.invites(), friendsApi.list()
      ])
      setGroups(g.data)
      setInvites(inv.data)
      setFriends(f.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleRespond = async (groupId, action) => {
    try {
      await groupsApi.respondInvite(groupId, action)
      reload()
    } catch (err) { alert(err.response?.data?.error || 'Failed') }
  }

  if (selected) {
    const group = groups.find(g => g.id === selected)
    if (group) return (
      <GroupDetail group={group} friends={friends} onUpdated={reload} onBack={() => setSelected(null)} />
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

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && <p className="text-forest-600 text-sm text-center py-12">Loading groups…</p>}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="space-y-2">
            <p className="text-forest-500 text-xs uppercase tracking-wide">Invitations</p>
            {invites.map(inv => (
              <div key={inv.groupId} className="rounded-2xl border p-4 flex items-start gap-3"
                style={{ borderColor: inv.groupColor + '55', background: inv.groupColor + '11' }}>
                <span className="text-2xl">☘️</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: inv.groupColor }}>{inv.groupName}</p>
                  <p className="text-forest-500 text-xs mt-0.5">{inv.inviterName} invited you</p>
                  {inv.groupDescription && <p className="text-forest-600 text-xs mt-1">{inv.groupDescription}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleRespond(inv.groupId, 'decline')}
                    className="text-xs text-forest-500 hover:text-forest-300 px-3 py-1.5 rounded-full border border-forest-700 hover:border-forest-500 transition-colors">
                    Decline
                  </button>
                  <button onClick={() => handleRespond(inv.groupId, 'accept')}
                    className="text-xs text-white px-3 py-1.5 rounded-full font-medium transition-colors"
                    style={{ background: inv.groupColor }}>
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groups list */}
        {!loading && groups.length === 0 && invites.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">☘️</div>
            <p className="text-forest-400 font-medium">No groups yet</p>
            <p className="text-forest-600 text-sm mt-1 mb-5">Create a group to send letters to multiple connections at once.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm rounded-full px-6">
              Create your first group
            </button>
          </div>
        )}

        {groups.map(g => (
          <div key={g.id} className="rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-600 transition-all">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => setSelected(g.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: g.color + '22', border: `1px solid ${g.color}44` }}>
                  ☘️
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium" style={{ color: g.color }}>{g.name}</p>
                  {g.description && <p className="text-forest-500 text-xs mt-0.5 truncate">{g.description}</p>}
                  <p className="text-forest-700 text-xs mt-1">
                    {g.memberCount} member{g.memberCount !== 1 ? 's' : ''}{g.isAdmin ? ' · Admin' : ''}
                    {g.muted ? ' · 🔕 Muted' : ''}
                  </p>
                </div>
              </button>
              {/* 3-dot mute menu */}
              <MuteMenu group={g} onToggle={reload} />
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateGroupModal
          onCreated={g => { setGroups(prev => [g, ...prev]); reload() }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
