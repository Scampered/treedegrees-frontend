// src/pages/MemoriesPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { momentsApi } from '../api/client'

// ── Route fetcher (calls backend which calls ORS) ─────────────────────────────
async function fetchRoute(lat1, lon1, lat2, lon2) {
  try {
    const r = await api.get(`/api/moments/route?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}`)
    return r.data
  } catch { return null }
}

// ── Project lat/lng to canvas XY (simple equirectangular) ────────────────────
function project(lat, lon, bounds, canvasW, canvasH) {
  const { minLat, maxLat, minLon, maxLon } = bounds
  const x = ((lon - minLon) / (maxLon - minLon)) * canvasW
  const y = ((maxLat - lat) / (maxLat - minLat)) * canvasH
  return [x, y]
}

// ── Draw watermark overlay on a canvas ───────────────────────────────────────
// participants: [{ name, lat, lon }, ...]
// route: { points:[[lat,lon],...], type } (for 2-person)
// options: { position, size, color }
async function drawWatermark(ctx, imgW, imgH, participants, route, options) {
  const { position='bottom-right', size='medium', color='#ffffff' } = options

  const sizeMap = { small: 0.12, medium: 0.18, large: 0.26 }
  const scale = sizeMap[size] || 0.18
  const wmH = Math.round(imgH * scale)
  const wmW = Math.round(wmH * 2.2)
  const pad = Math.round(imgW * 0.025)

  // Position
  let ox = pad, oy = pad
  if (position.includes('right'))  ox = imgW - wmW - pad
  if (position.includes('bottom')) oy = imgH - wmH - pad

  // Background panel
  ctx.save()
  ctx.globalAlpha = 0.78
  ctx.fillStyle = 'rgba(5,15,5,0.82)'
  const r = wmH * 0.12
  ctx.beginPath()
  ctx.moveTo(ox+r, oy); ctx.lineTo(ox+wmW-r, oy)
  ctx.quadraticCurveTo(ox+wmW, oy, ox+wmW, oy+r)
  ctx.lineTo(ox+wmW, oy+wmH-r)
  ctx.quadraticCurveTo(ox+wmW, oy+wmH, ox+wmW-r, oy+wmH)
  ctx.lineTo(ox+r, oy+wmH)
  ctx.quadraticCurveTo(ox, oy+wmH, ox, oy+wmH-r)
  ctx.lineTo(ox, oy+r)
  ctx.quadraticCurveTo(ox, oy, ox+r, oy)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  // Border
  ctx.strokeStyle = 'rgba(77,186,77,0.4)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  if (participants.length === 2 && route?.points?.length >= 2) {
    // ── 2-person: draw route line ────────────────────────────────────────────
    const pts = route.points
    const lats = pts.map(p=>p[0]), lons = pts.map(p=>p[1])
    const bounds = {
      minLat: Math.min(...lats) - 0.5,
      maxLat: Math.max(...lats) + 0.5,
      minLon: Math.min(...lons) - 0.5,
      maxLon: Math.max(...lons) + 0.5,
    }
    const mapW = wmW - 12, mapH = wmH - 24
    const mx = ox + 6, my = oy + 6

    // Draw route
    ctx.save()
    ctx.rect(ox, oy, wmW, wmH); ctx.clip()
    const lineCol = route.type === 'air' ? '#60a5fa' : route.type === 'road' ? '#4ade80' : '#a78bfa'
    ctx.strokeStyle = lineCol
    ctx.lineWidth = Math.max(1.5, wmH * 0.018)
    ctx.setLineDash(route.type === 'air' ? [4,4] : [])
    ctx.beginPath()
    pts.forEach((p, i) => {
      const [cx2, cy2] = project(p[0], p[1], bounds, mapW, mapH)
      if (i===0) ctx.moveTo(mx+cx2, my+cy2); else ctx.lineTo(mx+cx2, my+cy2)
    })
    ctx.stroke()
    ctx.setLineDash([])

    // Draw endpoint dots
    const [ax, ay] = project(pts[0][0], pts[0][1], bounds, mapW, mapH)
    const [bx, by] = project(pts[pts.length-1][0], pts[pts.length-1][1], bounds, mapW, mapH)
    const dotR = Math.max(3, wmH * 0.04)
    ;[[ax,ay,'#4ade80'],[bx,by,'#60a5fa']].forEach(([x,y,c]) => {
      ctx.fillStyle = c
      ctx.beginPath(); ctx.arc(mx+x, my+y, dotR, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke()
    })
    ctx.restore()

    // Names below
    ctx.save()
    ctx.rect(ox, oy, wmW, wmH); ctx.clip()
    ctx.font = `bold ${Math.max(8, wmH*0.13)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e0ffe0'
    ctx.fillText(`${participants[0].name} ↔ ${participants[1].name}`, ox+wmW/2, oy+wmH-5)
    ctx.restore()

  } else if (participants.length >= 3) {
    // ── 3+ people: polygon outline (no fill) ────────────────────────────────
    const lats = participants.map(p=>p.lat), lons = participants.map(p=>p.lon)
    const bounds = {
      minLat: Math.min(...lats) - 0.3,
      maxLat: Math.max(...lats) + 0.3,
      minLon: Math.min(...lons) - 0.3,
      maxLon: Math.max(...lons) + 0.3,
    }
    const mapW = wmW - 12, mapH = wmH - 22
    const mx = ox + 6, my = oy + 5
    const projPts = participants.map(p => project(p.lat, p.lon, bounds, mapW, mapH))

    ctx.save()
    ctx.rect(ox, oy, wmW, wmH); ctx.clip()

    // Polygon edges — no fill
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = Math.max(1.2, wmH * 0.015)
    ctx.setLineDash([3,3])
    ctx.beginPath()
    projPts.forEach(([x,y],i) => {
      if (i===0) ctx.moveTo(mx+x, my+y); else ctx.lineTo(mx+x, my+y)
    })
    ctx.closePath(); ctx.stroke()
    ctx.setLineDash([])

    // Node dots
    projPts.forEach(([x,y]) => {
      ctx.fillStyle = '#4ade80'
      ctx.beginPath(); ctx.arc(mx+x, my+y, Math.max(2.5, wmH*0.035), 0, Math.PI*2); ctx.fill()
    })
    ctx.restore()

    // Group names
    ctx.save()
    ctx.rect(ox, oy, wmW, wmH); ctx.clip()
    ctx.font = `bold ${Math.max(7, wmH*0.11)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e0ffe0'
    const nameStr = participants.map(p=>p.name).join(' · ')
    ctx.fillText(nameStr.slice(0,40) + (nameStr.length>40?'…':''), ox+wmW/2, oy+wmH-5)
    ctx.restore()

  } else {
    // ── 1 person or no coords: just name + 🌳 ───────────────────────────────
    ctx.save()
    ctx.font = `bold ${Math.max(10, wmH*0.22)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#80d580'
    ctx.fillText('🌳 TreeDegrees', ox+wmW/2, oy+wmH*0.5)
    if (participants[0]) {
      ctx.font = `${Math.max(8, wmH*0.15)}px sans-serif`
      ctx.fillStyle = '#c0e8c0'
      ctx.fillText(participants[0].name, ox+wmW/2, oy+wmH*0.8)
    }
    ctx.restore()
  }
}

// ── Compress + apply watermark ────────────────────────────────────────────────
async function processImage(file, participants, route, wmOptions) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      const maxDim = 1400
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      await drawWatermark(ctx, w, h, participants, route, wmOptions)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas failed')); return }
        const reader = new FileReader()
        reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mimeType:'image/jpeg', size:blob.size })
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.84)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ moment, onClose, currentUserId, onLike, onComment, onDeleteComment }) {
  const [comment, setComment]   = useState('')
  const [comments, setComments] = useState(moment.comments || [])
  const [liked, setLiked]       = useState((moment.likes||[]).some(l=>l.userId===currentUserId))
  const [likeCount, setLikeCount] = useState(moment.like_count||0)
  const [posting, setPosting]   = useState(false)
  const [commentError, setCommentError] = useState('')
  const myComment = comments.find(c => c.userId === currentUserId)
  const STICKY = ['#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff']

  const handleLike = async () => {
    if (liked) return
    setLiked(true); setLikeCount(c=>c+1)
    onLike?.(moment.id)
  }

  const handleComment = async () => {
    if (!comment.trim() || posting) return
    setPosting(true); setCommentError('')
    try {
      const { data } = await api.post(`/api/moments/${moment.id}/comment`, { text: comment.trim() })
      setComments(prev => [...prev, data])
      setComment('')
      onComment?.(moment.id, data)
    } catch(e) {
      setCommentError(e.response?.data?.error || 'Failed')
    } finally { setPosting(false) }
  }

  const handleDeleteComment = async () => {
    if (!myComment) return
    await api.delete(`/api/moments/${moment.id}/comment`).catch(()=>{})
    setComments(prev => prev.filter(c => c.userId !== currentUserId))
    onDeleteComment?.(moment.id)
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/92 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {moment.note_emoji && <span className="text-xl">{moment.note_emoji}</span>}
          <span className="text-white/80 text-sm font-medium">{moment.caption||''}</span>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none">✕</button>
      </div>

      {/* Image with sticky notes */}
      <div className="flex-1 flex items-center justify-center relative px-4 overflow-hidden"
        onClick={e=>e.stopPropagation()}>
        <div className="relative inline-block">
          <img src={moment.cdn_url} alt={moment.caption||''}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ maxHeight:'calc(100vh - 200px)', maxWidth:'calc(100vw - 32px)' }}
          />
          {comments.map((c, i) => (
            <div key={c.id||i} style={{
              position:'absolute',
              left:`${15+(i%3)*25}%`,
              top:`${8+(i%2)*30}%`,
              background: STICKY[i%STICKY.length],
              padding:'6px 8px', borderRadius:3,
              boxShadow:'2px 3px 8px rgba(0,0,0,0.45)',
              transform:`rotate(${(i%2===0?-1:1)*(1+i*0.7)}deg)`,
              maxWidth:110, zIndex:10, cursor: c.userId===currentUserId ? 'pointer':'default',
            }}
              title={c.userId===currentUserId ? 'Click your comment to delete it' : ''}
              onClick={c.userId===currentUserId ? handleDeleteComment : undefined}>
              <p style={{fontSize:9,fontWeight:700,color:'#1a1a1a',marginBottom:2}}>{c.authorName}</p>
              <p style={{fontSize:10,color:'#2a2a2a',lineHeight:1.3}}>{c.text}</p>
              {c.userId===currentUserId && (
                <p style={{fontSize:8,color:'#666',marginTop:3,textAlign:'right'}}>tap to remove</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-4 pb-5 pt-2 space-y-2" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${liked?'bg-red-500/20 text-red-400 border border-red-500/30':'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'}`}>
            {liked?'❤️':'🤍'} {likeCount>0?likeCount:''}
          </button>
          <span className="text-white/30 text-xs flex-1 truncate">
            {moment.tagged_names?.filter(Boolean).join(', ')}
          </span>
          <span className="text-white/30 text-xs">
            {comments.length} note{comments.length!==1?'s':''}
          </span>
        </div>
        {myComment ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/50 text-sm flex-1 truncate">Your note: "{myComment.text}"</span>
            <button onClick={handleDeleteComment} className="text-red-400/70 hover:text-red-400 text-xs">Delete</button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input value={comment} onChange={e=>setComment(e.target.value.slice(0,80))}
                onKeyDown={e=>e.key==='Enter'&&handleComment()}
                placeholder="Add a sticky note… 📝" maxLength={80}
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-full px-4 py-2 text-sm outline-none focus:border-white/40"
              />
              <button onClick={handleComment} disabled={!comment.trim()||posting}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40"
                style={{background:'rgb(var(--f600)/0.8)',color:'rgb(var(--f100))'}}>
                Post
              </button>
            </div>
            {commentError && <p className="text-red-400 text-xs px-2">{commentError}</p>}
            <p className="text-white/20 text-xs px-2">1 sticky note per person · tap yours to remove</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Polaroid card ─────────────────────────────────────────────────────────────
function PolaroidCard({ moment, onDelete, isOwn, onOpen }) {
  const expiresIn = Math.max(0, Math.ceil((new Date(moment.expires_at)-Date.now())/86400000))
  const urgent = expiresIn<=1
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className="relative rounded-xl overflow-hidden border group cursor-pointer transition-colors"
      style={{
        background:'rgb(var(--f900)/0.4)',
        borderColor:'rgb(var(--f800)/0.5)',
      }}
      onClick={()=>onOpen(moment)}>
      <div className="relative overflow-hidden" style={{background:'rgb(var(--f950)/0.8)',minHeight:60}}>
        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center" style={{minHeight:80}}>
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'rgb(var(--f700))',borderTopColor:'transparent'}}/>
          </div>
        )}
        {errored && <div className="p-3 text-xs text-red-400 break-all" style={{minHeight:60}}>❌ Image failed to load</div>}
        <img src={moment.cdn_url} alt={moment.caption||''}
          crossOrigin="anonymous"
          className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.02]"
          style={{display:loaded?'block':'none'}}
          onLoad={()=>setLoaded(true)}
          onError={()=>setErrored(true)}
        />
        {moment.is_tagged && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{background:'rgb(var(--f600)/0.9)',color:'rgb(var(--f100))'}}>
            @you
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1.5">
          {(moment.like_count>0) && <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">❤️{moment.like_count}</span>}
          {(moment.comment_count>0) && <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">📝{moment.comment_count}</span>}
        </div>
      </div>

      <div className="px-3 py-2 border-t" style={{borderColor:'rgb(var(--f800)/0.3)'}}>
        <div className="flex items-center gap-1.5 min-w-0">
          {moment.note_emoji && <span className="text-base flex-shrink-0">{moment.note_emoji}</span>}
          <p className="text-xs font-medium truncate flex-1" style={{color:'rgb(var(--f200))'}}>
            {moment.caption || <span style={{color:'rgb(var(--f600))',fontStyle:'italic'}}>no caption</span>}
          </p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] font-medium ${urgent?'text-amber-400':''}`} style={urgent?{}:{color:'rgb(var(--f600))'}}>
            {urgent?'⚠️ today':`${expiresIn}d`}
          </span>
          {moment.uploader_name && !isOwn && <span className="text-[10px]" style={{color:'rgb(var(--f600))'}}>{moment.uploader_name}</span>}
        </div>
      </div>

      {isOwn && (
        <button onClick={e=>{e.stopPropagation();onDelete(moment.id)}}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-800"
          style={{background:'rgba(180,30,30,0.7)',color:'white'}}>
          🗑
        </button>
      )}
    </div>
  )
}

// ── Watermark options UI ──────────────────────────────────────────────────────
function WatermarkOptions({ value, onChange }) {
  const positions = [
    ['top-left','↖'], ['top-right','↗'],
    ['bottom-left','↙'], ['bottom-right','↘'],
  ]
  const sizes = [['small','S'],['medium','M'],['large','L']]

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide" style={{color:'rgb(var(--f600))'}}>Watermark</p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {positions.map(([pos, label]) => (
            <button key={pos} onClick={()=>onChange({...value, position:pos})}
              className="w-8 h-8 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: value.position===pos ? 'rgb(var(--f600)/0.7)' : 'rgb(var(--f900)/0.5)',
                border: `1px solid rgb(var(--f${value.position===pos?500:800})/0.5)`,
                color: `rgb(var(--f${value.position===pos?100:500}))`,
              }}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {sizes.map(([sz, label]) => (
            <button key={sz} onClick={()=>onChange({...value, size:sz})}
              className="w-8 h-8 rounded-lg text-xs font-bold transition-colors"
              style={{
                background: value.size===sz ? 'rgb(var(--f600)/0.7)' : 'rgb(var(--f900)/0.5)',
                border: `1px solid rgb(var(--f${value.size===sz?500:800})/0.5)`,
                color: `rgb(var(--f${value.size===sz?100:500}))`,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ friends, onClose, onUploaded, user }) {
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [emoji, setEmoji]     = useState('')
  const [tagIds, setTagIds]   = useState([])
  const [uploading, setUploading] = useState(false)
  const [fetchingRoute, setFetchingRoute] = useState(false)
  const [error, setError]     = useState('')
  const [wmOptions, setWmOptions] = useState({ position:'bottom-right', size:'medium' })
  const fileRef = useRef()

  const handleFile = f => {
    if (!f||!f.type.startsWith('image/')) { setError('Pick an image file'); return }
    if (f.size > 25*1024*1024) { setError('Max 25MB'); return }
    setFile(f); setPreview(URL.createObjectURL(f)); setError('')
  }

  const handleUpload = async () => {
    if (!file) { setError('Pick an image first'); return }
    setUploading(true); setError('')
    try {
      // Build participants list
      const taggedFriends = friends.filter(f => tagIds.includes(f.id))
      const participants = [
        { name: user?.nickname||'You', lat: user?.latitude, lon: user?.longitude },
        ...taggedFriends.map(f => ({ name: f.displayName||f.nickname, lat: f.latitude, lon: f.longitude })),
      ].filter(p => p.lat && p.lon)

      // Fetch route for 2-person
      let route = null
      if (participants.length === 2) {
        setFetchingRoute(true)
        route = await fetchRoute(participants[0].lat, participants[0].lon, participants[1].lat, participants[1].lon)
        setFetchingRoute(false)
      }

      const { base64, mimeType } = await processImage(file, participants, route, wmOptions)
      const taggedNames = taggedFriends.map(f => f.displayName||f.nickname)
      const { data } = await momentsApi.upload({
        imageBase64: base64, mimeType,
        caption: caption.trim(), emoji: emoji.trim()||null, tagIds,
      })
      onUploaded(data); onClose()
    } catch(e) {
      setFetchingRoute(false)
      setError(e.response?.data?.error || 'Upload failed')
    } finally { setUploading(false) }
  }

  const taggedFriends = friends.filter(f => tagIds.includes(f.id))
  const uploaderLabel = uploading ? (fetchingRoute ? 'Getting route…' : 'Processing…') : '📸 Post Memory'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{background:'rgb(var(--f950))',border:'1px solid rgb(var(--f700)/0.5)'}}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgb(var(--f800)/0.5)'}}>
          <h2 className="font-display text-xl" style={{color:'rgb(var(--f100))'}}>📸 New Memory</h2>
          <button onClick={onClose} className="text-xl" style={{color:'rgb(var(--f500))'}}>✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Photo picker */}
          <div onClick={()=>fileRef.current?.click()}
            className="rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors"
            style={{borderColor:preview?'transparent':'rgb(var(--f700)/0.4)',minHeight:100}}>
            {preview
              ? <img src={preview} alt="preview" className="w-full h-auto block max-h-48 object-contain"/>
              : <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <p className="text-4xl">📷</p>
                  <p className="text-sm" style={{color:'rgb(var(--f500))'}}>Tap to pick a photo</p>
                  <p className="text-xs" style={{color:'rgb(var(--f700))'}}>Any aspect ratio · up to 25MB</p>
                </div>
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/>
          </div>

          {/* Caption */}
          <div className="flex gap-2">
            <input value={emoji} onChange={e=>setEmoji(e.target.value)} maxLength={4} placeholder="😊"
              className="w-14 text-center text-xl rounded-xl px-2 py-2 outline-none"
              style={{background:'rgb(var(--f900)/0.6)',border:'1px solid rgb(var(--f800)/0.5)',color:'rgb(var(--f100))'}}/>
            <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={200} placeholder="Add a caption…"
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{background:'rgb(var(--f900)/0.6)',border:'1px solid rgb(var(--f800)/0.5)',color:'rgb(var(--f100))'}}/>
          </div>

          {/* Tag friends */}
          {friends.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide mb-2" style={{color:'rgb(var(--f600))'}}>Tag connections (max 5)</p>
              <div className="flex flex-wrap gap-2">
                {friends.map(f => (
                  <button key={f.id} onClick={()=>setTagIds(p=>p.includes(f.id)?p.filter(x=>x!==f.id):[...p.slice(0,4),f.id])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background:tagIds.includes(f.id)?'rgb(var(--f600)/0.6)':'rgb(var(--f900)/0.6)',
                      border:`1px solid rgb(var(--f${tagIds.includes(f.id)?500:800})/0.5)`,
                      color:`rgb(var(--f${tagIds.includes(f.id)?100:500}))`,
                    }}>
                    {f.displayName||f.nickname}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Watermark options */}
          <WatermarkOptions value={wmOptions} onChange={setWmOptions} />

          {/* Route preview note */}
          {taggedFriends.length === 1 && taggedFriends[0].latitude && (
            <p className="text-xs" style={{color:'rgb(var(--f600))'}}>
              🗺️ Will show route between you and {taggedFriends[0].displayName||taggedFriends[0].nickname}
            </p>
          )}
          {taggedFriends.length >= 2 && (
            <p className="text-xs" style={{color:'rgb(var(--f600))'}}>
              🌐 Will show connection polygon for {taggedFriends.length+1} people
            </p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
              style={{border:'1px solid rgb(var(--f700)/0.5)',color:'rgb(var(--f400))'}}>
              Cancel
            </button>
            <button onClick={handleUpload} disabled={uploading||!file}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
              style={{background:'rgb(var(--f600)/0.8)',color:'rgb(var(--f100))'}}>
              {uploaderLabel}
            </button>
          </div>
          <p className="text-xs text-center" style={{color:'rgb(var(--f700))'}}>Memories expire in 7 days</p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MemoriesPage() {
  const { user } = useAuth()
  const [tab, setTab]         = useState('mine')
  const [mine, setMine]       = useState([])
  const [friends, setFriends] = useState([])
  const [friendsList, setFriendsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(() => {
    Promise.all([
      momentsApi.mine().catch(()=>({data:[]})),
      momentsApi.tagged().catch(()=>({data:[]})),
      api.get('/api/friends').catch(()=>({data:[]})),
    ]).then(([m, t, f]) => {
      setMine(m.data||[])
      const tagged = (t.data||[]).map(x=>({...x,is_tagged:true}))
      const byId = {}
      tagged.forEach(x=>{byId[x.id]=x})
      setFriends(Object.values(byId).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)))
      setFriendsList(f.data||[])
    }).finally(()=>setLoading(false))
  }, [])

  useEffect(()=>{load()},[load])

  const handleDelete = async id => {
    if (!confirm('Delete this memory?')) return
    await momentsApi.remove(id).catch(()=>{})
    setMine(prev=>prev.filter(m=>m.id!==id))
  }

  const handleLike = async momentId => {
    await api.post(`/api/moments/${momentId}/like`).catch(()=>{})
  }

  const handleComment = (momentId, newComment) => {
    const update = arr=>arr.map(m=>m.id===momentId?{...m,comments:[...(m.comments||[]),newComment],comment_count:(m.comment_count||0)+1}:m)
    setMine(update); setFriends(update)
    if (lightbox?.id===momentId) setLightbox(prev=>({...prev,comments:[...(prev.comments||[]),newComment],comment_count:(prev.comment_count||0)+1}))
  }

  const handleDeleteComment = momentId => {
    const update = arr=>arr.map(m=>m.id===momentId?{...m,comments:(m.comments||[]).filter(c=>c.userId!==user?.id),comment_count:Math.max(0,(m.comment_count||1)-1)}:m)
    setMine(update); setFriends(update)
    if (lightbox?.id===momentId) setLightbox(prev=>({...prev,comments:(prev.comments||[]).filter(c=>c.userId!==user?.id),comment_count:Math.max(0,(prev.comment_count||1)-1)}))
  }

  const displayItems = tab==='mine' ? mine : friends
  const expiringSoon = mine.filter(m=>(new Date(m.expires_at)-Date.now())/86400000<=1)

  return (
    <div className="flex flex-col h-full" style={{background:'rgb(var(--f950))'}}>
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{borderBottom:'1px solid rgb(var(--f800)/0.5)'}}>
        <div>
          <h1 className="font-display text-2xl" style={{color:'rgb(var(--f50))'}}>📸 Memories</h1>
          <p className="text-xs mt-0.5" style={{color:'rgb(var(--f600))'}}>Expire in 7 days · tap to view</p>
        </div>
        <button onClick={()=>setShowUpload(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors"
          style={{background:'rgb(var(--f600)/0.7)',color:'rgb(var(--f100))'}}>
          📷 Add
        </button>
      </div>

      {expiringSoon.length>0 && (
        <div className="mx-5 mt-3 rounded-xl px-4 py-2.5" style={{background:'rgba(180,90,0,0.15)',border:'1px solid rgba(200,120,0,0.3)'}}>
          <p className="text-amber-400 text-sm">⚠️ {expiringSoon.length} memory{expiringSoon.length>1?'s':''} expiring today!</p>
        </div>
      )}

      <div className="px-5 pt-3 flex gap-1 flex-shrink-0" style={{borderBottom:'1px solid rgb(var(--f800)/0.4)'}}>
        {[{id:'mine',label:`Mine (${mine.length})`},{id:'friends',label:`Friends (${friends.length})`}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="px-4 py-2 rounded-t-lg text-sm font-medium transition-colors"
            style={{
              background:tab===t.id?'rgb(var(--f800)/0.6)':'transparent',
              color:tab===t.id?'rgb(var(--f100))':'rgb(var(--f500))',
              border:tab===t.id?'1px solid rgb(var(--f700)/0.5)':'1px solid transparent',
              borderBottom:'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'rgb(var(--f700))',borderTopColor:'transparent'}}/></div>}
        {!loading&&displayItems.length===0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📷</p>
            <p className="text-lg font-medium mb-2" style={{color:'rgb(var(--f300))'}}>{tab==='mine'?'No memories yet':'Nothing from friends yet'}</p>
            <p className="text-sm mb-6" style={{color:'rgb(var(--f600))'}}>{tab==='mine'?'Share a photo — it disappears in 7 days.':'When connections post or tag you, it appears here.'}</p>
            {tab==='mine'&&<button onClick={()=>setShowUpload(true)} className="text-sm px-6 py-2.5 rounded-full" style={{background:'rgb(var(--f700)/0.6)',color:'rgb(var(--f100))'}}>📷 Post your first memory</button>}
          </div>
        )}
        {!loading&&displayItems.length>0&&(
          <div className="columns-2 sm:columns-3 gap-3">
            {displayItems.map(m=>(
              <div key={m.id} className="break-inside-avoid mb-3">
                <PolaroidCard moment={m} isOwn={mine.some(x=>x.id===m.id)} onDelete={handleDelete} onOpen={setLightbox}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload&&<UploadModal friends={friendsList} user={user} onClose={()=>setShowUpload(false)} onUploaded={()=>{load()}}/>}
      {lightbox&&<Lightbox moment={lightbox} onClose={()=>setLightbox(null)} currentUserId={user?.id} onLike={handleLike} onComment={handleComment} onDeleteComment={handleDeleteComment}/>}
    </div>
  )
}
