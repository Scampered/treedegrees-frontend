// src/pages/GamesPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gamesApi, groupsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import TrumpCardGame from './TrumpCardGame'

export default function GamesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [games, setGames]       = useState([])
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [activeGame, setActiveGame] = useState(null)
  const [error, setError]       = useState('')

  const reload = useCallback(async () => {
    try {
      const [g, grps] = await Promise.all([gamesApi.list(), groupsApi.list()])
      setGames(g.data || [])
      setGroups(grps.data || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { if (!activeGame) { const iv = setInterval(reload, 5000); return () => clearInterval(iv) } }, [reload, activeGame])

  const createGame = async () => {
    if (!selectedGroup) return
    setCreating(true)
    setError('')
    try {
      const { data } = await gamesApi.create(selectedGroup)
      await gamesApi.join(data.id)
      setActiveGame(data.id)
      reload()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create game')
    } finally { setCreating(false) }
  }

  const joinGame = async (id) => {
    try {
      await gamesApi.join(id)
      setActiveGame(id)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join')
    }
  }

  if (activeGame) {
    return (
      <div className="flex flex-col h-full">
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/80 flex-shrink-0">
          <button onClick={() => { setActiveGame(null); reload() }} className="text-gray-500 hover:text-gray-300 text-sm">← Back</button>
          <span className="text-gray-300 text-sm font-medium">🃏 Trump Card</span>
        </div>
        <div className="flex-1 min-h-0">
          <TrumpCardGame gameId={activeGame} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex-shrink-0">
        <h1 className="font-display text-2xl text-forest-50">🎮 Games</h1>
        <p className="text-forest-600 text-xs mt-0.5">Play with your groups</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Create new game */}
        <div className="rounded-2xl bg-forest-900/40 border border-forest-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-forest-800">
            <p className="text-forest-200 font-medium">🃏 Trump Card</p>
            <p className="text-forest-500 text-xs mt-0.5">Turn-based military card battle for 2–9 players</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className="block text-forest-400 text-xs uppercase tracking-wide mb-1.5">Create game in group</label>
              <select className="input text-sm" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                <option value="">— Pick a group —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={createGame} disabled={creating || !selectedGroup}
              className="btn-primary text-sm py-2.5 px-5 rounded-xl w-full">
              {creating ? 'Creating…' : '⚔️ Create Game'}
            </button>
          </div>
        </div>

        {/* Active games */}
        {!loading && games.length > 0 && (
          <div className="space-y-3">
            <p className="text-forest-500 text-xs uppercase tracking-wide">Active games in your groups</p>
            {games.map(g => (
              <div key={g.id} className="rounded-2xl bg-forest-900/40 border border-forest-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">🃏</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-forest-200 font-medium">Trump Card</p>
                    <p className="text-forest-600 text-xs">
                      {g.groupName} · {g.playerCount} player{g.playerCount !== 1 ? 's' : ''} · {g.status}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${g.status === 'waiting' ? 'bg-forest-800 text-forest-300' : 'bg-bark-900 text-bark-300'}`}>
                    {g.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => joinGame(g.id)}
                    className="flex-1 py-2 text-sm bg-forest-700 hover:bg-forest-600 text-forest-100 rounded-xl transition-colors">
                    {g.status === 'waiting' ? '🚪 Join' : '👁️ Spectate'}
                  </button>
                  <button onClick={() => setActiveGame(g.id)}
                    className="flex-1 py-2 text-sm bg-forest-800 hover:bg-forest-700 text-forest-200 rounded-xl transition-colors">
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎮</div>
            <p className="text-forest-400 font-medium">No active games</p>
            <p className="text-forest-600 text-sm mt-1">Create a game in one of your groups above to start playing!</p>
          </div>
        )}
      </div>
    </div>
  )
}
