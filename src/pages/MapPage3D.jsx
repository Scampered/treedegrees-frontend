// src/pages/MapPage3D.jsx — 3D Globe test page at /3dmap
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { graphApi, lettersApi, friendsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

// ── Coordinate formula (aligned with Three.js SphereGeometry UV + equirectangular texture)
// Greenwich (0,0) → (0,0,+1) = faces camera on load
function latLonToVec3(lat, lon, r = 1) {
  const phi   = (90 - lat) * (Math.PI / 180)
  const theta = lon         * (Math.PI / 180)
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  )
}

// Arc between two lat/lon points, lifted above sphere surface
function arcPoints(lat1, lon1, lat2, lon2, segments = 56, lift = 0.12) {
  const p1  = latLonToVec3(lat1, lon1)
  const p2  = latLonToVec3(lat2, lon2)
  const mid = p1.clone().add(p2).normalize().multiplyScalar(1 + lift)
  return new THREE.QuadraticBezierCurve3(p1, mid, p2).getPoints(segments)
}

function lerp(a, b, t) { return a + (b - a) * t }

const DEGREE_COLOR  = { 0: 0x4dba4d, 1: 0x5dba5d, 2: 0xc8a060, 3: 0x5858a8 }
const LINE_COLOR    = { 0: 0x2d9e2d, 1: 0x4dba4d, 2: 0x966535, 3: 0x3a3a6a }
const LINE_OPACITY  = { 0: 0.95,    1: 0.80,    2: 0.60,    3: 0.40 }
const LINE_WIDTH    = { 0: 2,       1: 1.5,     2: 1,       3: 1 }
const VEHICLE_EMOJI = { car:'🚗', sportscar:'🏎️', airliner:'🛩️', jet:'✈️', spaceship:'🚀', radio:'🗼' }

