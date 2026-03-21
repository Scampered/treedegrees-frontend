// src/components/QRCodeCard.jsx
// Generates a permanent QR code pointing to /friends?code=XXXX
// Uses qrcode-generator (pure JS, no API) loaded via CDN script tag.
import { useEffect, useRef, useState } from 'react'

const QR_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
const LOGO_SIZE_RATIO = 0.22   // logo takes 22% of QR width
const QR_SIZE = 220            // pixels

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

export default function QRCodeCard({ friendCode }) {
  const canvasRef  = useRef(null)
  const divRef     = useRef(null)
  const [ready, setReady]   = useState(false)
  const [error, setError]   = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!friendCode) return
    let cancelled = false

    const build = async () => {
      try {
        // Load qrcodejs if not already present
        await loadScript(QR_SCRIPT)
        if (cancelled || !divRef.current) return

        // Clear previous QR
        divRef.current.innerHTML = ''

        const url = `${window.location.origin}/friends?code=${encodeURIComponent(friendCode)}`

        // eslint-disable-next-line no-undef
        new QRCode(divRef.current, {
          text: url,
          width:  QR_SIZE,
          height: QR_SIZE,
          colorDark:  '#0d2010',
          colorLight: '#f0faf0',
          correctLevel: QRCode.CorrectLevel.H, // high error correction for logo overlay
        })

        // Wait for QRCode to render its canvas/img
        await new Promise(r => setTimeout(r, 120))
        if (cancelled || !divRef.current) return

        // Get the rendered element (img or canvas)
        const qrEl = divRef.current.querySelector('canvas') || divRef.current.querySelector('img')
        if (!qrEl) { setReady(true); return }

        // Composite onto our own canvas: QR + logo overlay
        const canvas = canvasRef.current
        canvas.width  = QR_SIZE
        canvas.height = QR_SIZE
        const ctx = canvas.getContext('2d')

        // Draw QR background
        if (qrEl.tagName === 'CANVAS') {
          ctx.drawImage(qrEl, 0, 0, QR_SIZE, QR_SIZE)
        } else {
          await new Promise(resolve => {
            const img = new Image()
            img.onload = () => { ctx.drawImage(img, 0, 0, QR_SIZE, QR_SIZE); resolve() }
            img.src = qrEl.src
          })
        }

        // Draw white circle background for logo
        const logoSize = Math.round(QR_SIZE * LOGO_SIZE_RATIO)
        const cx = QR_SIZE / 2
        const cy = QR_SIZE / 2
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, logoSize / 2 + 6, 0, Math.PI * 2)
        ctx.fillStyle = '#f0faf0'
        ctx.fill()
        ctx.restore()

        // Draw logo SVG as image
        const logoImg = new Image()
        logoImg.onload = () => {
          ctx.drawImage(logoImg, cx - logoSize/2, cy - logoSize/2, logoSize, logoSize)
          if (!cancelled) setReady(true)
        }
        logoImg.onerror = () => { if (!cancelled) setReady(true) } // still show QR without logo
        logoImg.src = '/tree-icon.svg'

      } catch (e) {
        console.warn('QR generation failed', e)
        if (!cancelled) setError(true)
      }
    }

    build()
    return () => { cancelled = true }
  }, [friendCode])

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `treedegrees-${friendCode}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/friends?code=${encodeURIComponent(friendCode)}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!friendCode) return null

  return (
    <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-5">
      <p className="text-forest-400 text-xs uppercase tracking-wider mb-1">Your QR Code</p>
      <p className="text-forest-600 text-xs mb-4">
        Friends scan this to add you instantly — no typing needed
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* QR canvas — hidden div drives generation, canvas shows the result */}
        <div className="relative flex-shrink-0">
          <div ref={divRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}/>
          <canvas ref={canvasRef}
            style={{
              borderRadius: 12,
              border: '3px solid #1a3a1a',
              display: 'block',
              width: QR_SIZE,
              height: QR_SIZE,
              background: '#f0faf0',
              opacity: ready ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
          {!ready && !error && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: '#0d1f0d', borderRadius: 12,
            }}>
              <div style={{ width: 28, height: 28, border: '2px solid #1f3a1f', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1f0d', borderRadius: 12 }}>
              <p style={{ color: '#4b5563', fontSize: 12 }}>QR unavailable</p>
            </div>
          )}
        </div>

        {/* Info + buttons */}
        <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
          <div>
            <p className="text-forest-200 font-medium text-sm mb-0.5">How it works</p>
            <p className="text-forest-500 text-xs leading-relaxed">
              When a friend scans this QR code, they&apos;re taken directly to your connection page
              with your friend code pre-filled. They choose Public or Private, then tap
              Send Request — done.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={handleSave} disabled={!ready}
              className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-600 disabled:opacity-40 text-forest-100 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              <span>⬇</span> Save QR Code
            </button>
            <button onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 border border-forest-700 hover:border-forest-500 text-forest-400 hover:text-forest-200 text-sm px-4 py-2.5 rounded-xl transition-colors">
              <span>{copied ? '✓' : '🔗'}</span>
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
          </div>

          <p className="text-forest-800 text-xs text-center">
            QR code is permanent and never expires
          </p>
        </div>
      </div>
    </div>
  )
}
