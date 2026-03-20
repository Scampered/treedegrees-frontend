// src/pages/AdminPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { adminApi } from '../api/client'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatTile({ value, label, color = 'text-forest-100' }) {
  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4 text-center">
      <p className={`font-display text-3xl ${color}`}>{value ?? '—'}</p>
      <p className="text-forest-500 text-xs mt-1">{label}</p>
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-red-600' : 'bg-forest-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

// ── Edit user modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onSave, onBan, onClose }) {
  const [form, setForm] = useState({
    fullName: user.fullName || '',
    nickname: user.nickname || '',
    bio: '',
    city: user.city || '',
    country: user.country || '',
  })
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [confirmBan, setConfirmBan] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setStatus('')
    try {
      await adminApi.editUser(user.id, form)
      setStatus('✓ Saved')
      onSave()
    } catch (err) {
      setStatus(err.response?.data?.error || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <h3 className="text-forest-100 font-medium">Edit User</h3>
          <button onClick={onClose} className="text-forest-500 hover:text-forest-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-forest-800">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-xs text-forest-600 mb-2">
            ID: <span className="font-mono text-forest-500">{user.id}</span> · {user.email}
          </div>
          {[
            ['Full name', 'fullName'],
            ['Nickname', 'nickname'],
            ['Bio', 'bio'],
            ['City', 'city'],
            ['Country', 'country'],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1">{label}</label>
              <input type="text" className="input text-sm"
                placeholder={`Current: ${user[key] || '—'}`}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <div className="flex-1">
            {status && <p className={`text-sm ${status.startsWith('✓') ? 'text-forest-400' : 'text-red-400'}`}>{status}</p>}
          </div>
          {!confirmBan ? (
            <button onClick={() => setConfirmBan(true)} className="text-xs text-red-500 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950/40 transition-colors">
              Ban user
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={async () => { await onBan(user.id); onClose() }}
                className="text-xs text-red-400 bg-red-950/40 hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors">
                Confirm ban
              </button>
              <button onClick={() => setConfirmBan(false)} className="text-xs text-forest-500 px-3 py-1.5">Cancel</button>
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            className="btn-primary text-sm py-2 px-5 rounded-full">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [userPages, setUserPages] = useState(1)
  const [search, setSearch] = useState('')
  const [maintenance, setMaintenance] = useState([])
  const [log, setLog] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [adminGroups, setAdminGroups] = useState([])
  const [adminGames, setAdminGames] = useState([])
  const [popups, setPopups] = useState([])
  const [popupForm, setPopupForm] = useState({ target: 'all', header: '', subheader: '', buttonText: 'Okay', expiresHours: '' })
  const [sendingPopup, setSendingPopup] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const { data } = await adminApi.stats()
      setStats(data)
    } catch {}
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await adminApi.users(search, userPage)
      setUsers(data.users)
      setUserTotal(data.total)
      setUserPages(data.pages)
    } catch {}
  }, [search, userPage])

  const loadMaintenance = useCallback(async () => {
    try {
      const { data } = await adminApi.maintenance()
      setMaintenance(data)
    } catch {}
  }, [])

  const loadLog = useCallback(async () => {
    try {
      const { data } = await adminApi.log()
      setLog(data)
    } catch {}
  }, [])

  useEffect(() => {
    Promise.all([loadStats(), loadMaintenance()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab === 'users') loadUsers()
    if (tab === 'log') loadLog()
    if (tab === 'groups') adminApi.stats().then(() => {}).catch(() => {})
    if (tab === 'games') adminApi.stats().then(() => {}).catch(() => {})
    if (tab === 'popups') adminApi.popups().then(r => setPopups(r.data)).catch(() => {})
  }, [tab, loadUsers, loadLog])

  useEffect(() => {
    if (tab === 'users') loadUsers()
  }, [search, userPage])

  const toggleMaintenance = async (pageKey, currentDown) => {
    try {
      await adminApi.setMaintenance(pageKey, !currentDown)
      loadMaintenance()
    } catch {}
  }

  const handleBan = async (userId) => {
    try {
      await adminApi.banUser(userId)
      loadUsers()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to ban')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-forest-600">Loading admin…</div>
  )

  const tabs = [
    ['overview', '📊 Overview'],
    ['users', '👤 Users'],
    ['groups', '☘️ Groups'],
    ['games', '🎮 Games'],
    ['maintenance', '🔧 Maintenance'],
    ['popups', '📢 Popups'],
    ['log', '📋 Log'],
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center gap-3 flex-shrink-0">
        <span className="text-xl">👑</span>
        <h1 className="font-display text-forest-100 text-xl">Admin Panel</h1>
        <span className="text-xs text-forest-600 ml-auto">Access is logged</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 py-2 border-b border-forest-800 flex-shrink-0">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${tab === key ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">

        {/* ── Overview ── */}
        {tab === 'overview' && stats && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile value={stats.totalUsers} label="Total users" />
              <StatTile value={`+${stats.newUsersWeek}`} label="New this week" color="text-forest-400" />
              <StatTile value={stats.totalConnections} label="Connections" />
              <StatTile value={stats.totalLetters} label="Total letters" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatTile value={stats.lettersToday} label="Letters today" color="text-bark-300" />
              <StatTile value={stats.lettersInTransit} label="In transit" color="text-forest-300" />
              <StatTile value={stats.notesToday} label="Notes today" />
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <input type="text" className="input text-sm flex-1"
                placeholder="Search by name, nickname, or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setUserPage(1) }} />
            </div>
            <p className="text-forest-600 text-xs">{userTotal} users · page {userPage}/{userPages}</p>

            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="rounded-xl bg-forest-900/40 border border-forest-800 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-sm text-forest-200 flex-shrink-0">
                    {(u.nickname || u.fullName)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-forest-200 text-sm font-medium truncate">
                        {u.nickname || u.fullName}
                      </p>
                      {u.isAdmin && <span className="text-xs px-1.5 py-0.5 rounded bg-bark-800 text-bark-300">admin</span>}
                    </div>
                    <p className="text-forest-600 text-xs truncate">{u.email} · {u.city}, {u.country}</p>
                    <p className="text-forest-700 text-xs">{u.connectionCount} connections · {u.letterCount} letters</p>
                  </div>
                  <button onClick={() => setEditingUser(u)}
                    className="text-xs text-forest-400 hover:text-forest-200 px-3 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-700 transition-colors flex-shrink-0">
                    Edit
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex gap-2 justify-center">
              {Array.from({ length: Math.min(userPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setUserPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs transition-colors
                    ${p === userPage ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:bg-forest-900'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Maintenance ── */}
        {tab === 'maintenance' && (
          <div className="space-y-4">
            <p className="text-forest-500 text-sm">Toggle a page offline. Users will see a maintenance screen.</p>
            <div className="space-y-3">
              {maintenance.map(m => (
                <div key={m.page_key} className={`rounded-xl border p-4 flex items-center gap-4 transition-colors
                  ${m.is_down ? 'bg-red-950/20 border-red-900/50' : 'bg-forest-900/40 border-forest-800'}`}>
                  <div className="flex-1">
                    <p className="text-forest-200 text-sm font-medium capitalize">/{m.page_key}</p>
                    <p className={`text-xs mt-0.5 ${m.is_down ? 'text-red-400' : 'text-forest-600'}`}>
                      {m.is_down ? '🔴 Maintenance' : '🟢 Live'}
                    </p>
                  </div>
                  <Toggle checked={m.is_down} onChange={() => toggleMaintenance(m.page_key, m.is_down)} />
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-forest-900/30 border border-forest-800 p-4">
              <p className="text-forest-500 text-xs">
                When a page is under maintenance, users see a friendly message and cannot access it.
                The map, friends, feed, letters, and settings pages can each be toggled independently.
              </p>
            </div>
          </div>
        )}

        {/* ── Groups ── */}
        {tab === 'groups' && (
          <div className="space-y-4">
            <p className="text-forest-500 text-sm">Groups are managed by their admins. As a site admin you can view all groups and their stats here.</p>
            <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4 space-y-2">
              <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Group stats (from overview)</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-forest-400">Total connections</span>
                <span className="text-forest-100">{stats?.totalConnections ?? '—'}</span>
              </div>
              <p className="text-forest-600 text-xs mt-2">Group data is managed per-group by admins. Use the Users tab to find and manage specific group admins.</p>
            </div>
          </div>
        )}

        {/* ── Games ── */}
        {tab === 'games' && (
          <div className="space-y-4">
            <p className="text-forest-500 text-sm">Active Trump Card game sessions across all groups.</p>
            <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4 space-y-2">
              <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Game stats</p>
              <div className="space-y-2">
                {[
                  ['Letters today', stats?.lettersToday],
                  ['Letters in transit', stats?.lettersInTransit],
                  ['Notes today', stats?.notesToday],
                ].map(([l,v]) => (
                  <div key={l} className="flex items-center justify-between text-sm">
                    <span className="text-forest-400">{l}</span>
                    <span className="text-forest-100">{v ?? '—'}</span>
                  </div>
                ))}
              </div>
              <p className="text-forest-600 text-xs mt-3">Game session management coming soon. Players can end games from the game screen.</p>
            </div>
            <div className="rounded-2xl bg-forest-900/30 border border-forest-800 p-4">
              <p className="text-forest-300 text-sm font-medium mb-2">🃏 Trump Card</p>
              <p className="text-forest-500 text-sm">Turn-based military card game. 2–9 players. 63-card deck. Special cards: Divert Attack, Call Reinforcements, Spy Operation, Block Communications.</p>
            </div>
          </div>
        )}

                {/* ── Popups ── */}
        {tab === 'popups' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5 space-y-4">
              <h3 className="text-forest-200 font-medium">Send a popup message</h3>
              <div>
                <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1">Target</label>
                <select className="input text-sm" value={popupForm.target}
                  onChange={e => setPopupForm(p => ({ ...p, target: e.target.value }))}>
                  <option value="all">All users</option>
                  <option value="custom">Specific user ID…</option>
                </select>
                {popupForm.target === 'custom' && (
                  <input type="text" className="input text-sm mt-2 font-mono" placeholder="User UUID"
                    onChange={e => setPopupForm(p => ({ ...p, target: e.target.value }))} />
                )}
              </div>
              <div>
                <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1">Header *</label>
                <input type="text" className="input text-sm" placeholder="e.g. Verify your email"
                  value={popupForm.header} onChange={e => setPopupForm(p => ({ ...p, header: e.target.value }))} maxLength={120} />
              </div>
              <div>
                <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1">Message</label>
                <textarea className="input text-sm resize-none h-20" placeholder="More detail shown below the header…"
                  value={popupForm.subheader} onChange={e => setPopupForm(p => ({ ...p, subheader: e.target.value }))} maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1">Button text</label>
                  <input type="text" className="input text-sm" value={popupForm.buttonText}
                    onChange={e => setPopupForm(p => ({ ...p, buttonText: e.target.value }))} maxLength={50} />
                </div>
                <div>
                  <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1">Expires in (hours)</label>
                  <input type="number" className="input text-sm" placeholder="Leave blank = never"
                    value={popupForm.expiresHours} onChange={e => setPopupForm(p => ({ ...p, expiresHours: e.target.value }))} />
                </div>
              </div>
              <button disabled={sendingPopup || !popupForm.header.trim()}
                onClick={async () => {
                  setSendingPopup(true)
                  try {
                    await adminApi.createPopup({
                      target: popupForm.target,
                      header: popupForm.header,
                      subheader: popupForm.subheader,
                      buttonText: popupForm.buttonText,
                      expiresHours: popupForm.expiresHours ? parseInt(popupForm.expiresHours) : null,
                    })
                    setPopupForm({ target: 'all', header: '', subheader: '', buttonText: 'Okay', expiresHours: '' })
                    const r = await adminApi.popups()
                    setPopups(r.data)
                  } catch {} finally { setSendingPopup(false) }
                }}
                className="btn-primary text-sm rounded-full px-6">
                {sendingPopup ? 'Sending…' : '📢 Send popup'}
              </button>
            </div>

            {/* Existing popups */}
            {popups.length > 0 && (
              <div className="space-y-2">
                <p className="text-forest-500 text-xs uppercase tracking-wide">Active popups</p>
                {popups.map(p => (
                  <div key={p.id} className="rounded-xl bg-forest-900/40 border border-forest-800 p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-forest-200 text-sm font-medium">{p.header}</p>
                      {p.subheader && <p className="text-forest-500 text-xs mt-0.5 truncate">{p.subheader}</p>}
                      <p className="text-forest-700 text-xs mt-1">Target: {p.target} · Button: "{p.button_text}"</p>
                    </div>
                    <button onClick={async () => {
                      await adminApi.deletePopup(p.id)
                      setPopups(prev => prev.filter(x => x.id !== p.id))
                    }} className="text-red-500 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-950/40 transition-colors flex-shrink-0">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Log ── */}
        {tab === 'log' && (
          <div className="space-y-2">
            {log.length === 0 && <p className="text-forest-600 text-sm text-center py-8">No actions logged yet</p>}
            {log.map(entry => (
              <div key={entry.id} className="rounded-xl bg-forest-900/30 border border-forest-800 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-forest-200 text-sm">
                    <span className="text-forest-400">{entry.admin_name || 'Admin'}</span>
                    {' → '}
                    <span className="font-mono text-xs text-forest-300">{entry.action}</span>
                  </p>
                  <p className="text-forest-700 text-xs flex-shrink-0">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                {entry.details && (
                  <p className="text-forest-600 text-xs mt-1 font-mono">{entry.details}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={() => { loadUsers(); setEditingUser(null) }}
          onBan={handleBan}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  )
}
