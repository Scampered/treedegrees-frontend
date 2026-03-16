// src/pages/MapPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMapEvents } from 'react-leaflet'
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
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
}

export default function MapPage() {
  const { user } = useAuth()
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [hidePrivate, setHidePrivate] = useState(false)
  const [zoom, setZoom] = useState(2)

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
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />

          <ZoomTracker onZoom={setZoom} />

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

          {/* Nodes — rendered at exact real coordinates, no artificial spreading */}
          {filteredNodes.map(node => {
            const style = DEGREE_STYLES[node.degree] || DEGREE_STYLES[3]
            const isMe = node.id === mapData?.myId

            return (
              <CircleMarker
                key={node.id}
                center={[node.latitude, node.longitude]}
                radius={style.radius}
                color={style.color}
                fillColor={style.fillColor}
                weight={style.weight}
                fillOpacity={style.fillOpacity}
              >
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
        <span className="text-forest-600">{filteredNodes.length} nodes · {filteredEdges.length} edges</span>
      </div>
    </div>
  )
}
