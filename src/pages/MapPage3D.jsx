// src/pages/MapPage3D.jsx — 3D Globe map (test page at /3dmap)
import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { graphApi, lettersApi, friendsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Geo helpers ───────────────────────────────────────────────────────────────
function latLonToVec3(lat, lon, radius = 1) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  )
}

function lerp(a, b, t) { return a + (b - a) * t }

// ── Degree colors ─────────────────────────────────────────────────────────────
const DEGREE_COLOR = {
  0: 0x4dba4d,
  1: 0x5dba5d,
  2: 0xc8a060,
  3: 0x5858a8,
}

const VEHICLE_EMOJI = {
  car: '🚗', sportscar: '🏎️', airliner: '🛩️', jet: '✈️', spaceship: '🚀', radio: '🗼',
}

export default function MapPage3D() {
  const canvasRef   = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef    = useRef(null)
  const cameraRef   = useRef(null)
  const frameRef    = useRef(null)
  const globeRef    = useRef(null)
  const isDragging  = useRef(false)
  const lastMouse   = useRef({ x: 0, y: 0 })
  const rotVel      = useRef({ x: 0, y: 0 })
  const markerGroupRef = useRef(null)
  const lineGroupRef   = useRef(null)
  const vehicleGroupRef = useRef(null)
  const labelGroupRef  = useRef(null)

  const { user } = useAuth()
  const [mapData,   setMapData]   = useState(null)
  const [inTransit, setInTransit] = useState([])
  const [streaks,   setStreaks]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [hovered,   setHovered]   = useState(null)
  const [filter,    setFilter]    = useState('all')
  const [vehiclePos, setVehiclePos] = useState([])

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, tRes, sRes] = await Promise.all([
        graphApi.mapData(),
        lettersApi.inTransit().catch(() => ({ data: [] })),
        lettersApi.streaks().catch(() => ({ data: [] })),
      ])
      setMapData(mRes.data)
      setInTransit(Array.isArray(tRes.data) ? tRes.data : [])
      const sData = sRes.data
      setStreaks(Array.isArray(sData) ? sData : (sData?.streaks || []))
    } catch(e) { console.error('3D map load:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Animate vehicles ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const pos = inTransit
        .filter(l => l.senderLat && l.recipientLat)
        .map(l => {
          const t = Math.min(1, Math.max(0, (now - new Date(l.sentAt)) / (new Date(l.arrivesAt) - new Date(l.sentAt))))
          return { ...l, progress: t,
            currentLat: lerp(parseFloat(l.senderLat), parseFloat(l.recipientLat), t),
            currentLon: lerp(parseFloat(l.senderLon), parseFloat(l.recipientLon), t),
          }
        }).filter(l => l.progress < 1)
      setVehiclePos(pos)
    }
    tick()
    const iv = setInterval(tick, 4000)
    return () => clearInterval(iv)
  }, [inTransit])

  // ── Three.js init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(0, 0, 2.8)
    cameraRef.current = camera

    // Ambient + directional light
    scene.add(new THREE.AmbientLight(0x334433, 0.8))
    const sun = new THREE.DirectionalLight(0xaaffaa, 0.6)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    // Globe
    const geo  = new THREE.SphereGeometry(1, 64, 64)
    const mat  = new THREE.MeshPhongMaterial({
      color: 0x0d2b0d,
      emissive: 0x071407,
      shininess: 15,
      transparent: true,
      opacity: 0.95,
    })
    const globe = new THREE.Mesh(geo, mat)
    globeRef.current = globe
    scene.add(globe)

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(1.02, 64, 64)
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x1a4d1a,
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
    })
    scene.add(new THREE.Mesh(atmGeo, atmMat))

    // Wireframe overlay for map feel
    const wfGeo = new THREE.SphereGeometry(1.001, 36, 18)
    const wfMat = new THREE.MeshBasicMaterial({ color: 0x1f4f1f, wireframe: true, transparent: true, opacity: 0.15 })
    scene.add(new THREE.Mesh(wfGeo, wfMat))

    // Groups for dynamic content
    markerGroupRef.current  = new THREE.Group(); scene.add(markerGroupRef.current)
    lineGroupRef.current    = new THREE.Group(); scene.add(lineGroupRef.current)
    vehicleGroupRef.current = new THREE.Group(); scene.add(vehicleGroupRef.current)

    // Stars
    const starGeo = new THREE.BufferGeometry()
    const starVerts = []
    for (let i = 0; i < 2000; i++) {
      const r = 40 + Math.random() * 10
      starVerts.push(
        (Math.random() - 0.5) * r * 2,
        (Math.random() - 0.5) * r * 2,
        (Math.random() - 0.5) * r * 2,
      )
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x4d8a4d, size: 0.08 })))

    // Animate
    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      // Auto-slow rotation
      if (!isDragging.current) {
        globe.rotation.y += 0.0008
        markerGroupRef.current.rotation.y  += 0.0008
        lineGroupRef.current.rotation.y    += 0.0008
        vehicleGroupRef.current.rotation.y += 0.0008
      }
      // Velocity damping
      if (isDragging.current === false) {
        rotVel.current.x *= 0.92
        rotVel.current.y *= 0.92
        globe.rotation.x += rotVel.current.x
        globe.rotation.y += rotVel.current.y
        markerGroupRef.current.rotation.x  += rotVel.current.x
        markerGroupRef.current.rotation.y  += rotVel.current.y
        lineGroupRef.current.rotation.x    += rotVel.current.x
        lineGroupRef.current.rotation.y    += rotVel.current.y
        vehicleGroupRef.current.rotation.x += rotVel.current.x
        vehicleGroupRef.current.rotation.y += rotVel.current.y
      }
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      if (!canvas) return
      const w = canvas.clientWidth, h = canvas.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [])

  // ── Mouse drag to rotate ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e) => {
      isDragging.current = true
      lastMouse.current = { x: e.clientX || e.touches?.[0]?.clientX, y: e.clientY || e.touches?.[0]?.clientY }
      rotVel.current = { x: 0, y: 0 }
    }
    const onUp = () => { isDragging.current = false }
    const onMove = (e) => {
      if (!isDragging.current) return
      const cx = e.clientX || e.touches?.[0]?.clientX
      const cy = e.clientY || e.touches?.[0]?.clientY
      const dx = (cx - lastMouse.current.x) * 0.005
      const dy = (cy - lastMouse.current.y) * 0.005
      rotVel.current = { x: dy, y: dx }
      const g = globeRef.current
      if (!g) return
      g.rotation.y += dx
      g.rotation.x += dy
      if (markerGroupRef.current)  { markerGroupRef.current.rotation.y += dx; markerGroupRef.current.rotation.x += dy }
      if (lineGroupRef.current)    { lineGroupRef.current.rotation.y += dx; lineGroupRef.current.rotation.x += dy }
      if (vehicleGroupRef.current) { vehicleGroupRef.current.rotation.y += dx; vehicleGroupRef.current.rotation.x += dy }
      lastMouse.current = { x: cx, y: cy }
    }
    const onWheel = (e) => {
      const cam = cameraRef.current
      if (!cam) return
      cam.position.z = Math.max(1.4, Math.min(5, cam.position.z + e.deltaY * 0.003))
    }

    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('touchstart', onDown, { passive: true })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: true })
    canvas.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('touchstart', onDown)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [])

  // ── Render nodes + edges when data arrives ────────────────────────────────
  useEffect(() => {
    if (!mapData || !markerGroupRef.current) return

    // Clear old
    markerGroupRef.current.clear()
    lineGroupRef.current.clear()

    const nodes = mapData.nodes || []
    const edges = mapData.edges || []

    const filteredNodes = nodes.filter(n => {
      if (!n.latitude || !n.longitude) return false
      if (filter === 'all') return true
      return n.degree === 0 || n.degree === parseInt(filter)
    })

    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

    // Draw edges as curved arcs on the sphere surface
    edges.forEach(edge => {
      const src = nodeMap[edge.source]
      const tgt = nodeMap[edge.target]
      if (!src?.latitude || !tgt?.latitude) return
      if (filter !== 'all' && edge.degree > parseInt(filter)) return

      const p1 = latLonToVec3(src.latitude, src.longitude, 1.002)
      const p2 = latLonToVec3(tgt.latitude, tgt.longitude, 1.002)

      // Arc via midpoint elevated above sphere
      const mid = p1.clone().add(p2).normalize().multiplyScalar(1.08 + edge.degree * 0.02)
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2)
      const pts = curve.getPoints(32)
      const geo = new THREE.BufferGeometry().setFromPoints(pts)

      const colors = { 0: 0x4dba4d, 1: 0x2d9e2d, 2: 0x966535, 3: 0x3a3a6a }
      const opacities = { 0: 0.9, 1: 0.7, 2: 0.5, 3: 0.35 }
      const mat = new THREE.LineBasicMaterial({
        color: colors[edge.degree] || 0x3a3a6a,
        transparent: true,
        opacity: opacities[edge.degree] || 0.3,
      })
      markerGroupRef.current.add(new THREE.Line(geo, mat))
    })

    // Draw node markers as spheres
    filteredNodes.forEach(node => {
      const color = DEGREE_COLOR[node.degree] ?? DEGREE_COLOR[3]
      const size  = node.degree === 0 ? 0.022 : node.degree === 1 ? 0.016 : 0.011
      const pos   = latLonToVec3(node.latitude, node.longitude, 1.012)

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 8),
        new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
      )
      sphere.position.copy(pos)
      sphere.userData = node
      markerGroupRef.current.add(sphere)

      // Glow ring for degree 0 (me)
      if (node.degree === 0) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.026, 0.034, 16),
          new THREE.MeshBasicMaterial({ color: 0x4dba4d, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
        )
        ring.position.copy(pos)
        ring.lookAt(new THREE.Vector3(0, 0, 0))
        markerGroupRef.current.add(ring)
      }
    })
  }, [mapData, filter])

  // ── Render in-transit vehicles ────────────────────────────────────────────
  useEffect(() => {
    if (!vehicleGroupRef.current) return
    vehicleGroupRef.current.clear()
    vehiclePos.forEach(v => {
      const pos = latLonToVec3(v.currentLat, v.currentLon, 1.025)
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        new THREE.MeshPhongMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 0.6 })
      )
      sphere.position.copy(pos)
      vehicleGroupRef.current.add(sphere)
    })
  }, [vehiclePos])

  return (
    <div className="flex flex-col h-full bg-forest-950 relative">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-forest-800 glass-dark flex items-center gap-3 flex-shrink-0 z-10">
        <h2 className="font-display text-forest-200 text-lg">🌍 3D Globe</h2>
        <span className="text-forest-700 text-xs">test page · /3dmap</span>
        <div className="flex items-center gap-1 ml-auto">
          {['all','1','2','3'].map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${filter === v ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
              {v === 'all' ? 'All' : `${v}°`}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="btn-ghost text-xs py-1 px-3">↻</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-forest-950/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin" />
              <p className="text-forest-400 text-sm">Rendering globe…</p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full" style={{ cursor: 'grab' }} />
      </div>

      {/* Legend */}
      <div className="absolute bottom-20 left-4 lg:bottom-4 flex flex-col gap-1 pointer-events-none z-10">
        {[
          { color: '#4dba4d', label: 'You' },
          { color: '#5dba5d', label: '1st degree' },
          { color: '#c8a060', label: '2nd degree' },
          { color: '#5858a8', label: '3rd degree' },
          { color: '#ffdd44', label: 'Letter in transit' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-forest-500 text-xs">{label}</span>
          </div>
        ))}
        <p className="text-forest-700 text-xs mt-1">Drag to rotate · Scroll to zoom</p>
      </div>

      {/* In-transit summary */}
      {vehiclePos.length > 0 && (
        <div className="absolute top-16 right-4 z-10 space-y-1">
          {vehiclePos.map(v => (
            <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-950/80 border border-forest-800 text-xs">
              <span>{VEHICLE_EMOJI[v.vehicleTier] || '🚗'}</span>
              <span className="text-forest-400">{Math.round(v.progress * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