export default function MapPage3D() {
  const canvasRef     = useRef(null)
  const rendererRef   = useRef(null)
  const sceneRef      = useRef(null)
  const cameraRef     = useRef(null)
  const frameRef      = useRef(null)
  const groupRef      = useRef(null)   // rotates with globe
  const vehicleLayerRef = useRef(null) // vehicle HTML overlay
  const isDragging    = useRef(false)
  const lastMouse     = useRef({ x: 0, y: 0 })
  const rotVel        = useRef({ x: 0, y: 0 })
  const autoRotate    = useRef(true)
  const idleTimer     = useRef(null)
  const raycasterRef  = useRef(new THREE.Raycaster())
  const nodesMeshRef  = useRef([])

  const navigate = useNavigate()
  const { user } = useAuth()

  const [mapData,     setMapData]     = useState(null)
  const [inTransit,   setInTransit]   = useState([])
  const [streaks,     setStreaks]     = useState([])
  const [friends,     setFriends]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')
  const [vehiclePos,  setVehiclePos]  = useState([])
  const [profileNode, setProfileNode] = useState(null)
  const [showSend,    setShowSend]    = useState(false)
  const [tooltip,     setTooltip]     = useState(null)
  const [canvasSize,  setCanvasSize]  = useState({ w: 0, h: 0 })

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, tRes, sRes, fRes] = await Promise.all([
        graphApi.mapData(),
        lettersApi.inTransit().catch(() => ({ data: [] })),
        lettersApi.streaks().catch(() => ({ data: [] })),
        friendsApi.list().catch(() => ({ data: [] })),
      ])
      setMapData(mRes.data)
      setInTransit(Array.isArray(tRes.data) ? tRes.data : [])
      const sd = sRes.data
      setStreaks(Array.isArray(sd) ? sd : (sd?.streaks || []))
      setFriends(Array.isArray(fRes.data) ? fRes.data : [])
    } catch(e) { console.error('3D map:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Vehicle position animation ────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      setVehiclePos(inTransit
        .filter(l => l.senderLat && l.recipientLat)
        .map(l => {
          const t = Math.min(1, Math.max(0, (now - new Date(l.sentAt)) / (new Date(l.arrivesAt) - new Date(l.sentAt))))
          return { ...l, progress: t,
            currentLat: lerp(+l.senderLat, +l.recipientLat, t),
            currentLon: lerp(+l.senderLon, +l.recipientLon, t) }
        }).filter(l => l.progress < 1))
    }
    tick(); const iv = setInterval(tick, 5000); return () => clearInterval(iv)
  }, [inTransit])

  // ── Three.js setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const W = canvas.clientWidth || window.innerWidth
    const H = canvas.clientHeight || window.innerHeight - 56

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x040c04)
    rendererRef.current = renderer
    setCanvasSize({ w: W, h: H })

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 200)
    camera.position.z = 2.8
    cameraRef.current = camera

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 0.8)
    sun.position.set(5, 3, 5); scene.add(sun)
    const fill = new THREE.DirectionalLight(0x88cc88, 0.3)
    fill.position.set(-5, -2, -3); scene.add(fill)

    // ── Globe group (everything attached rotates together) ─────────────
    const group = new THREE.Group()
    groupRef.current = group
    scene.add(group)

    // ── Globe mesh with real Earth texture ────────────────────────────
    const globeGeo = new THREE.SphereGeometry(1, 80, 80)
    const globeMat = new THREE.MeshPhongMaterial({
      color:    0xffffff,   // neutral so texture shows true
      specular: 0x224422,
      shininess: 8,
    })
    const globe = new THREE.Mesh(globeGeo, globeMat)
    group.add(globe)

    // Load texture — try multiple sources for best quality
    const loader = new THREE.TextureLoader()
    // Primary: Natural Earth II dark style with visible continents
    const texUrls = [
      'https://unpkg.com/three-globe@2.30.0/example/img/earth-night.jpg',
      'https://unpkg.com/three-globe@2.30.0/example/img/earth-dark.jpg',
    ]
    const tryLoad = (idx) => {
      if (idx >= texUrls.length) return
      loader.load(texUrls[idx], (tex) => {
        // Boost brightness via tone mapping
        tex.colorSpace = THREE.SRGBColorSpace
        globeMat.map = tex
        globeMat.color.set(0xaaccaa)  // slight green tint to match theme
        globeMat.needsUpdate = true
      }, undefined, () => tryLoad(idx + 1))
    }
    tryLoad(0)

    // Atmosphere glow
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x1a4d1a, transparent: true, opacity: 0.18, side: THREE.FrontSide,
    })
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 64), atmMat))

    // Outer glow ring
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x0a2a0a, transparent: true, opacity: 0.5, side: THREE.BackSide,
    })
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), glowMat))

    // ── Stars ──────────────────────────────────────────────────────────
    const sv = []
    for (let i = 0; i < 4000; i++) {
      const r = 25 + Math.random() * 20
      sv.push((Math.random()-.5)*r*2, (Math.random()-.5)*r*2, (Math.random()-.5)*r*2)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x446644, size: 0.055 })))

    // ── Animate ────────────────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const g = groupRef.current; if (!g) return
      if (autoRotate.current) {
        g.rotation.y += 0.0005
      } else {
        // Momentum decay when not dragging
        if (!isDragging.current) {
          rotVel.current.x *= 0.90
          rotVel.current.y *= 0.90
          g.rotation.x += rotVel.current.x
          g.rotation.y += rotVel.current.y
        }
      }
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (!w || !h) return
      camera.aspect = w / h; camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      setCanvasSize({ w, h })
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [])

  // ── Drag + zoom interaction ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return

    const resetIdleTimer = () => {
      clearTimeout(idleTimer.current)
      autoRotate.current = false
      idleTimer.current = setTimeout(() => { autoRotate.current = true }, 3000)
    }

    const down = (e) => {
      isDragging.current = true
      rotVel.current = { x: 0, y: 0 }
      lastMouse.current = { x: e.clientX ?? e.touches?.[0]?.clientX, y: e.clientY ?? e.touches?.[0]?.clientY }
      resetIdleTimer()
    }
    const up = () => { isDragging.current = false }
    const move = (e) => {
      if (!isDragging.current || !groupRef.current) return
      const cx = e.clientX ?? e.touches?.[0]?.clientX
      const cy = e.clientY ?? e.touches?.[0]?.clientY
      const dx = (cx - lastMouse.current.x) * 0.005
      const dy = (cy - lastMouse.current.y) * 0.005
      rotVel.current = { x: dy, y: dx }
      groupRef.current.rotation.y += dx
      groupRef.current.rotation.x = Math.max(-1.2, Math.min(1.2, groupRef.current.rotation.x + dy))
      lastMouse.current = { x: cx, y: cy }
    }
    const wheel = (e) => {
      const cam = cameraRef.current; if (!cam) return
      cam.position.z = Math.max(1.25, Math.min(6, cam.position.z + e.deltaY * 0.004))
      resetIdleTimer()
    }

    canvas.addEventListener('mousedown', down)
    canvas.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    window.addEventListener('mousemove', move)
    window.addEventListener('touchmove', move, { passive: true })
    canvas.addEventListener('wheel', wheel, { passive: true })
    return () => {
      canvas.removeEventListener('mousedown', down)
      canvas.removeEventListener('touchstart', down)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('touchmove', move)
      canvas.removeEventListener('wheel', wheel)
      clearTimeout(idleTimer.current)
    }
  }, [])

  // ── Click on nodes ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    let mouseDownPos = { x: 0, y: 0 }

    const onMouseDown = (e) => { mouseDownPos = { x: e.clientX, y: e.clientY } }
    const onClick = (e) => {
      // Only fire if barely moved (not a drag)
      const dx = Math.abs(e.clientX - mouseDownPos.x)
      const dy = Math.abs(e.clientY - mouseDownPos.y)
      if (dx > 5 || dy > 5) return

      const rect = canvas.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycasterRef.current.setFromCamera(mouse, cameraRef.current)
      const hits = raycasterRef.current.intersectObjects(nodesMeshRef.current.map(n => n.mesh))
      if (hits.length > 0) {
        const hit = nodesMeshRef.current.find(n => n.mesh === hits[0].object)
        if (hit) { setProfileNode(hit.node); return }
      }
      setProfileNode(null)
    }
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycasterRef.current.setFromCamera(mouse, cameraRef.current)
      const hits = raycasterRef.current.intersectObjects(nodesMeshRef.current.map(n => n.mesh))
      if (hits.length > 0) {
        const hit = nodesMeshRef.current.find(n => n.mesh === hits[0].object)
        if (hit) { canvas.style.cursor = 'pointer'; setTooltip({ x: e.clientX, y: e.clientY, node: hit.node }); return }
      }
      canvas.style.cursor = isDragging.current ? 'grabbing' : 'grab'
      setTooltip(null)
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('mousemove', onMouseMove)
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  // ── Rebuild network geometry when data/filter changes ────────────────────
  useEffect(() => {
    const group = groupRef.current; if (!group || !mapData) return
    // Remove everything after the first 2 children (globe + atmosphere)
    while (group.children.length > 2) group.remove(group.children[group.children.length - 1])
    nodesMeshRef.current = []

    const nodes   = mapData.nodes || []
    const edges   = mapData.edges || []
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

    const visNodes = nodes.filter(n => {
      if (!n.latitude || !n.longitude) return false
      if (filter === 'all') return true
      return n.degree === 0 || n.degree === parseInt(filter)
    })
    const visEdges = edges.filter(e =>
      filter === 'all' ? true : e.degree <= parseInt(filter)
    )

    // ── Edges ──────────────────────────────────────────────────────────
    visEdges.forEach(edge => {
      const src = nodeMap[edge.source], tgt = nodeMap[edge.target]
      if (!src?.latitude || !tgt?.latitude) return
      const pts = arcPoints(+src.latitude, +src.longitude, +tgt.latitude, +tgt.longitude,
        56, 0.06 + (edge.degree || 0) * 0.04)
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: LINE_COLOR[edge.degree] ?? 0x3a3a6a,
        transparent: true,
        opacity: LINE_OPACITY[edge.degree] ?? 0.35,
        depthTest: true,
        depthWrite: false,
      })
      group.add(new THREE.Line(geo, mat))
    })

    // ── Nodes ──────────────────────────────────────────────────────────
    visNodes.forEach(node => {
      const color  = DEGREE_COLOR[node.degree] ?? DEGREE_COLOR[3]
      const radius = node.degree === 0 ? 0.026 : node.degree === 1 ? 0.019 : 0.013
      const pos    = latLonToVec3(+node.latitude, +node.longitude, 1.016)

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 12),
        new THREE.MeshPhongMaterial({
          color, emissive: color, emissiveIntensity: 0.6,
          depthTest: true, depthWrite: true,
        })
      )
      mesh.position.copy(pos)
      group.add(mesh)
      nodesMeshRef.current.push({ mesh, node })

      // Pulse ring for "me"
      if (node.degree === 0) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.032, 0.044, 32),
          new THREE.MeshBasicMaterial({ color: 0x80d580, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        )
        ring.position.copy(pos)
        ring.lookAt(new THREE.Vector3(0, 0, 0))
        group.add(ring)
      }
    })
  }, [mapData, filter])

  // ── Rebuild vehicle dots ──────────────────────────────────────────────────
  useEffect(() => {
    const group = groupRef.current; if (!group) return
    group.children.filter(c => c.userData?.isVehicle).forEach(c => group.remove(c))

    vehiclePos.forEach(v => {
      const pos = latLonToVec3(v.currentLat, v.currentLon, 1.03)
      // Glowing yellow dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 10),
        new THREE.MeshPhongMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 0.9, depthTest: true })
      )
      dot.position.copy(pos); dot.userData = { isVehicle: true }
      group.add(dot)
      // Draw arc trail on transit path
      const src = latLonToVec3(+v.senderLat, +v.senderLon, 1.016)
      const tgt = latLonToVec3(+v.recipientLat, +v.recipientLon, 1.016)
      const mid = src.clone().add(tgt).normalize().multiplyScalar(1.12)
      const curve = new THREE.QuadraticBezierCurve3(src, mid, tgt)
      const arcGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64))
      const arcMat = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.5, depthTest: true })
      const arcLine = new THREE.Line(arcGeo, arcMat)
      arcLine.userData = { isVehicle: true }
      group.add(arcLine)
    })
  }, [vehiclePos])

  const profileStreak = profileNode ? streaks.find(s => s.friendId === profileNode.id) : null

  return (
    <div className="flex flex-col h-full relative" style={{ background: '#040c04' }}>
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-forest-800 glass-dark flex items-center gap-3 flex-shrink-0 z-10">
        <h2 className="font-display text-forest-200 text-lg">🌍 3D Globe</h2>
        <span className="text-forest-700 text-xs">test · /3dmap</span>
        <div className="flex items-center gap-1 ml-2">
          {['all','1','2','3'].map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${filter === v ? 'bg-forest-700 text-forest-100' : 'text-forest-500 hover:text-forest-300 hover:bg-forest-900'}`}>
              {v === 'all' ? 'All' : `${v}°`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-forest-700 text-xs">
            {(mapData?.nodes||[]).length} nodes
            {vehiclePos.length > 0 && ` · ${vehiclePos.length} in transit`}
          </span>
          <button onClick={loadData} className="btn-ghost text-xs py-1 px-3">↻</button>
        </div>
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
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Vehicle emoji overlay — HTML layer over canvas */}
        {vehiclePos.map(v => {
          // Project 3D position to screen
          if (!cameraRef.current || !canvasRef.current || !groupRef.current) return null
          const pos3d = latLonToVec3(v.currentLat, v.currentLon, 1.03).clone()
          pos3d.applyEuler(groupRef.current.rotation)
          // Only show if facing camera (positive Z after rotation)
          const camDir = new THREE.Vector3(0, 0, 1)
          if (pos3d.dot(camDir) < 0.1) return null
          const projected = pos3d.project(cameraRef.current)
          const rect = canvasRef.current.getBoundingClientRect()
          const sx = (projected.x + 1) / 2 * rect.width
          const sy = (1 - projected.y) / 2 * rect.height
          return (
            <div key={v.id} className="absolute pointer-events-none z-10 select-none"
              style={{ left: sx - 12, top: sy - 12, fontSize: 20,
                filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.9))' }}>
              {VEHICLE_EMOJI[v.vehicleTier] || '🚗'}
            </div>
          )
        })}
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10,
            background: '#0d2b0d', border: '1px solid #2d6a2d', color: '#80d580',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)' }}>
          <p className="font-semibold">{tooltip.node.nickname}</p>
          <p className="text-forest-500">{tooltip.node.city}, {tooltip.node.country}</p>
          {tooltip.node.degree === 1 && <p className="text-forest-700 mt-0.5">Click to view profile</p>}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-20 left-4 lg:bottom-6 flex flex-col gap-1.5 pointer-events-none z-10">
        {[
          { color:'#4dba4d', label:'You' },
          { color:'#5dba5d', label:'1st degree' },
          { color:'#c8a060', label:'2nd degree' },
          { color:'#5858a8', label:'3rd degree' },
          { color:'#ffdd44', label:'In transit' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-forest-500 text-xs">{label}</span>
          </div>
        ))}
        <p className="text-forest-800 text-xs mt-1">Drag · Scroll zoom · Click nodes</p>
      </div>

      {/* Send button */}
      <button onClick={() => setShowSend(true)}
        className="absolute bottom-24 right-4 lg:bottom-8 z-10 w-12 h-12 rounded-full bg-forest-600
                   hover:bg-forest-500 shadow-lg flex items-center justify-center text-xl transition-all active:scale-95">
        ✉️
      </button>

      {/* ── Profile modal ────────────────────────────────────────────────── */}
      {profileNode && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setProfileNode(null)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0a1f0a', border: '1px solid #2d6a2d' }}>
            <div style={{ background: 'linear-gradient(135deg,#0d2b0d,#142814)', padding: '20px 20px 16px' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div style={{ width:52, height:52, borderRadius:'50%',
                    background:'#196219', border:'2px solid #2d9e2d', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize: profileNode.mood ? 28 : 20, color:'#80d580', fontWeight:700 }}>
                    {profileNode.mood || profileNode.nickname?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p style={{ fontWeight:800, fontSize:18, color:'#e0ffe0', margin:0 }}>{profileNode.nickname}</p>
                    {profileNode.fullName && profileNode.fullName !== profileNode.nickname &&
                      <p style={{ fontSize:11, color:'#4d8a4d', margin:'1px 0 0' }}>{profileNode.fullName}</p>}
                    <p style={{ fontSize:11, color:'#4dba4d', margin:'3px 0 0' }}>📍 {profileNode.city}, {profileNode.country}</p>
                  </div>
                </div>
                <button onClick={() => setProfileNode(null)}
                  style={{ background:'none', border:'none', color:'#4d7a4d', fontSize:20, cursor:'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', borderBottom:'1px solid #196219' }}>
              {[
                { label:'Seeds',  value:`🌱 ${profileNode.seeds ?? '—'}` },
                { label:'Streak', value: profileStreak?.streakDays > 0 ? `🔥 ${profileStreak.streakDays}` : '—' },
                { label:'Fuel',   value: profileStreak ? `⛽ ${profileStreak.fuel ?? 0}/3` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding:'12px 8px', textAlign:'center', borderRight:'1px solid #196219' }}>
                  <p style={{ fontSize:14, color:'#80d580', margin:'0 0 2px', fontWeight:600 }}>{value}</p>
                  <p style={{ fontSize:10, color:'#4d7a4d', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ padding:'14px 20px 18px' }}>
              {profileNode.dailyNote && (
                <div style={{ background:'rgba(25,98,25,0.15)', border:'1px solid #196219',
                  borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
                  <p style={{ fontSize:11, color:'#4d8a4d', margin:'0 0 4px', textTransform:'uppercase' }}>Today's note</p>
                  <p style={{ fontSize:13, color:'#c0e8c0', margin:0, fontStyle:'italic', lineHeight:1.5 }}>
                    {profileNode.noteEmoji && <span style={{ marginRight:6 }}>{profileNode.noteEmoji}</span>}
                    "{profileNode.dailyNote}"
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setProfileNode(null); navigate(`/profile/${profileNode.id}`) }}
                  style={{ flex:1, padding:'9px 0', borderRadius:10, fontSize:13,
                    background:'rgba(45,158,45,0.1)', border:'1px solid #2d6a2d', color:'#80d580', cursor:'pointer' }}>
                  View profile
                </button>
                {profileNode.degree === 1 && (
                  <button onClick={() => { setProfileNode(null); navigate('/letters', { state:{ selectFriend:{ id: profileNode.id, displayName: profileNode.nickname } } }) }}
                    style={{ flex:1, padding:'9px 0', borderRadius:10, fontSize:13, fontWeight:600,
                      background:'#196219', border:'1px solid #2d9e2d', color:'#80d580', cursor:'pointer' }}>
                    ✉️ Write letter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Send modal ───────────────────────────────────────────────────── */}
      {showSend && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
          onClick={() => setShowSend(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ background:'#0a1f0a', border:'1px solid #2d6a2d' }}>
            <div className="px-5 py-4 border-b border-forest-800 flex items-center justify-between">
              <p className="text-forest-100 font-semibold">✉️ Send a letter</p>
              <button onClick={() => setShowSend(false)} className="text-forest-600 text-xl leading-none">✕</button>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
              {friends.filter(f => f.id).map(f => (
                <button key={f.id}
                  onClick={() => { setShowSend(false); navigate('/letters', { state:{ selectFriend:{ id:f.id, displayName: f.displayName||f.nickname } } }) }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-forest-800
                             hover:border-forest-600 hover:bg-forest-900/40 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-sm text-forest-200 flex-shrink-0">
                    {(f.displayName||f.nickname||'?')[0]?.toUpperCase()}
                  </div>
                  <span className="text-forest-200 text-sm">{f.displayName||f.nickname}</span>
                </button>
              ))}
              {friends.length === 0 && <p className="text-forest-600 text-sm text-center py-4">No connections yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
