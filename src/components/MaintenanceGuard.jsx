// src/components/MaintenanceGuard.jsx
// Wraps a page and shows maintenance screen if admin has toggled it down.
import { useEffect, useState } from 'react'
import { maintenanceApi } from '../api/client'

let cachedStatus = null
let cacheTime = 0

export default function MaintenanceGuard({ pageKey, children }) {
  const [status, setStatus] = useState(null) // null=loading, false=live, object=maintenance

  useEffect(() => {
    // Cache maintenance status for 60 seconds to avoid hammering the API
    const now = Date.now()
    if (cachedStatus && now - cacheTime < 60000) {
      const page = cachedStatus[pageKey]
      setStatus(page?.isDown ? page : false)
      return
    }
    maintenanceApi.check().then(data => {
      cachedStatus = data
      cacheTime = Date.now()
      const page = data[pageKey]
      setStatus(page?.isDown ? page : false)
    }).catch(() => setStatus(false))
  }, [pageKey])

  if (status === null) return null // brief loading flash — acceptable
  if (status) return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="text-5xl mb-5">🔧</div>
      <h2 className="font-display text-2xl text-forest-100 mb-2">Under Maintenance</h2>
      <p className="text-forest-400 max-w-sm leading-relaxed">
        {status.message || 'This page is temporarily unavailable. Please check back soon.'}
      </p>
      <p className="text-forest-700 text-xs mt-6">TreeDegrees</p>
    </div>
  )
  return children
}
