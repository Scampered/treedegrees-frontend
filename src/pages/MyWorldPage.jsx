// src/pages/MyWorldPage.jsx — My World hub: Memories, Wall (future), Tree (future)
import { useState } from 'react'
import MemoriesPage from './MemoriesPage'

export default function MyWorldPage() {
  const [tab, setTab] = useState('memories')

  const tabs = [
    { id:'memories', icon:'📸', label:'Memories' },
    { id:'wall',     icon:'🪵', label:'Wall', soon:true },
    { id:'tree',     icon:'🌳', label:'My Tree', soon:true },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Top tab bar */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-forest-800 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => !t.soon && setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm font-medium
                       transition-colors relative
              ${t.id===tab && !t.soon
                ? 'bg-forest-900 text-forest-100 border-t border-x border-forest-700'
                : t.soon
                ? 'text-forest-700 cursor-default'
                : 'text-forest-500 hover:text-forest-300'}`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.soon && (
              <span className="absolute -top-1 -right-1 bg-forest-800 text-forest-600 text-[8px] px-1 rounded-full">
                soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab==='memories' && <MemoriesPage />}
      </div>
    </div>
  )
}
