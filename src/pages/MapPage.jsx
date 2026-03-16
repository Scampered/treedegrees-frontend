// src/pages/MapPage.jsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet'
import { graphApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const DEGREE_STYLES = {
  0: { color: '#2d9e2d', fillColor: '#2d9e2d', radius: 11, weight: 3, fillOpacity: 0.95 },
  1: { color: '#80d580', fillColor: '#4dba4d', radius: 9,  weight: 2, fillOpacity: 0.85 },
  2: { color: '#d0b47f', fillColor: '#966535', radius: 7,  weight: 2, fillOpacity: 0.75 },
  3: { color: '#6868b8', fillColor: '#3a3a6a', radius: 5,  weight: 1.5, fillOpacity: 0.65 },
}

const LINE_STYLES = {
  0: { color: '#2d9e2d', weight: 2, opacity: 0.8 },
  1: { color: '#4dba4d', weight: 1.5, opacity: 0.7 },
  2: { color: '#966535', weight: 1, opacity: 0.5, dashArray: '6 4' },
  3: { color: '#3a3a6a', weight: 1, opacity: 0.4, dashArray: '3 5' },
}
const PRIVATE_LINE = { color: '#555', weight: 1, opacity: 0.35, dashArray: '2 6' }

// ── Clustering: spread overlapping nodes into a circle ────────────────────────
// Groups nodes within CLUSTER_THRESHOLD degrees of each other,
// then places them evenly spaced around a tiny circle so they don't overlap.
const CLUSTER_THRESHOLD = 0.8  // lat/lon degrees (~80km)

function clusterNodes(nodes) {
  const used = new Set()
  const clusters = []

  for (let i = 0; i < nodes.length; i++) {
    if (used.has(i)) continue
    const group = [i]
    used.add(i)
    for (let j = i + 1; j < nodes.length; j++) {
      if (used.has(j)) continue
      const dlat = Math.abs(nodes[i].latitude - nodes[j].latitude)
      const dlon = Math.abs(nodes[i].longitude - nodes[j].longitude)
      if (dlat < CLUSTER_THRESHOLD && dlon < CLUSTER_THRESHOLD) {
        group.push(j)
        used.add(j)
      }
    }
    clusters.push(group)
  }

  // For groups > 1, spread them in a circle
  const result = []
  for (const group of clusters) {
    if (group.length === 1) {
      result.push({ ...nodes[group[0]], displayLat: nodes[group[0]].latitude, displayLon: nodes[group[0]].longitude })
      continue
    }
    // Centre of the group
    const clat = group.reduce((s, i) => s + nodes[i].latitude, 0) / group.length
    const clon = group.reduce((s, i) => s + nodes[i].longitude, 0) / group.length
    const spread = 0.35  // degrees to spread outward
    group.forEach((idx, k) => {
      const angle = (2 * Math.PI * k) / group.length - Math.PI / 2
      result.push({
        ...nodes[idx],
        displayLat: clat + spread * Math.cos(angle),
        displayLon: clon + spread * Math.sin(angle),
      })
    })
  }
  return result
}

// ── Zoom-aware marker radius ──────────────────────────────────────────────────
function ZoomTracker({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => { onZoom(map.getZoom()) }, [])
  return null
}

// ── Popup styles ──────────────────────────────────────────────────────────────
const popupStyle = {
  background: '#0d2b0d',
  color: '#f0faf0',
  borderRadius: 12,
  padding: '12px 14px',
  minWidth: 160,
  fontFamily: 'Dosis, sans-serif',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
}

export default function MapPage() {
  const { user } = useAuth()
  const [mapData, setMapData] = useState(null)
  const [clustered, setClustered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [hidePrivate, setHidePrivate] = useState(false)
  const [zoom, setZoom] = useState(2)
  const mapRef = useRef(null)

  const loadMap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await graphApi.mapData()
      setMapData(data)
    } catch {
      setError('Failed to load map data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMap() }, [loadMap])

  // Re-cluster whenever nodes or filter changes
  useEffect(() => {
    if (!mapData) return
    const filtered = mapData.nodes.filter(n => {
      if (!n.latitude || !n.longitude) return false
      if (filter === 'all') return true
      return n.degree === parseInt(filter) || n.degree === 0
    })
    setClustered(clusterNodes(filtered))
  }, [mapData, filter])

  const filteredEdges = mapData?.edges.filter(e => {
    if (hidePrivate && e.isPrivate) return false
    if (filter === 'all') return true
    return e.degree <= parseInt(filter)
  }) || []

  // Build edge coord lookup from clustered positions
  const posMap = Object.fromEntries(clustered.map(n => [n.id, { lat: n.displayLat, lon: n.displayLon }]))
  // Also include original positions for nodes not in clustered (e.g. filtered out)
  mapData?.nodes.forEach(n => {
    if (!posMap[n.id]) posMap[n.id] = { lat: n.latitude, lon: n.longitude }
  })

  // Scale radius with zoom so bubbles don't overlap at high zoom
  const scaleRadius = (base) => Math.max(base, Math.min(base + (zoom - 2) * 0.5, base + 4))

  const degreeLabel = (d) => {
    if (d === 0) return 'You'
    if (d === 1) return '1st degree'
    if (d === 2) return '2nd degree'
    return '3rd degree'
  }

  return (
    <div className="flex flex-col h-full">
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
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />

          <ZoomTracker onZoom={setZoom} />

          {/* Edges — use clustered display positions */}
          {filteredEdges.map((edge, i) => {
            const src = posMap[edge.source]
            const tgt = posMap[edge.target]
            if (!src?.lat || !tgt?.lat) return null
            const style = edge.isPrivate ? PRIVATE_LINE : (LINE_STYLES[edge.degree] || LINE_STYLES[3])
            return (
              <Polyline key={i}
                positions={[[src.lat, src.lon], [tgt.lat, tgt.lon]]}
                pathOptions={style}
              />
            )
          })}

          {/* Nodes — clustered positions, no zoom-out on click */}
          {clustered.map(node => {
            const style = DEGREE_STYLES[node.degree] || DEGREE_STYLES[3]
            const isMe = node.id === mapData?.myId
            const radius = scaleRadius(style.radius)

            return (
              <CircleMarker
                key={node.id}
                center={[node.displayLat, node.displayLon]}
                radius={radius}
                color={style.color}
                fillColor={style.fillColor}
                weight={style.weight}
                fillOpacity={style.fillOpacity}
                // IMPORTANT: no eventHandlers that call flyTo — prevents zoom-out
              >
                <Popup autoPan={false} closeButton={false}>
                  <div style={popupStyle}>
                    {/* Degree badge */}
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
                      // Self popup — nickname big, full name smaller
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
                      // Others — nickname always shown, full name only if allowed
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
                        </p>
                        {node.dailyNote && (
                          <p style={{
                            fontSize: 11, color: '#80d580', marginTop: 8,
                            fontStyle: 'italic', borderTop: '1px solid #196219', paddingTop: 6
                          }}>
                            "{node.dailyNote}"
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-forest-800 glass-dark flex flex-wrap items-center gap-4 text-xs text-forest-500">
        <span className="font-medium text-forest-400">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-forest-500 border-2 border-forest-300 inline-block"/>You</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-forest-600 border border-forest-400 inline-block"/>1st°</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-bark-700 border border-bark-400 inline-block"/>2nd°</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-900 border border-indigo-600 inline-block"/>3rd°</span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-6 border-t border-dashed border-forest-600"/>Private link
        </span>
        <span className="text-forest-600">{clustered.length} nodes · {filteredEdges.length} edges · zoom {zoom}</span>
      </div>
    </div>
  )
}
