// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom'

const features = [
  {
    icon: '🔐',
    title: 'Friend Codes Only',
    desc: 'Connect exclusively via unique SHA-256 generated codes. No email harvesting, no suggested followers.',
  },
  {
    icon: '🗺️',
    title: 'Global Graph Map',
    desc: 'See your connections on an interactive world map. 1st, 2nd, and 3rd degree links rendered in real time.',
  },
  {
    icon: '🌿',
    title: 'Degrees of Separation',
    desc: 'Breadth-first search reveals exactly how you\'re connected to anyone in the network.',
  },
  {
    icon: '🛡️',
    title: 'Privacy First',
    desc: 'Toggle public/private per connection. Private links show only a line — no identity revealed.',
  },
  {
    icon: '📋',
    title: 'Daily Note',
    desc: 'One update every 24 hours. No doom-scroll, no algorithmic feed. Just a single honest note.',
  },
  {
    icon: '🗑️',
    title: 'GDPR Compliant',
    desc: 'Delete your account and all PII at any time. Your data, your choice.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-forest-950 relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-forest-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-forest-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-48 h-48 bg-bark-700/8 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌳</span>
          <span className="font-display text-forest-100 text-xl">TreeDegrees</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm py-2 px-4">Sign in</Link>
          <Link to="/signup" className="btn-primary text-sm py-2 px-4">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-800/60 border border-forest-700 text-forest-300 text-sm mb-8 fade-in">
          <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse" />
          Privacy-first social graph
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-forest-50 leading-tight mb-6 slide-up">
          How many degrees<br />
          <span className="text-forest-400">connect you</span> to<br />
          the world?
        </h1>

        <p className="text-forest-400 text-lg max-w-2xl mx-auto mb-10 fade-in">
          TreeDegrees maps your global social network on an interactive globe.
          Connect via unique friend codes. See your 1st, 2nd, and 3rd degree links.
          One daily note. No algorithm. No ads.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in">
          <Link to="/signup" className="btn-primary text-base py-3 px-8">
            Plant your tree →
          </Link>
          <Link to="/login" className="btn-ghost text-base py-3 px-8">
            Sign in
          </Link>
        </div>
      </section>

      {/* Map preview illustration */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-24">
        <div className="rounded-2xl glass border border-forest-700/50 overflow-hidden p-1">
          <div className="rounded-xl bg-forest-950 h-64 flex items-center justify-center relative overflow-hidden">
            {/* Fake map nodes */}
            <svg viewBox="0 0 800 260" className="w-full h-full opacity-70">
              {/* Grid lines */}
              {[...Array(9)].map((_, i) => (
                <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="260" stroke="#1f7e1f" strokeWidth="0.5" strokeOpacity="0.3" />
              ))}
              {[...Array(5)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 65} x2="800" y2={i * 65} stroke="#1f7e1f" strokeWidth="0.5" strokeOpacity="0.3" />
              ))}
              {/* Degree-3 connections */}
              <line x1="80" y1="200" x2="250" y2="150" stroke="#4444aa" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4 3"/>
              <line x1="650" y1="80" x2="720" y2="190" stroke="#4444aa" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4 3"/>
              {/* Degree-2 connections */}
              <line x1="250" y1="150" x2="400" y2="130" stroke="#966535" strokeWidth="1.5" strokeOpacity="0.6"/>
              <line x1="400" y1="130" x2="580" y2="80" stroke="#966535" strokeWidth="1.5" strokeOpacity="0.6"/>
              <line x1="580" y1="80" x2="650" y2="80" stroke="#966535" strokeWidth="1.5" strokeOpacity="0.6"/>
              {/* Degree-1 connections */}
              <line x1="400" y1="130" x2="470" y2="170" stroke="#2d9e2d" strokeWidth="2" strokeOpacity="0.8"/>
              <line x1="400" y1="130" x2="340" y2="90" stroke="#2d9e2d" strokeWidth="2" strokeOpacity="0.8"/>
              {/* Nodes - degree 3 */}
              <circle cx="80" cy="200" r="6" fill="#3a3a6a" stroke="#6868b8" strokeWidth="2"/>
              <circle cx="720" cy="190" r="6" fill="#3a3a6a" stroke="#6868b8" strokeWidth="2"/>
              <circle cx="650" cy="80" r="6" fill="#3a3a6a" stroke="#6868b8" strokeWidth="2"/>
              {/* Nodes - degree 2 */}
              <circle cx="250" cy="150" r="7" fill="#966535" stroke="#d0b47f" strokeWidth="2"/>
              <circle cx="580" cy="80" r="7" fill="#966535" stroke="#d0b47f" strokeWidth="2"/>
              {/* Nodes - degree 1 */}
              <circle cx="470" cy="170" r="8" fill="#4dba4d" stroke="#80d580" strokeWidth="2"/>
              <circle cx="340" cy="90" r="8" fill="#4dba4d" stroke="#80d580" strokeWidth="2"/>
              {/* Me node */}
              <circle cx="400" cy="130" r="11" fill="#2d9e2d" stroke="#80d580" strokeWidth="3" opacity="0.9"/>
              <circle cx="400" cy="130" r="18" fill="none" stroke="#2d9e2d" strokeWidth="1" opacity="0.4"/>
              {/* Labels */}
              <text x="400" y="155" textAnchor="middle" fill="#80d580" fontSize="11" fontFamily="DM Sans">You</text>
            </svg>
            <div className="absolute bottom-3 right-4 flex items-center gap-4 text-xs font-body">
              <span className="flex items-center gap-1.5 text-forest-400"><span className="w-2 h-2 rounded-full bg-forest-500 inline-block"/>1st degree</span>
              <span className="flex items-center gap-1.5 text-bark-400"><span className="w-2 h-2 rounded-full bg-bark-600 inline-block"/>2nd degree</span>
              <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-800 inline-block"/>3rd degree</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <h2 className="font-display text-3xl text-forest-100 text-center mb-12">
          Built different, by design
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-5 hover:border-forest-600 transition-colors duration-200">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-medium text-forest-100 mb-2">{title}</h3>
              <p className="text-forest-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-forest-900 py-8 px-6 text-center">
        <p className="text-forest-600 text-sm">
          🌳 TreeDegrees — Open source, privacy-first social graph
        </p>
      </footer>
    </div>
  )
}
