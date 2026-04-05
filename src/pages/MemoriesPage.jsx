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
  const { position = 'bottom-right', size = 'medium' } = options

  // Watermark region — always same physical size relative to image
  // Size (S/M/L) controls how much geographic context is shown (zoom level)
  const regionFrac = 0.28
  const regionW = Math.round(imgW * regionFrac)
  const regionH = Math.round(regionW * 0.7)
  const pad = Math.round(imgW * 0.028)

  // Corner origin
  let ox = pad, oy = pad
  if (position.includes('right'))  ox = imgW - regionW - pad
  if (position.includes('bottom')) oy = imgH - regionH - pad

  // Sample background brightness for contrast-aware colours
  let avgBrightness = 128
  try {
    const sample = ctx.getImageData(ox, oy, regionW, regionH)
    let sum = 0
    for (let i = 0; i < sample.data.length; i += 16)
      sum += 0.299*sample.data[i] + 0.587*sample.data[i+1] + 0.114*sample.data[i+2]
    avgBrightness = sum / (sample.data.length / 16)
  } catch {}
  const dark = avgBrightness > 128
  const lineColor  = dark ? 'rgba(0,0,0,0.92)'     : 'rgba(255,255,255,0.95)'
  const dotColor   = dark ? '#111111'               : '#ffffff'
  const labelColor = dark ? 'rgba(0,0,0,0.88)'      : 'rgba(255,255,255,0.95)'
  const shadowCol  = dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'

  const drawLabel = (text, x, y, fontSize) => {
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.shadowColor = shadowCol; ctx.shadowBlur = 5
    ctx.fillStyle = labelColor; ctx.fillText(text, x, y)
    ctx.shadowBlur = 0
  }

  ctx.save()
  ctx.beginPath(); ctx.rect(ox, oy, regionW, regionH); ctx.clip()

  const lineW = Math.max(1.5, regionW * 0.014)
  const dotR  = Math.max(3.5, regionW * 0.028)
  const fontSize = Math.max(8, regionH * 0.115)

  if (participants.length >= 2) {
    let drawPts, isRoute2 = false
    if (participants.length === 2 && route?.points?.length >= 2) {
      drawPts = route.points; isRoute2 = true
    } else {
      drawPts = participants.filter(p=>p.lat&&p.lon).map(p=>[p.lat,p.lon])
    }

    if (drawPts.length >= 2) {
      const marginMap = { small: 0.18, medium: 0.38, large: 0.75 }
      const margin = marginMap[size] || 0.38

      // ── CRITICAL: bounds are based on ENDPOINTS only, not full route ────────
      // This ensures the map is always centred on the people, not skewed
      // by intermediate road waypoints that may go far off-centre.
      const anchorPts = isRoute2
        ? [drawPts[0], drawPts[drawPts.length-1]]  // just the two endpoints
        : drawPts                                   // polygon: all participant coords
      const anchorLats = anchorPts.map(p=>p[0])
      const anchorLons = anchorPts.map(p=>p[1])

      // Make the view square so neither axis gets stretched
      const latSpan = Math.max(Math.max(...anchorLats)-Math.min(...anchorLats), 0.0002)
      const lonSpan = Math.max(Math.max(...anchorLons)-Math.min(...anchorLons), 0.0002)
      // Equalise spans so the map isn't squished in one direction
      const span = Math.max(latSpan, lonSpan * 0.75)
      const midLat = (Math.max(...anchorLats)+Math.min(...anchorLats))/2
      const midLon = (Math.max(...anchorLons)+Math.min(...anchorLons))/2
      const bounds = {
        minLat: midLat - span*(0.5+margin),
        maxLat: midLat + span*(0.5+margin),
        minLon: midLon - span*(0.5+margin)/0.75,
        maxLon: midLon + span*(0.5+margin)/0.75,
      }

      const mapH = Math.round(regionH * 0.72)
      const projPts = drawPts.map(p => {
        const [x, y] = project(p[0], p[1], bounds, regionW, mapH)
        return [ox+x, oy+y]
      })

      // Draw route/polygon line
      ctx.strokeStyle = lineColor
      ctx.lineWidth = lineW
      ctx.setLineDash(isRoute2 && route?.type === 'air' ? [lineW*3, lineW*2] : [])
      ctx.beginPath()
      projPts.forEach(([x,y], i) => { if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) })
      if (!isRoute2) ctx.closePath()
      ctx.stroke()
      ctx.setLineDash([])

      // Endpoint dots — route uses first+last, polygon uses all
      const endPts = isRoute2
        ? [projPts[0], projPts[projPts.length-1]]
        : projPts

      // Group visually overlapping dots → show combined label
      const labelGroups = []
      const used = new Set()
      endPts.forEach(([x,y], i) => {
        if (used.has(i)) return
        const grp = { x, y, names: [participants[i]?.name].filter(Boolean) }
        endPts.forEach(([x2,y2], j) => {
          if (j===i||used.has(j)) return
          if (Math.sqrt((x2-x)**2+(y2-y)**2) < dotR*4) {
            if (participants[j]?.name) grp.names.push(participants[j].name)
            used.add(j)
          }
        })
        used.add(i); labelGroups.push(grp)
      })

      const centreX = ox + regionW/2
      const centreY = oy + mapH/2
      const labelFs = Math.max(7, fontSize * 0.75)
      ctx.font = `bold ${labelFs}px Dosis, sans-serif`

      labelGroups.forEach((grp) => {
        const { x, y, names } = grp
        ctx.fillStyle = dotColor
        ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI*2); ctx.fill()
        ctx.strokeStyle = lineColor; ctx.lineWidth = 1.2; ctx.stroke()

        const label = names.join(', ')
        ctx.font = `bold ${labelFs}px Dosis, sans-serif`
        const tw = ctx.measureText(label).width
        const th = labelFs
        const gap = dotR * 1.8
        // Brand zone: TreeDegrees sits at oy+regionH*0.88, avoid going below oy+regionH*0.74
        const brandZoneY = oy + regionH * 0.74

        // Direction: vector FROM this dot TOWARD the average of all other dots
        // Label goes OPPOSITE that direction (away from route)
        const others = labelGroups.filter(g => g !== grp)
        let towardX = 0, towardY = 0
        if (others.length > 0) {
          towardX = others.reduce((s,g)=>s+g.x,0)/others.length - x
          towardY = others.reduce((s,g)=>s+g.y,0)/others.length - y
        }
        // Dominant axis: is the route more horizontal or vertical?
        const moreHoriz = Math.abs(towardX) > Math.abs(towardY)

        let lx, ly, alignH, baselineV
        if (moreHoriz) {
          // Route goes left-right → label goes above or below (vertical placement)
          const placeAbove = towardY >= 0  // route goes down → we go up
          ly = placeAbove ? y - gap : y + gap
          baselineV = placeAbove ? 'bottom' : 'top'
          // Clamp: don't enter brand zone
          if (!placeAbove && ly + th > brandZoneY) {
            ly = y - gap; baselineV = 'bottom'
          }
          lx = x
          alignH = 'center'
          // Nudge horizontally if it bleeds
          if (lx - tw/2 < ox + 2) lx = ox + tw/2 + 2
          if (lx + tw/2 > ox + regionW - 2) lx = ox + regionW - tw/2 - 2
        } else {
          // Route goes up-down → label goes left or right (horizontal placement)
          const placeLeft = towardX >= 0  // route goes right → we go left
          lx = placeLeft ? x - gap : x + gap
          alignH = placeLeft ? 'right' : 'left'
          ly = y + th * 0.35
          baselineV = 'middle'
          // Clamp horizontal
          if (placeLeft && lx - tw < ox + 2) { lx = x + gap; alignH = 'left' }
          if (!placeLeft && lx + tw > ox + regionW - 2) { lx = x - gap; alignH = 'right' }
          // Clamp vertical into brand zone
          if (ly + th/2 > brandZoneY) ly = brandZoneY - th/2
        }

        ctx.textAlign = alignH
        ctx.textBaseline = baselineV

        // Pill background
        const pillW = tw + 6, pillH = th + 4
        const pillX = alignH === 'center' ? lx - pillW/2
                    : alignH === 'right'  ? lx - pillW
                    : lx - 2
        const pillY = baselineV === 'bottom' ? ly - pillH
                    : baselineV === 'top'    ? ly
                    : ly - pillH/2
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.fillStyle = avgBrightness > 128 ? '#ffffff' : '#000000'
        ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 3); ctx.fill()
        ctx.globalAlpha = 1
        ctx.restore()

        drawLabel(label, lx, ly, labelFs)
      })
      ctx.textBaseline = 'alphabetic'
    }
  }

  // Bottom branding — TreeDegrees in Dosis bold
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const brandFs = Math.max(8, fontSize * 0.85)
  ctx.font = `bold ${brandFs}px Dosis, sans-serif`
  ctx.shadowColor = shadowCol; ctx.shadowBlur = 5
  ctx.fillStyle = labelColor
  ctx.fillText('\u{1F333} TreeDegrees', ox + regionW/2, oy + Math.round(regionH * 0.88))
  ctx.shadowBlur = 0

  ctx.restore()
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
function Lightbox({ moment, onClose, currentUserId, isOwner, onLike, onComment, onDeleteComment }) {
  const [comment, setComment]     = useState('')
  const [comments, setComments]   = useState(moment.comments || [])
  const initialLiked = moment.has_liked === true ||
    (moment.liked_by||[]).some(l => l.userId===currentUserId||l.user_id===currentUserId)
  const [liked, setLiked]         = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(parseInt(moment.like_count||0, 10))
  const [posting, setPosting]     = useState(false)
  const [commentError, setCommentError] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const isMyOwnPost = moment.uploader_id === currentUserId
  const myComment = comments.find(c => c.userId === currentUserId)

  // Load comments: owner sees all, others see filtered (backend handles visibility)
  useEffect(() => {
    // Load if owner, own post, or might have commented
    if (!isOwner && !isMyOwnPost && !moment.comment_count) return
    setLoadingComments(true)
    api.get(`/api/moments/${moment.id}/comments`)
      .then(r => setComments(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingComments(false))
  }, [moment.id])

  const handleLike = async () => {
    if (liked || isMyOwnPost) return
    setLiked(true); setLikeCount(c => c + 1) // optimistic
    try {
      const { data } = await api.post(`/api/moments/${moment.id}/like`)
      if (data?.likeCount !== undefined) setLikeCount(parseInt(data.likeCount, 10))
      onLike?.(moment.id)
    } catch { setLiked(false); setLikeCount(c => Math.max(0, c - 1)) }
  }

  const handleComment = async () => {
    if (!comment.trim() || posting || isMyOwnPost) return
    setPosting(true); setCommentError('')
    try {
      const { data } = await api.post(`/api/moments/${moment.id}/comment`, { text: comment.trim() })
      setComments(prev => [...prev, data]); setComment('')
      onComment?.(moment.id, data)
    } catch(e) { setCommentError(e.response?.data?.error || 'Failed') }
    finally { setPosting(false) }
  }

  const handleDeleteComment = async () => {
    if (!myComment) return
    await api.delete(`/api/moments/${moment.id}/comment`).catch(()=>{})
    setComments(prev => prev.filter(c => c.userId !== currentUserId))
    onDeleteComment?.(moment.id)
  }

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col" onClick={onClose}
      style={{background:'rgba(0,0,0,0.97)',backdropFilter:'blur(12px)'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {moment.note_emoji && <span className="text-xl">{moment.note_emoji}</span>}
          <span className="text-sm font-medium" style={{color:'rgb(var(--f200))'}}>{moment.caption||''}</span>
        </div>
        <button onClick={onClose} className="text-2xl leading-none" style={{color:'rgb(var(--f500))'}}>✕</button>
      </div>

      {/* Image */}
      <div className="flex-shrink-0 flex items-center justify-center px-4" style={{height:'48vh'}}
        onClick={e=>e.stopPropagation()}>
        <img src={moment.cdn_url} alt={moment.caption||''} className="max-w-full max-h-full object-contain rounded-xl"/>
      </div>

      {/* Comments — scrollable, visible to owner + anyone who commented */}
      {(isOwner || myComment || isMyOwnPost) && (
        <div className="flex-shrink-0 overflow-y-auto px-4 pt-2"
          style={{maxHeight:'25vh', borderTop:'1px solid rgb(var(--f800)/0.4)'}}
          onClick={e=>e.stopPropagation()}>
          {loadingComments && <p className="text-xs py-2 text-center" style={{color:'rgb(var(--f600))'}}>⏳</p>}
          {!loadingComments && comments.length===0 && isOwner && (
            <p className="text-xs py-2 text-center" style={{color:'rgb(var(--f700))'}} >No notes yet</p>
          )}
          <div className="space-y-1.5 pb-2">
            {comments.map(c => (
              <div key={c.id||c.userId} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                style={{background:'rgb(var(--f900)/0.6)',border:'1px solid rgb(var(--f800)/0.4)'}}>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold mr-2" style={{color:'rgb(var(--f400))'}}>{c.authorName}</span>
                  <span className="text-xs" style={{color:'rgb(var(--f100))'}}>{c.text}</span>
                </div>
                {c.userId===currentUserId && (
                  <button onClick={handleDeleteComment} className="text-xs flex-shrink-0" style={{color:'rgb(var(--f600))'}}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3 space-y-2 mt-auto"
        style={{background:'rgb(var(--f950))',borderTop:'1px solid rgb(var(--f800)/0.4)'}}
        onClick={e=>e.stopPropagation()}>

        {/* Like row */}
        <div className="flex items-center gap-2">
          {!isMyOwnPost && (
            <button onClick={handleLike} disabled={liked}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={liked
                ? {background:'rgba(239,68,68,0.18)',border:'1px solid rgba(239,68,68,0.4)',color:'#f87171'}
                : {background:'rgb(var(--f900)/0.6)',border:'1px solid rgb(var(--f700)/0.4)',color:'rgb(var(--f400))'} }>
              {liked ? '❤️' : '🤍'}
            </button>
          )}
          {isOwner && likeCount > 0 && (
            <span className="text-xs" style={{color:'rgb(var(--f400))'}}
              >{likeCount} like{likeCount!==1?'s':''}{moment.liked_by?.length>0?' · '+moment.liked_by.map(l=>l.name).join(', '):''}</span>
          )}
          <span className="flex-1"/>
          {moment.tagged_names?.filter(Boolean).length>0 && (
            <span className="text-xs truncate" style={{color:'rgb(var(--f600))'}} >with {moment.tagged_names.filter(Boolean).join(', ')}</span>
          )}
        </div>

        {/* Comment input — hidden if own post */}
        {!isMyOwnPost && (
          myComment ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{background:'rgb(var(--f900)/0.6)',border:'1px solid rgb(var(--f700)/0.4)'}}>
              <span className="text-sm flex-1 truncate" style={{color:'rgb(var(--f400))'}}>&ldquo;{myComment.text}&rdquo;</span>
              <button onClick={handleDeleteComment} className="text-xs flex-shrink-0" style={{color:'rgb(var(--f600))'}} >Delete</button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex gap-2">
                <input value={comment} onChange={e=>setComment(e.target.value.slice(0,80))}
                  onKeyDown={e=>e.key==='Enter'&&handleComment()}
                  placeholder="Leave a note… 📝" maxLength={80}
                  className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                  style={{background:'rgb(var(--f900))',border:'1px solid rgb(var(--f700)/0.5)',color:'rgb(var(--f100))'}}
                />
                <button onClick={handleComment} disabled={!comment.trim()||posting}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40"
                  style={{background:'rgb(var(--f600)/0.8)',color:'rgb(var(--f100))'}} >Post</button>
              </div>
              {commentError && <p className="text-red-400 text-xs px-2">{commentError}</p>}
              <p className="text-xs px-2" style={{color:'rgb(var(--f700))'}} >1 note per person</p>
            </div>
          )
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
          {isOwn && (moment.like_count>0) && <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">❤️{moment.like_count}</span>}
          {isOwn && (moment.comment_count>0) && <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">📝{moment.comment_count}</span>}
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
      // Build participants — use nickname (short registered name)
      const taggedFriends = friends.filter(f => tagIds.includes(f.id))
      const participants = [
        { name: user?.nickname || user?.fullName?.split(' ')[0] || 'You', lat: user?.latitude, lon: user?.longitude },
        ...taggedFriends.map(f => ({ name: f.nickname || f.displayName || '', lat: f.latitude, lon: f.longitude })),
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
      const msg = e.response?.data?.error || 'Upload failed'
      setError(msg)
    } finally { setUploading(false) }
  }

  const taggedFriends = friends.filter(f => tagIds.includes(f.id))

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
              {fetchingRoute ? '🗺️ Getting route…' : uploading ? '⏳ Uploading…' : '📸 Post Memory'}
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
      momentsApi.connections().catch(()=>({data:[]})),
      api.get('/api/friends').catch(()=>({data:[]})),
    ]).then(([m, c, f]) => {
      setMine(m.data||[])
      // connections() already includes is_tagged flag from backend
      setFriends((c.data||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)))
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
      {lightbox&&<Lightbox moment={lightbox} onClose={()=>setLightbox(null)} currentUserId={user?.id} isOwner={mine.some(m=>m.id===lightbox.id)} onLike={handleLike} onComment={handleComment} onDeleteComment={handleDeleteComment}/>}
    </div>
  )
}
