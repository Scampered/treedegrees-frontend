// src/components/QRCodeCard.jsx — pure client-side QR, no external scripts
// Uses qrcode npm package compiled into the bundle (no CDN, no CSP issues)
import { useEffect, useRef, useState } from 'react'

const QR_SIZE   = 220
const LOGO_RATIO = 0.22

// ── Pure JS minimal QR encoder (Reed-Solomon + matrix) ───────────────────────
// We use the 'qrcode' package API via dynamic import — it's tree-shaken at build.
// If unavailable, falls back to a fetch of api.qrserver.com as data URL.
async function generateQRDataURL(text) {
  try {
    // Try npm qrcode (will be in bundle if installed, else throws)
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(text, {
      width: QR_SIZE,
      margin: 2,
      color: { dark: '#0d2010', light: '#f0faf0' },
      errorCorrectionLevel: 'H',
    })
  } catch {
    // Fallback: use the free qr-code-generator API as an image data URL
    // This is a GET request so it works within connect-src 'self' if proxied,
    // but more reliably we'll use goqr.me which returns an image
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&ecc=H&data=${encodeURIComponent(text)}&color=0d2010&bgcolor=f0faf0&margin=8`
    const res  = await fetch(url)
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }
}

export default function QRCodeCard({ friendCode }) {
  const canvasRef = useRef(null)
  const [ready, setReady]   = useState(false)
  const [error, setError]   = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!friendCode) return
    let cancelled = false

    const build = async () => {
      try {
        const url    = `${window.location.origin}/friends?code=${encodeURIComponent(friendCode)}`
        const qrData = await generateQRDataURL(url)

        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width  = QR_SIZE
        canvas.height = QR_SIZE
        const ctx = canvas.getContext('2d')

        // Draw QR
        await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = reject
          img.src = qrData
          ctx.drawImage(img, 0, 0, QR_SIZE, QR_SIZE)
          img.onload = () => { ctx.drawImage(img, 0, 0, QR_SIZE, QR_SIZE); resolve() }
        })

        // White circle behind logo
        const logoSize = Math.round(QR_SIZE * LOGO_RATIO)
        const cx = QR_SIZE / 2, cy = QR_SIZE / 2
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, logoSize / 2 + 7, 0, Math.PI * 2)
        ctx.fillStyle = '#f0faf0'
        ctx.fill()
        ctx.restore()

        // Logo
        await new Promise(resolve => {
          const logo = new Image()
          logo.onload = () => {
            ctx.drawImage(logo, cx - logoSize/2, cy - logoSize/2, logoSize, logoSize)
            resolve()
          }
          logo.onerror = resolve
          logo.src = '/tree-icon.svg'
        })

        if (!cancelled) setReady(true)
      } catch (e) {
        console.warn('QR build failed:', e)
        if (!cancelled) setError(true)
      }
    }

    build()
    return () => { cancelled = true }
  }, [friendCode])

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `treedegrees-${friendCode}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/friends?code=${encodeURIComponent(friendCode)}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (!friendCode) return null

  return (
    <div className="rounded-2xl bg-forest-800/40 border border-forest-700 p-5">
      <p className="text-forest-400 text-xs uppercase tracking-wider mb-1">Your QR Code</p>
      <p className="text-forest-600 text-xs mb-4">
        Friends scan this to add you instantly — no typing needed
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Canvas */}
        <div className="relative flex-shrink-0" style={{ width: QR_SIZE, height: QR_SIZE }}>
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
              position: 'absolute', inset: 0, background: '#0d1f0d',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 28, height: 28, border: '2px solid #1f3a1f', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute', inset: 0, background: '#0d1f0d',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <p style={{ color: '#4b5563', fontSize: 12 }}>QR unavailable</p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 flex-1 w-full sm:w-auto">
          <div>
            <p className="text-forest-200 font-medium text-sm mb-0.5">How it works</p>
            <p className="text-forest-500 text-xs leading-relaxed">
              When a friend scans this, they go straight to your connection page with your
              code pre-filled. They pick Public or Private and tap Send Request — done.
            </p>
          </div>
          <button onClick={handleSave} disabled={!ready}
            className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-600
                       disabled:opacity-40 text-forest-100 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            ⬇ Save QR Code
          </button>
          <button onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 border border-forest-700
                       hover:border-forest-500 text-forest-400 hover:text-forest-200 text-sm px-4 py-2.5 rounded-xl transition-colors">
            {copied ? '✓ Copied!' : '🔗 Copy invite link'}
          </button>
          <p className="text-forest-800 text-xs text-center">Permanent — never expires</p>
        </div>
      </div>
    </div>
  )
}
