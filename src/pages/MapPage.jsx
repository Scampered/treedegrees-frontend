// src/pages/MapPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Polyline, Popup, Tooltip, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { graphApi, lettersApi, friendsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const DEGREE_STYLES = {
  0: { color: '#2d9e2d', fillColor: '#2d9e2d', radius: 11, weight: 3, fillOpacity: 0.95 },
  1: { color: '#80d580', fillColor: '#4dba4d', radius: 9,  weight: 2, fillOpacity: 0.85 },
  2: { color: '#d0b47f', fillColor: '#966535', radius: 7,  weight: 2, fillOpacity: 0.75 },
  3: { color: '#6868b8', fillColor: '#3a3a6a', radius: 5,  weight: 1.5, fillOpacity: 0.65 },
}

// Circle colours per degree for the divIcon
// Hidden-by-private-link style
const HIDDEN_COLOR = { bg: '#1a1a1a', border: '#555555', size: 14 }

const DEGREE_COLORS = {
  0: { bg: '#1f7e1f', border: '#80d580', size: 22 },
  1: { bg: '#2d7a2d', border: '#5dba5d', size: 18 },
  2: { bg: '#7a5028', border: '#c8a060', size: 14 },
  3: { bg: '#2a2a5e', border: '#5858a8', size: 11 },
}

const LINE_STYLES = {
  0: { color: '#2d9e2d', weight: 2, opacity: 0.8 },
  1: { color: '#4dba4d', weight: 1.5, opacity: 0.7 },
  2: { color: '#966535', weight: 1, opacity: 0.5, dashArray: '6 4' },
  3: { color: '#3a3a6a', weight: 1, opacity: 0.4, dashArray: '3 5' },
}
const PRIVATE_LINE = { color: '#555', weight: 1, opacity: 0.35, dashArray: '2 6' }

// ── Build a DivIcon with optional note badge ──────────────────────────────────
function buildNoteIcon(degree, hasNote, isHidden) {
  if (isHidden) {
    const { bg, border, size } = HIDDEN_COLOR
    const half = size / 2
    return L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [half, half],
      popupAnchor: [0, -half - 4],
      tooltipAnchor: [0, -half - 4],
      html: `<div style="position:relative;width:${size}px;height:${size}px;">
        <div style="width:${size}px;height:${size}px;border-radius:50%;
          background:${bg};border:2px dashed ${border};
          display:flex;align-items:center;justify-content:center;
          font-size:9px;color:#777;font-weight:bold;">?</div>
      </div>`,
    })
  }

  const { bg, border, size } = DEGREE_COLORS[degree] || DEGREE_COLORS[3]
  const half = size / 2

  const badge = hasNote
    ? `<div style="
        position:absolute;
        top:-4px;right:-4px;
        width:10px;height:10px;
        border-radius:50%;
        background:white;
        border:2px solid #0d2b0d;
        box-shadow:0 0 4px rgba(0,0,0,0.6);
        z-index:10;
      "></div>`
    : ''

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 4],
    tooltipAnchor: [0, -half - 4],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          width:${size}px;height:${size}px;
          border-radius:50%;
          background:${bg};
          border:${degree === 0 ? 3 : 2}px solid ${border};
          box-shadow:0 0 ${degree === 0 ? 10 : 5}px ${bg}88;
        "></div>
        ${badge}
      </div>`,
  })
}

// ── Note tooltip popup styling ────────────────────────────────────────────────
const noteTooltipStyle = `
  .note-tooltip .leaflet-tooltip {
    background: #0d2b0d !important;
    border: 1px solid #2d9e2d !important;
    color: #e0ffe0 !important;
    border-radius: 12px !important;
    padding: 10px 14px !important;
    font-family: Dosis, sans-serif !important;
    font-size: 13px !important;
    max-width: 220px !important;
    white-space: normal !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  .note-tooltip .leaflet-tooltip::before {
    border-top-color: #2d9e2d !important;
  }
  .leaflet-popup-content-wrapper {
    background: #0d2b0d !important;
    border: 1px solid #196219 !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.6) !important;
    padding: 0 !important;
  }
  .leaflet-popup-content {
    margin: 0 !important;
  }
  .leaflet-popup-tip {
    background: #0d2b0d !important;
  }
`


// ── Custom region labels overlay ──────────────────────────────────────────────
// These labels render on top of the base tile layer.
// Add/edit entries here to relabel any region on the map.
const CUSTOM_LABELS = [
  // Palestinian territories
  { name: 'Palestine 🇵🇸', lat: 31.9, lon: 35.2, minZoom: 3 },
  // Western Sahara
  { name: 'Western Sahara 🇪🇭', lat: 24.2, lon: -13.0, minZoom: 4 },
  // Kashmir (disputed)
  { name: 'Kashmir', lat: 34.0, lon: 76.5, minZoom: 5 },
  // Taiwan
  { name: 'Taiwan 🇹🇼', lat: 23.7, lon: 121.0, minZoom: 4 },
  // Add more here as needed:
  // { name: 'Your Label', lat: 0.0, lon: 0.0, minZoom: 3 },
]

function CustomLabels({ zoom }) {
  return (
    <>
      {CUSTOM_LABELS.map(label => {
        if (zoom < label.minZoom) return null
        const icon = L.divIcon({
          className: '',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
          html: `<div style="
            font-family: Dosis, sans-serif;
            font-size: ${zoom >= 6 ? 13 : zoom >= 4 ? 11 : 10}px;
            font-weight: 700;
            color: #e0ffe0;
            white-space: nowrap;
            text-shadow: 0 0 6px #000, 0 0 12px #000, 1px 1px 0 #000, -1px -1px 0 #000;
            pointer-events: none;
            letter-spacing: 0.03em;
          ">${label.name}</div>`,
        })
        return (
          <Marker
            key={label.name}
            position={[label.lat, label.lon]}
            icon={icon}
            interactive={false}
            zIndexOffset={-100}
          />
        )
      })}
    </>
  )
}


