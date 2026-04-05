// src/pages/MemoriesPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { momentsApi } from '../api/client'

// ── Compress + watermark (preserves aspect ratio) ─────────────────────────────
async function compressAndWatermark(file, uploaderName, taggedNames = []) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Preserve aspect ratio, max 1400px on longest side
      const maxDim = 1400
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      // Watermark bottom-right
      const names = [uploaderName, ...taggedNames].filter(Boolean).slice(0,3).join(' & ')
      const wText = `🌳 ${names}`
      ctx.font = `bold ${Math.max(11, w * 0.022)}px sans-serif`
      const tw = ctx.measureText(wText).width
      const pad = 8, bh = Math.max(16, w * 0.032) + 6
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(w - tw - pad*2 - 2, h - bh - 2, tw + pad*2, bh)
      ctx.fillStyle = 'rgba(255,255,255,0.88)'
      ctx.fillText(wText, w - tw - pad, h - 6)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas failed')); return }
        const reader = new FileReader()
        reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mimeType: 'image/jpeg', size: blob.size })
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.84)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ── Lightbox — full image view with comments as sticky notes ──────────────────
function Lightbox({ moment, onClose, currentUserId, onLike, onComment }) {
  const [comment, setComment]   = useState('')
  const [comments, setComments] = useState(moment.comments || [])
  const [liked, setLiked]       = useState((moment.likes||[]).some(l => l.userId === currentUserId))
  const [likeCount, setLikeCount] = useState((moment.likes||[]).length)
  const [posting, setPosting]   = useState(false)

  const STICKY_COLORS = ['#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff']

  const handleLike = async () => {
    if (liked) return
    setLiked(true); setLikeCount(c => c+1)
    onLike?.(moment.id)
  }

  const handleComment = async () => {
    if (!comment.trim() || posting) return
    setPosting(true)
    try {
      const { data } = await api.post(`/api/moments/${moment.id}/comment`, { text: comment.trim() })
      setComments(prev => [...prev, data])
      setComment('')
      onComment?.(moment.id, data)
    } catch {} finally { setPosting(false) }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 flex flex-col"
      onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="text-white font-medium text-sm">{moment.caption || ''}</span>
          {moment.note_emoji && <span>{moment.note_emoji}</span>}
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">✕</button>
      </div>

      {/* Image + sticky notes */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden px-4"
        onClick={e=>e.stopPropagation()}>
        <img src={moment.cdn_url} alt={moment.caption||'Moment'}
          className="max-w-full max-h-full object-contain rounded-xl"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        />
        {/* Sticky note comments overlaid on image */}
        {comments.map((c, i) => (
          <div key={c.id||i} style={{
            position:'absolute',
            left: `${20 + (i%3) * 28}%`,
            top:  `${10 + (i%2) * 35}%`,
            background: STICKY_COLORS[i % STICKY_COLORS.length],
            padding: '8px 10px', borderRadius: 4,
            boxShadow: '2px 3px 8px rgba(0,0,0,0.4)',
            transform: `rotate(${(i%2===0?-1:1)*(1+i*0.5)}deg)`,
            maxWidth: 120, zIndex: 10,
          }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#1a1a1a', marginBottom:2 }}>{c.authorName || 'Someone'}</p>
            <p style={{ fontSize:11, color:'#2a2a2a', lineHeight:1.3 }}>{c.text}</p>
          </div>
        ))}
      </div>

      {/* Bottom bar — like + comment */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 space-y-2" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${liked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'}`}>
            {liked ? '❤️' : '🤍'} {likeCount > 0 ? likeCount : ''}
          </button>
          <div className="text-white/40 text-xs">
            {moment.tagged_names?.length > 0 && `with ${moment.tagged_names.filter(Boolean).join(', ')}`}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleComment()}
            placeholder="Add a sticky note… 📝"
            maxLength={80}
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-full px-4 py-2 text-sm outline-none focus:border-white/40"
          />
          <button onClick={handleComment} disabled={!comment.trim()||posting}
            className="px-4 py-2 bg-forest-600 hover:bg-forest-500 disabled:opacity-40 text-white text-sm rounded-full transition-colors">
            Post
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Polaroid card ─────────────────────────────────────────────────────────────
function PolaroidCard({ moment, onDelete, isOwn, onOpen }) {
  const expiresIn = Math.max(0, Math.ceil((new Date(moment.expires_at) - Date.now()) / 86400000))
  const urgent = expiresIn <= 1
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className="relative rounded-xl overflow-hidden border border-forest-800/50 group cursor-pointer
                    bg-[rgb(var(--f900)/0.4)] hover:border-forest-600 transition-colors"
      onClick={() => onOpen(moment)}>

      {/* Photo — natural aspect ratio */}
      <div className="relative overflow-hidden bg-[rgb(var(--f950)/0.8)]"
        style={{ minHeight: 80 }}>
        {!loaded && !errored && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ minHeight: 100 }}>
            <div className="w-5 h-5 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin"/>
          </div>
        )}
        {errored && (
          <div className="p-3 text-xs text-red-400 break-all" style={{ minHeight: 80 }}>
            ❌ {moment.cdn_url}
          </div>
        )}
        <img
          src={moment.cdn_url}
          alt={moment.caption||'Moment'}
          crossOrigin="anonymous"
          className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
          style={{ display: loaded ? 'block' : 'none' }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
        {/* Tagged badge */}
        {moment.is_tagged && (
          <div className="absolute top-2 left-2 bg-forest-600/90 text-forest-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            @you
          </div>
        )}
        {/* Like count */}
        {(moment.like_count > 0) && (
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            ❤️ {moment.like_count}
          </div>
        )}
        {/* Comment count */}
        {(moment.comment_count > 0) && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            📝 {moment.comment_count}
          </div>
        )}
      </div>

      {/* Caption strip — theme-aware */}
      <div className="px-3 py-2.5 border-t border-forest-800/40">
        <div className="flex items-center gap-1.5 min-w-0">
          {moment.note_emoji && <span className="text-base flex-shrink-0">{moment.note_emoji}</span>}
          <p className="text-[rgb(var(--f200))] text-xs font-medium truncate flex-1">
            {moment.caption || <span className="text-[rgb(var(--f600))] italic">No caption</span>}
          </p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] font-medium ${urgent ? 'text-amber-400' : 'text-[rgb(var(--f600))]'}`}>
            {urgent ? '⚠️ expires today' : `${expiresIn}d`}
          </span>
          {moment.uploader_name && !isOwn && (
            <span className="text-[10px] text-[rgb(var(--f600))]">{moment.uploader_name}</span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isOwn && (
          <button onClick={e => { e.stopPropagation(); onDelete(moment.id) }}
            className="w-7 h-7 bg-red-900/80 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-800">
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ friends, onClose, onUploaded }) {
  const { user } = useAuth()
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [caption, setCaption]   = useState('')
  const [emoji, setEmoji]       = useState('')
  const [tagIds, setTagIds]     = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState('')
  const fileRef = useRef()

  const handleFile = f => {
    if (!f || !f.type.startsWith('image/')) { setError('Pick an image file'); return }
    if (f.size > 25 * 1024 * 1024) { setError('Max 25MB'); return }
    setFile(f); setPreview(URL.createObjectURL(f)); setError('')
  }

  const handleUpload = async () => {
    if (!file) { setError('Pick an image first'); return }
    setUploading(true); setError('')
    try {
      const taggedNames = friends.filter(f => tagIds.includes(f.id)).map(f => f.displayName||f.nickname)
      const { base64, mimeType } = await compressAndWatermark(file, user?.nickname || 'You', taggedNames)
      const { data } = await momentsApi.upload({ imageBase64: base64, mimeType, caption: caption.trim(), emoji: emoji.trim()||null, tagIds })
      onUploaded(data); onClose()
    } catch(e) {
      setError(e.response?.data?.error || 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background:'rgb(var(--f950))', border:'1px solid rgb(var(--f700)/0.5)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor:'rgb(var(--f800)/0.5)' }}>
          <h2 className="font-display text-[rgb(var(--f100))] text-xl">📸 New Memory</h2>
          <button onClick={onClose} className="text-[rgb(var(--f500))] hover:text-[rgb(var(--f200))] text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Photo picker — shows natural aspect ratio */}
          <div onClick={() => fileRef.current?.click()}
            className="rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors"
            style={{ borderColor: preview ? 'transparent' : 'rgb(var(--f700)/0.5)', minHeight: 120 }}>
            {preview
              ? <img src={preview} alt="preview" className="w-full h-auto block"/>
              : <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="text-4xl">📷</p>
                  <p className="text-[rgb(var(--f500))] text-sm">Tap to pick a photo</p>
                  <p className="text-[rgb(var(--f700))] text-xs">Any aspect ratio · up to 25MB · auto-compressed</p>
                </div>
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFile(e.target.files?.[0])} />
          </div>
          <div className="flex gap-2">
            <input value={emoji} onChange={e=>setEmoji(e.target.value)} maxLength={4}
              placeholder="😊" className="w-14 text-center text-xl rounded-xl px-2 py-2 outline-none"
              style={{ background:'rgb(var(--f900)/0.6)', border:'1px solid rgb(var(--f800)/0.5)', color:'rgb(var(--f100))' }} />
            <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={200}
              placeholder="Add a caption…" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background:'rgb(var(--f900)/0.6)', border:'1px solid rgb(var(--f800)/0.5)', color:'rgb(var(--f100))' }} />
          </div>
          {friends.length > 0 && (
            <div>
              <p className="text-[rgb(var(--f600))] text-xs uppercase tracking-wide mb-2">Tag connections</p>
              <div className="flex flex-wrap gap-2">
                {friends.map(f => (
                  <button key={f.id} onClick={() => setTagIds(p => p.includes(f.id) ? p.filter(x=>x!==f.id) : [...p.slice(0,4),f.id])}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: tagIds.includes(f.id) ? 'rgb(var(--f600)/0.6)' : 'rgb(var(--f900)/0.6)',
                      border: `1px solid rgb(var(--f${tagIds.includes(f.id)?500:800})/0.5)`,
                      color: `rgb(var(--f${tagIds.includes(f.id)?100:500}))`,
                    }}>
                    {f.displayName || f.nickname}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
              style={{ border:'1px solid rgb(var(--f700)/0.5)', color:'rgb(var(--f400))' }}>
              Cancel
            </button>
            <button onClick={handleUpload} disabled={uploading||!file}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
              style={{ background:'rgb(var(--f600)/0.8)', color:'rgb(var(--f100))' }}>
              {uploading ? 'Uploading…' : '📸 Post Memory'}
            </button>
          </div>
          <p className="text-[rgb(var(--f700))] text-xs text-center">Memories expire in 7 days · save as polaroid first!</p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MemoriesPage() {
  const { user } = useAuth()
  const [tab, setTab]           = useState('mine')
  const [mine, setMine]         = useState([])
  const [friends, setFriends]   = useState([])  // friends' memories (mine+tagged combined)
  const [friendsList, setFriendsList] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const load = useCallback(() => {
    Promise.all([
      momentsApi.mine().catch(()=>({data:[]})),
      momentsApi.tagged().catch(()=>({data:[]})),
      api.get('/api/friends').catch(()=>({data:[]})),
    ]).then(([m, t, f]) => {
      setMine(m.data || [])
      // Friends tab: tagged moments get is_tagged flag
      const tagged = (t.data || []).map(x => ({ ...x, is_tagged: true }))
      // Merge and deduplicate (a moment can appear in both if uploader is a friend)
      const byId = {}
      tagged.forEach(x => { byId[x.id] = x })
      setFriends(Object.values(byId).sort((a,b) => new Date(b.created_at)-new Date(a.created_at)))
      setFriendsList(f.data || [])
    }).finally(()=>setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async id => {
    if (!confirm('Delete this memory?')) return
    await momentsApi.remove(id).catch(()=>{})
    setMine(prev => prev.filter(m => m.id !== id))
  }

  const handleLike = async momentId => {
    await api.post(`/api/moments/${momentId}/like`).catch(()=>{})
  }

  const handleComment = (momentId, newComment) => {
    // Update the moment in state with new comment
    const update = arr => arr.map(m => m.id === momentId
      ? { ...m, comments:[...(m.comments||[]), newComment], comment_count:(m.comment_count||0)+1 }
      : m
    )
    setMine(update); setFriends(update)
    if (lightbox?.id === momentId) {
      setLightbox(prev => ({ ...prev, comments:[...(prev.comments||[]), newComment], comment_count:(prev.comment_count||0)+1 }))
    }
  }

  const displayItems = tab === 'mine' ? mine : friends
  const expiringSoon = mine.filter(m => (new Date(m.expires_at)-Date.now())/86400000 <= 1)

  return (
    <div className="flex flex-col h-full" style={{ background:'rgb(var(--f950))' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom:'1px solid rgb(var(--f800)/0.5)' }}>
        <div>
          <h1 className="font-display text-2xl text-[rgb(var(--f50))]">📸 Memories</h1>
          <p className="text-[rgb(var(--f600))] text-xs mt-0.5">Expire in 7 days · tap to view</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors"
          style={{ background:'rgb(var(--f600)/0.7)', color:'rgb(var(--f100))' }}>
          📷 Add
        </button>
      </div>

      {/* Expiry warning */}
      {expiringSoon.length > 0 && (
        <div className="mx-5 mt-3 rounded-xl px-4 py-2.5"
          style={{ background:'rgba(180,90,0,0.15)', border:'1px solid rgba(200,120,0,0.3)' }}>
          <p className="text-amber-400 text-sm">⚠️ {expiringSoon.length} memory{expiringSoon.length>1?'s':''} expiring today!</p>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 pt-3 flex gap-1 flex-shrink-0"
        style={{ borderBottom:'1px solid rgb(var(--f800)/0.4)' }}>
        {[
          { id:'mine',    label:`Mine (${mine.length})` },
          { id:'friends', label:`Friends (${friends.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-t-lg text-sm font-medium transition-colors"
            style={{
              background: tab===t.id ? 'rgb(var(--f800)/0.6)' : 'transparent',
              color: tab===t.id ? 'rgb(var(--f100))' : 'rgb(var(--f500))',
              border: tab===t.id ? '1px solid rgb(var(--f700)/0.5)' : '1px solid transparent',
              borderBottom: 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin"/>
          </div>
        )}
        {!loading && displayItems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📷</p>
            <p className="text-[rgb(var(--f300))] font-medium text-lg mb-2">
              {tab==='mine' ? 'No memories yet' : "Nothing from friends yet"}
            </p>
            <p className="text-[rgb(var(--f600))] text-sm mb-6">
              {tab==='mine' ? 'Share a photo — it disappears in 7 days.' : 'When connections post or tag you, it appears here.'}
            </p>
            {tab==='mine' && (
              <button onClick={() => setShowUpload(true)}
                className="text-sm px-6 py-2.5 rounded-full transition-colors"
                style={{ background:'rgb(var(--f700)/0.6)', color:'rgb(var(--f100))' }}>
                📷 Post your first memory
              </button>
            )}
          </div>
        )}
        {!loading && displayItems.length > 0 && (
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {displayItems.map(m => (
              <div key={m.id} className="break-inside-avoid mb-3">
                <PolaroidCard moment={m} isOwn={tab==='mine'&&m.uploader_id===undefined||mine.some(x=>x.id===m.id)}
                  onDelete={handleDelete} onOpen={setLightbox} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal friends={friendsList} onClose={() => setShowUpload(false)}
          onUploaded={() => { load() }} />
      )}

      {lightbox && (
        <Lightbox moment={lightbox} onClose={() => setLightbox(null)}
          currentUserId={user?.id} onLike={handleLike} onComment={handleComment} />
      )}
    </div>
  )
}
