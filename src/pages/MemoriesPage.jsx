// src/pages/MemoriesPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { momentsApi } from '../api/client'

const MAX_SIZE_BYTES = 4.5 * 1024 * 1024 // 4.5MB after compression

// ── Canvas compress + watermark ───────────────────────────────────────────────
async function compressAndWatermark(file, uploaderName, taggedNames = []) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const maxW = 1200
      const scale = Math.min(1, maxW / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      // Watermark
      const names = [uploaderName, ...taggedNames].filter(Boolean).slice(0,3).join(' & ')
      const wText = `🌳 ${names}`
      ctx.font = `bold ${Math.max(12, w * 0.025)}px sans-serif`
      const tw = ctx.measureText(wText).width
      const pad = 10, bh = Math.max(18, w * 0.035) + 8
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(w - tw - pad*2 - 4, h - bh - 4, tw + pad*2, bh)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText(wText, w - tw - pad, h - 8)

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas failed')); return }
        const reader = new FileReader()
        reader.onload = e => resolve({
          base64: e.target.result.split(',')[1],
          mimeType: 'image/jpeg',
          size: blob.size,
        })
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.82)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ── Polaroid card ─────────────────────────────────────────────────────────────
function PolaroidCard({ moment, onDelete, isOwn }) {
  const expiresIn = Math.max(0, Math.ceil((new Date(moment.expires_at) - Date.now()) / 86400000))
  const urgent = expiresIn <= 1

  const savePolaroid = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 900; canvas.height = 1060
    const ctx = canvas.getContext('2d')
    // White polaroid frame
    ctx.fillStyle = '#f5f0e8'
    ctx.roundRect(0, 0, 900, 1060, 12)
    ctx.fill()
    // Photo area
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.save()
      ctx.roundRect(40, 40, 820, 820, 8)
      ctx.clip()
      ctx.drawImage(img, 40, 40, 820, 820)
      ctx.restore()
      // Caption
      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'italic 28px Georgia, serif'
      ctx.textAlign = 'center'
      const cap = moment.caption || ''
      ctx.fillText(cap.slice(0,40) + (cap.length>40?'…':''), 450, 920)
      // TreeDegrees brand
      ctx.fillStyle = '#4d7a4d'
      ctx.font = '20px sans-serif'
      ctx.fillText('🌳 TreeDegrees', 450, 980)
      ctx.fillStyle = '#9ca3af'
      ctx.font = '16px sans-serif'
      ctx.fillText(new Date(moment.created_at).toLocaleDateString(), 450, 1010)
      // Download
      const a = document.createElement('a')
      a.download = `moment-${moment.id.slice(0,8)}.jpg`
      a.href = canvas.toDataURL('image/jpeg', 0.9)
      a.click()
    }
    img.src = moment.cdn_url
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-forest-800 bg-forest-900/40 group">
      {/* Photo */}
      <div className="aspect-square overflow-hidden">
        <img src={moment.cdn_url} alt={moment.caption||'Moment'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          crossOrigin="anonymous"
        />
      </div>

      {/* Polaroid bottom strip */}
      <div className="p-3 bg-[#f5f0e8]">
        {moment.note_emoji && <span className="text-xl mr-1">{moment.note_emoji}</span>}
        <p className="text-gray-700 text-sm font-medium italic truncate">
          {moment.caption || 'No caption'}
        </p>
        {moment.tagged_names?.length > 0 && (
          <p className="text-gray-500 text-xs mt-0.5">
            with {moment.tagged_names.filter(Boolean).join(', ')}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs font-medium ${urgent ? 'text-red-500' : 'text-gray-400'}`}>
            {urgent ? '⚠️ Expires today' : `${expiresIn}d left`}
          </span>
          {moment.uploader_name && <span className="text-xs text-gray-500">by {moment.uploader_name}</span>}
        </div>
      </div>

      {/* Actions overlay */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={savePolaroid}
          className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white text-xs hover:bg-black/80"
          title="Save as polaroid">
          💾
        </button>
        {isOwn && (
          <button onClick={() => onDelete(moment.id)}
            className="w-8 h-8 bg-red-900/70 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-900"
            title="Delete">
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ friends, onClose, onUploaded, initialLetterId }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [emoji, setEmoji] = useState('')
  const [tagIds, setTagIds] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please pick an image file'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  const toggleTag = (id) => {
    setTagIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev.slice(0,4), id])
  }

  const handleUpload = async () => {
    if (!file) { setError('Pick an image first'); return }
    setUploading(true); setError('')
    try {
      const taggedNames = friends.filter(f => tagIds.includes(f.id)).map(f => f.displayName||f.nickname)
      const { base64, mimeType } = await compressAndWatermark(file, user?.nickname || 'You', taggedNames)
      const { data } = await momentsApi.upload({
        imageBase64: base64, mimeType, caption: caption.trim(),
        emoji: emoji.trim() || null, tagIds,
        letterId: initialLetterId || undefined,
      })
      onUploaded(data)
      onClose()
    } catch(e) {
      setError(e.response?.data?.error || 'Upload failed. Try a smaller image.')
    } finally { setUploading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-forest-950 border border-forest-700 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-800">
          <h2 className="font-display text-forest-100 text-xl">📸 New Moment</h2>
          <button onClick={onClose} className="text-forest-500 hover:text-forest-300 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Photo pick */}
          <div onClick={() => fileRef.current?.click()}
            className="aspect-video rounded-xl border-2 border-dashed border-forest-700 hover:border-forest-500
                       flex items-center justify-center cursor-pointer overflow-hidden transition-colors">
            {preview
              ? <img src={preview} alt="preview" className="w-full h-full object-cover rounded-xl"/>
              : <div className="text-center">
                  <p className="text-4xl mb-2">📷</p>
                  <p className="text-forest-500 text-sm">Tap to pick a photo</p>
                  <p className="text-forest-700 text-xs mt-1">JPEG, PNG, WebP — compressed automatically</p>
                </div>
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFile(e.target.files?.[0])} />
          </div>

          {/* Emoji + caption row */}
          <div className="flex gap-2">
            <input value={emoji} onChange={e=>setEmoji(e.target.value)} maxLength={4}
              placeholder="😊" className="w-14 text-center input text-xl rounded-xl" />
            <input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={200}
              placeholder="Add a caption…" className="flex-1 input text-sm rounded-xl" />
          </div>

          {/* Tag connections */}
          {friends.length > 0 && (
            <div>
              <p className="text-forest-600 text-xs uppercase tracking-wide mb-2">Tag connections (max 5)</p>
              <div className="flex flex-wrap gap-2">
                {friends.map(f => (
                  <button key={f.id} onClick={() => toggleTag(f.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                      ${tagIds.includes(f.id)
                        ? 'bg-forest-600 text-forest-100 border border-forest-500'
                        : 'bg-forest-900 text-forest-500 border border-forest-800 hover:border-forest-600'}`}>
                    {f.displayName || f.nickname}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-forest-700 text-forest-400 text-sm hover:bg-forest-900 transition-colors">
              Cancel
            </button>
            <button onClick={handleUpload} disabled={uploading || !file}
              className="flex-1 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 disabled:opacity-40
                         text-forest-100 text-sm font-medium transition-colors">
              {uploading ? 'Uploading…' : '📸 Post Moment'}
            </button>
          </div>

          <p className="text-forest-700 text-xs text-center">
            Moments expire after 7 days. Save as polaroid before they're gone.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MemoriesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('mine')
  const [mine, setMine] = useState([])
  const [tagged, setTagged] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    Promise.all([
      momentsApi.mine().catch(()=>({data:[]})),
      momentsApi.tagged().catch(()=>({data:[]})),
      api.get('/api/friends').catch(()=>({data:[]})),
    ]).then(([m, t, f]) => {
      setMine(m.data || [])
      setTagged(t.data || [])
      setFriends(f.data || [])
    }).finally(()=>setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this moment?')) return
    await momentsApi.remove(id).catch(()=>{})
    setMine(prev => prev.filter(m => m.id !== id))
  }

  const handleUploaded = (data) => {
    momentsApi.mine().then(r => setMine(r.data||[])).catch(()=>{})
  }

  const displayItems = tab === 'mine' ? mine : tagged
  const expiringSoon = mine.filter(m => {
    const days = (new Date(m.expires_at)-Date.now()) / 86400000
    return days <= 1
  })

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl text-forest-50">📸 Memories</h1>
          <p className="text-forest-600 text-xs mt-0.5">Photos shared with connections · expire in 7 days</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-forest-600 hover:bg-forest-500 text-forest-100
                     text-sm font-medium px-4 py-2 rounded-full transition-colors">
          📷 Add
        </button>
      </div>

      {/* Expiry warning */}
      {expiringSoon.length > 0 && (
        <div className="mx-5 mt-3 rounded-xl bg-amber-950/30 border border-amber-900/50 px-4 py-2.5 flex items-center justify-between">
          <p className="text-amber-400 text-sm">⚠️ {expiringSoon.length} moment{expiringSoon.length>1?'s':''} expiring soon — save as polaroid!</p>
        </div>
      )}

      {/* Tabs */}
      <div className="px-5 pt-3 flex gap-1 border-b border-forest-800 flex-shrink-0">
        {[
          { id:'mine', label:`Mine (${mine.length})` },
          { id:'tagged', label:`Tagged in (${tagged.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors
              ${tab===t.id ? 'bg-forest-800 text-forest-100 border-t border-x border-forest-700' : 'text-forest-500 hover:text-forest-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-forest-700 border-t-forest-400 rounded-full animate-spin"/>
          </div>
        )}

        {!loading && displayItems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">📷</p>
            <p className="text-forest-300 font-medium text-lg mb-2">
              {tab==='mine' ? 'No memories yet' : "You haven't been tagged yet"}
            </p>
            <p className="text-forest-600 text-sm mb-6">
              {tab==='mine'
                ? 'Share a photo with your connections. It will disappear in 7 days.'
                : 'When a connection tags you in a moment, it appears here.'}
            </p>
            {tab==='mine' && (
              <button onClick={() => setShowUpload(true)}
                className="bg-forest-700 hover:bg-forest-600 text-forest-100 text-sm px-6 py-2.5 rounded-full transition-colors">
                📷 Post your first memory
              </button>
            )}
          </div>
        )}

        {!loading && displayItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayItems.map(m => (
              <PolaroidCard key={m.id} moment={m}
                isOwn={tab==='mine'}
                onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal friends={friends} onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded} />
      )}
    </div>
  )
}