// ── Vehicle markers for in-transit letters ────────────────────────────────────
function buildVehicleIcon(emoji, senderInitial) {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="
      position:relative;width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));
    ">
      <div style="font-size:26px;line-height:1;">${emoji}</div>
      <div style="
        position:absolute;bottom:-2px;right:-2px;
        width:14px;height:14px;border-radius:50%;
        background:#1f7e1f;border:2px solid #80d580;
        display:flex;align-items:center;justify-content:center;
        font-size:7px;color:#e0ffe0;font-weight:bold;
        font-family:Dosis,sans-serif;
      ">${senderInitial}</div>
    </div>`,
  })
}

function interpolatePosition(lat1, lon1, lat2, lon2, t) {
  return {
    lat: lat1 + (lat2 - lat1) * t,
    lon: lon1 + (lon2 - lon1) * t,
  }
}

// ── Fuel bar component ────────────────────────────────────────────────────────
function FuelBar({ streaks }) {
  const active = streaks.filter(s => s.streakDays > 0 || s.fuel > 0)
  if (active.length === 0) return null

  return (
    <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'none' }}>
      <div className="leaflet-control" style={{
        background: 'rgba(8,34,8,0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(45,158,45,0.3)',
        borderRadius: 12,
        padding: '8px 10px',
        marginBottom: 8,
        marginLeft: 8,
        maxWidth: 180,
        pointerEvents: 'auto',
      }}>
        <p style={{ fontSize: 9, color: '#4d7a4d', fontFamily: 'Dosis,sans-serif', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Letter Streaks
        </p>
        {active.slice(0, 4).map(s => (
          <div key={s.friendId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 14 }}>{s.tierEmoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, color: '#c0e0c0', fontFamily: 'Dosis,sans-serif', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.displayName}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i < s.fuel ? '#2d9e2d' : '#113f11',
                    border: `1px solid ${i < s.fuel ? '#4dba4d' : '#196219'}`,
                  }} />
                ))}
                {s.streakDays > 0 && (
                  <span style={{ fontSize: 9, color: '#6a6a2a', fontFamily: 'Dosis,sans-serif', marginLeft: 2 }}>
                    🔥{s.streakDays}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Inline send modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black/70">
          <MapSendModal
            friends={friends}
            streaks={streaks}
            onSend={() => { loadMap(); setShowSendModal(false) }}
            onClose={() => setShowSendModal(false)}
          />
        </div>
      )}
    </div>
  )
}

function ZoomTracker({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => { onZoom(map.getZoom()) }, [])
  return null
}

const popupStyle = {
  background: '#0d2b0d',
  color: '#f0faf0',
  borderRadius: 12,
  padding: '12px 14px',
  minWidth: 160,
  fontFamily: 'Dosis, sans-serif',
}


// ── Quick send modal on the map ───────────────────────────────────────────────
function MapSendModal({ friends, streaks, onSend, onClose }) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const selectedStreak = streaks.find(s => s.friendId === selected?.id)

  const handleSend = async () => {
    if (!content.trim()) return
    setSending(true)
    try {
      await lettersApi.send(selected.id, content)
      onSend()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send')
      setSending(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-forest-800">
        <h3 className="text-forest-200 font-medium">
          {step === 1 ? '✉️ Send a Letter' : `To ${selected?.displayName}`}
        </h3>
        <button onClick={onClose} className="text-forest-600 hover:text-forest-300 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-forest-800 transition-colors">✕</button>
      </div>

      {step === 1 && (
        <div className="p-3 max-h-64 overflow-y-auto space-y-2">
          {friends.map(f => {
            const s = streaks.find(st => st.friendId === f.id)
            return (
              <button key={f.id} onClick={() => { setSelected(f); setStep(2) }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-forest-900/50 hover:bg-forest-800 border border-forest-800 hover:border-forest-600 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-forest-200 text-xs flex-shrink-0">
                  {f.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-forest-200 text-sm">{f.displayName}</p>
                  <p className="text-forest-600 text-xs">{f.city}</p>
                </div>
                <span className="text-base">{s?.tierEmoji || '🚗'}</span>
              </button>
            )
          })}
        </div>
      )}

      {step === 2 && (
        <div className="p-4 space-y-3">
          {selectedStreak && (
            <div className="flex items-center gap-2 text-xs text-forest-500">
              <span>{selectedStreak.tierEmoji}</span>
              <span>{selectedStreak.tierLabel} · 🔥 {selectedStreak.streakDays} days</span>
              <span className="ml-auto">Fuel: {selectedStreak.fuel}/3</span>
            </div>
          )}
          <textarea
            className="w-full bg-forest-900/60 border border-forest-800 focus:border-forest-600 text-forest-100
                       placeholder-forest-700 rounded-xl px-3 py-2.5 text-sm resize-none outline-none transition-colors h-28"
            placeholder="Write your letter…"
            maxLength={500}
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 btn-ghost text-sm py-2 rounded-xl">← Back</button>
            <button onClick={handleSend} disabled={sending || !content.trim()}
              className="flex-1 btn-primary text-sm py-2 rounded-xl">
              {sending ? '…' : 'Send ✉️'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default function MapPage() {
  const { user } = useAuth()
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [hidePrivate, setHidePrivate] = useState(false)
  const [zoom, setZoom] = useState(2)
  const [inTransit, setInTransit] = useState([])
  const [vehiclePositions, setVehiclePositions] = useState([])
  const [streaks, setStreaks] = useState([])
  const [friends, setFriends] = useState([])
  const [showSendModal, setShowSendModal] = useState(false)

  const loadMap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [mapRes, transitRes, streakRes, friendRes] = await Promise.all([
        graphApi.mapData(),
        lettersApi.inTransit().catch(() => ({ data: [] })),
        lettersApi.streaks().catch(() => ({ data: [] })),
        friendsApi.list().catch(() => ({ data: [] })),
      ])
      setMapData(mapRes.data)
      setInTransit(transitRes.data)
      setStreaks(streakRes.data)
      setFriends(friendRes.data)
    } catch {
      setError('Failed to load map data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMap() }, [loadMap])

  const filteredNodes = mapData?.nodes.filter(n => {
    if (!n.latitude || !n.longitude) return false
    if (filter === 'all') return true
    return n.degree === parseInt(filter) || n.degree === 0
  }) || []

  const filteredEdges = mapData?.edges.filter(e => {
    if (hidePrivate && e.isPrivate) return false
    if (filter === 'all') return true
    return e.degree <= parseInt(filter)
  }) || []

  const nodeMap = Object.fromEntries((mapData?.nodes || []).map(n => [n.id, n]))

  const degreeLabel = (d) => {
    if (d === 0) return 'You'
    if (d === 1) return '1st degree'
    if (d === 2) return '2nd degree'
    return '3rd degree'
  }


  // Animate vehicle positions every 3 seconds
  useEffect(() => {
    function tick() {
      const now = Date.now()
      const positions = inTransit
        .filter(l => l.senderLat && l.recipientLat)
        .map(l => {
          const sentAt   = new Date(l.sentAt).getTime()
          const arrivesAt = new Date(l.arrivesAt).getTime()
          const t = Math.min(1, Math.max(0, (now - sentAt) / (arrivesAt - sentAt)))
          const pos = interpolatePosition(l.senderLat, l.senderLon, l.recipientLat, l.recipientLon, t)
          return { ...l, currentLat: pos.lat, currentLon: pos.lon, progress: t }
        })
        .filter(l => l.progress < 1)
      setVehiclePositions(positions)
    }
    tick()
    const interval = setInterval(tick, 3000)
    return () => clearInterval(interval)
  }, [inTransit])

  return (
    <div className="flex flex-col h-full">
      {/* Inject tooltip CSS */}
      <style>{noteTooltipStyle}</style>

      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-forest-800 glass-dark flex flex-wrap items-center gap-3">
        <h2 className="font-display text-forest-200 text-lg mr-2">🗺️ Globe Map</h2>
        <div className="flex items-center gap-1.5">
          {['all', '1', '2', '3'].map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${filter === v ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
              {v === 'all' ? 'All' : `${v}°`}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-forest-400 cursor-pointer ml-auto">
          <input type="checkbox" checked={hidePrivate} onChange={e => setHidePrivate(e.target.checked)}
            className="rounded border-forest-700 bg-forest-950 text-forest-500" />
          Hide private links
        </label>
        <button onClick={loadMap} className="btn-ghost text-xs py-1 px-3">↻ Refresh</button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-forest-950/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin" />
              <p className="text-forest-400 text-sm">Loading your network…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="glass rounded-xl p-6 max-w-sm text-center">
              <div className="text-3xl mb-3">🌱</div>
              <p className="text-forest-300 mb-2">{error}</p>
              <p className="text-forest-500 text-sm">Add connections to see your map grow!</p>
              <button onClick={loadMap} className="btn-primary text-sm mt-4">Try again</button>
            </div>
          </div>
        )}

        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={18}
          style={{ height: '100%', width: '100%' }}
          worldCopyJump
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />

          <ZoomTracker onZoom={setZoom} />

          {/* Custom region labels */}
          <CustomLabels zoom={zoom} />

          {/* Edges */}
          {filteredEdges.map((edge, i) => {
            const src = nodeMap[edge.source]
            const tgt = nodeMap[edge.target]
            if (!src?.latitude || !tgt?.latitude) return null
            const style = edge.isPrivate ? PRIVATE_LINE : (LINE_STYLES[edge.degree] || LINE_STYLES[3])
            return (
              <Polyline key={i}
                positions={[[src.latitude, src.longitude], [tgt.latitude, tgt.longitude]]}
                pathOptions={style}
              />
            )
          })}

          {/* Nodes */}
          {filteredNodes.map(node => {
            const isMe = node.id === mapData?.myId
            const hasNote = !isMe && !!node.dailyNote
            const icon = buildNoteIcon(node.degree, hasNote, node.hiddenByPrivateLink)

            return (
              <Marker
                key={node.id}
                position={[node.latitude, node.longitude]}
                icon={icon}
                zIndexOffset={node.degree === 0 ? 1000 : 0}
              >
                {/* Note tooltip — shows on hover above the node, not for hidden nodes */}
                {hasNote && !node.hiddenByPrivateLink && (
                  <Tooltip
                    direction="top"
                    offset={[0, -4]}
                    className="note-tooltip"
                    sticky={false}
                  >
                    <div style={{ fontFamily: 'Dosis, sans-serif' }}>
                      <p style={{ fontSize: 11, color: '#80d580', margin: '0 0 4px', fontWeight: 600 }}>
                        {node.nickname}
                      </p>
                      <p style={{ fontSize: 12, color: '#c0f0c0', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                        "{node.dailyNote}"
                      </p>
                    </div>
                  </Tooltip>
                )}

                {/* Full profile popup — shows on click */}
                <Popup autoPan={false} closeButton={false}>
                  <div style={popupStyle}>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 999,
                        background: '#196219', color: '#80d580', border: '1px solid #2d9e2d'
                      }}>
                        {degreeLabel(node.degree)}
                      </span>
                      {node.locationPrivacy && !isMe && (
                        <span style={{ fontSize: 10, marginLeft: 6, color: '#4d7a4d' }}>📍 Approx.</span>
                      )}
                    </div>

                    {isMe ? (
                      <>
                        <p style={{ fontWeight: 800, fontSize: 18, margin: '0 0 2px', color: '#80d580' }}>
                          {user?.nickname || node.nickname}
                        </p>
                        {user?.fullName && (
                          <p style={{ fontSize: 11, color: '#4d7a4d', margin: '0 0 4px' }}>
                            {user.fullName}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: '#4dba4d', margin: 0 }}>
                          {node.city}, {node.country}
                        </p>
                      </>
                    ) : (
                      <>
                        {node.hiddenByPrivateLink ? (
                          <>
                            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px', color: '#666' }}>?</p>
                            <p style={{ fontSize: 11, color: '#555', margin: 0, fontStyle: 'italic' }}>
                              Private connection — identity hidden
                            </p>
                            <p style={{ fontSize: 11, color: '#4d5a4d', margin: '4px 0 0' }}>
                              📍 {node.country} (approx.)
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 2px', color: '#e0ffe0' }}>
                              {node.nickname}
                            </p>
                            {node.fullName && (
                              <p style={{ fontSize: 11, color: '#4d7a4d', margin: '0 0 4px' }}>
                                {node.fullName}
                              </p>
                            )}
                            <p style={{ fontSize: 11, color: '#4dba4d', margin: 0 }}>
                              {node.city}, {node.country}
                              {node.locationPrivacy && <span style={{ marginLeft: 4, color: '#3a6a3a' }}>📍 Approx.</span>}
                            </p>
                            {node.dailyNote && (
                              <p style={{
                                fontSize: 12, color: '#80d580', marginTop: 8,
                                fontStyle: 'italic', borderTop: '1px solid #196219', paddingTop: 6,
                                lineHeight: 1.4
                              }}>
                                "{node.dailyNote}"
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
          {/* Animated vehicle markers for in-transit letters */}
          {vehiclePositions.map(v => (
            <Marker
              key={v.id}
              position={[v.currentLat, v.currentLon]}
              icon={buildVehicleIcon(v.vehicleEmoji, v.senderName?.[0]?.toUpperCase() || '?')}
              zIndexOffset={500}
              interactive={false}
            />
          ))}

        </MapContainer>

        {/* Fuel bar — renders inside the map container div but outside MapContainer */}
        <div className="absolute bottom-0 left-0 z-[999] pointer-events-none">
          <FuelBar streaks={streaks} />
        </div>

        {/* Send letter button — bottom right */}
        <button
          onClick={() => setShowSendModal(true)}
          className="absolute bottom-14 right-4 z-[999] w-12 h-12 rounded-full bg-forest-600 hover:bg-forest-500 shadow-lg flex items-center justify-center text-2xl transition-colors active:scale-95"
          title="Send a letter"
        >
          +
        </button>

      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-forest-800 glass-dark flex flex-wrap items-center gap-4 text-xs text-forest-500">
        <span className="font-medium text-forest-400">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-forest-500 border-2 border-forest-300 inline-block"/>You</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-forest-600 border border-forest-400 inline-block"/>1st°</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-bark-700 border border-bark-400 inline-block"/>2nd°</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-900 border border-indigo-600 inline-block"/>3rd°</span>
        <span className="flex items-center gap-1.5">
          <span style={{ width:10, height:10, borderRadius:'50%', background:'white', border:'2px solid #555', display:'inline-block' }}/>
          Has a note
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-6 border-t border-dashed border-forest-600"/>Private link
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{width:11,height:11,borderRadius:'50%',background:'#1a1a1a',border:'2px dashed #555',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'7px',color:'#777',fontWeight:'bold'}}>?</span>
          Private link
        </span>
        <span className="text-forest-600">{filteredNodes.length} nodes · {filteredEdges.length} edges</span>
      </div>
    </div>
  )
}
