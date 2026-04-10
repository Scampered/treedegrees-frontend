// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-forest-950 relative overflow-hidden font-body">

      {/* Soft background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/3 w-[500px] h-[500px] bg-forest-800/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-forest-700/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-bark-800/10 rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌳</span>
          <span className="font-display text-forest-100 text-xl tracking-tight">TreeDegrees</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-forest-400 hover:text-forest-200 text-sm px-4 py-2 rounded-lg hover:bg-forest-900 transition-colors">
            Sign in
          </Link>
          <Link to="/signup" className="bg-forest-600 hover:bg-forest-500 text-white text-sm px-5 py-2 rounded-full transition-colors font-medium">
            Join free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-900 border border-forest-700/60 text-forest-300 text-sm mb-7 fade-in">
          <span className="w-2 h-2 rounded-full bg-forest-400 animate-pulse inline-block" />
          No ads. No algorithm. Just your people.
        </div>

        <h1 className="font-display text-5xl sm:text-6xl text-forest-50 leading-[1.1] mb-5 slide-up">
          See how you're connected<br />
          <span className="text-forest-400">to everyone you know</span>
        </h1>

        <p className="text-forest-400 text-lg max-w-xl mx-auto mb-8 leading-relaxed fade-in">
          TreeDegrees is a cosy little social map for you and your friends.
          Add people with a private code, drop a daily note, and watch your
          network grow across the globe 🌍
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center fade-in">
          <Link to="/signup" className="bg-forest-600 hover:bg-forest-500 text-white font-medium py-3 px-8 rounded-full text-base transition-all active:scale-95">
            Plant your tree 🌱
          </Link>
          <Link to="/login" className="text-forest-300 hover:text-forest-100 font-medium py-3 px-8 rounded-full text-base border border-forest-700 hover:border-forest-500 transition-all">
            Already have an account
          </Link>
        </div>
      </section>

      {/* Graph preview */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 mb-20">
        <div className="rounded-3xl bg-forest-900/50 border border-forest-800 overflow-hidden">
          <div className="px-5 pt-4 pb-1 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-forest-700" />
            <div className="w-3 h-3 rounded-full bg-forest-700" />
            <div className="w-3 h-3 rounded-full bg-forest-700" />
            <span className="text-forest-600 text-xs ml-2">Your network map</span>
          </div>
          <div className="h-56 sm:h-72 flex items-center justify-center relative overflow-hidden px-4 pb-4">
            <svg viewBox="0 0 760 240" className="w-full h-full">
              {/* Faint grid */}
              {[...Array(8)].map((_, i) => (
                <line key={`v${i}`} x1={i*110} y1="0" x2={i*110} y2="240" stroke="#1f7e1f" strokeWidth="0.4" strokeOpacity="0.25"/>
              ))}
              {[...Array(4)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i*80} x2="760" y2={i*80} stroke="#1f7e1f" strokeWidth="0.4" strokeOpacity="0.25"/>
              ))}
              {/* 3rd degree lines */}
              <line x1="60" y1="190" x2="210" y2="145" stroke="#4444aa" strokeWidth="1" strokeOpacity="0.45" strokeDasharray="4 4"/>
              <line x1="660" y1="70" x2="710" y2="185" stroke="#4444aa" strokeWidth="1" strokeOpacity="0.45" strokeDasharray="4 4"/>
              {/* 2nd degree lines */}
              <line x1="210" y1="145" x2="370" y2="120" stroke="#966535" strokeWidth="1.5" strokeOpacity="0.6"/>
              <line x1="370" y1="120" x2="550" y2="72" stroke="#966535" strokeWidth="1.5" strokeOpacity="0.6"/>
              <line x1="550" y1="72" x2="660" y2="70" stroke="#966535" strokeWidth="1.5" strokeOpacity="0.6"/>
              {/* 1st degree lines */}
              <line x1="370" y1="120" x2="445" y2="165" stroke="#2d9e2d" strokeWidth="2.5" strokeOpacity="0.85"/>
              <line x1="370" y1="120" x2="305" y2="78" stroke="#2d9e2d" strokeWidth="2.5" strokeOpacity="0.85"/>
              {/* 3rd nodes */}
              <circle cx="60" cy="190" r="5" fill="#2e2e5e" stroke="#5858a8" strokeWidth="1.5"/>
              <circle cx="710" cy="185" r="5" fill="#2e2e5e" stroke="#5858a8" strokeWidth="1.5"/>
              <circle cx="660" cy="70" r="5" fill="#2e2e5e" stroke="#5858a8" strokeWidth="1.5"/>
              {/* 2nd nodes */}
              <circle cx="210" cy="145" r="6.5" fill="#7a5028" stroke="#c8a060" strokeWidth="1.5"/>
              <circle cx="550" cy="72" r="6.5" fill="#7a5028" stroke="#c8a060" strokeWidth="1.5"/>
              {/* 1st nodes */}
              <circle cx="445" cy="165" r="8" fill="#2d7a2d" stroke="#5dba5d" strokeWidth="2"/>
              <circle cx="305" cy="78" r="8" fill="#2d7a2d" stroke="#5dba5d" strokeWidth="2"/>
              {/* Me node — pulsing ring */}
              <circle cx="370" cy="120" r="22" fill="none" stroke="#2d9e2d" strokeWidth="0.8" strokeOpacity="0.3"/>
              <circle cx="370" cy="120" r="14" fill="none" stroke="#2d9e2d" strokeWidth="1" strokeOpacity="0.5"/>
              <circle cx="370" cy="120" r="10" fill="#1f7e1f" stroke="#5dba5d" strokeWidth="2.5"/>
              <text x="370" y="143" textAnchor="middle" fill="#80d580" fontSize="10" fontFamily="DM Sans, sans-serif" fontWeight="500">you</text>
              {/* Name tags on 1st degree */}
              <text x="445" y="182" textAnchor="middle" fill="#4dba4d" fontSize="9" fontFamily="DM Sans, sans-serif" opacity="0.8">Alex</text>
              <text x="305" y="65" textAnchor="middle" fill="#4dba4d" fontSize="9" fontFamily="DM Sans, sans-serif" opacity="0.8">Sara</text>
            </svg>
            {/* Legend */}
            <div className="absolute bottom-3 right-4 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-forest-400"><span className="w-2 h-2 rounded-full bg-forest-600 inline-block"/>friends</span>
              <span className="flex items-center gap-1 text-bark-400"><span className="w-2 h-2 rounded-full bg-bark-600 inline-block"/>friends of friends</span>
              <span className="flex items-center gap-1 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-800 inline-block"/>3rd degree</span>
            </div>
          </div>
        </div>
        <p className="text-center text-forest-600 text-sm mt-3">
          Every dot is a real person. Every line is a real connection.
        </p>
      </div>

      {/* How it works — friendly 3 steps */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-20">
        <h2 className="font-display text-3xl text-forest-100 text-center mb-3">
          How it works
        </h2>
        <p className="text-forest-500 text-center text-sm mb-10">Three simple steps to see your world</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '1', icon: '🌱', title: 'Create your tree', desc: 'Sign up and get your unique friend code — a short string only you have.' },
            { step: '2', icon: '🤝', title: 'Share your code', desc: 'Send your code to friends. They add you, you add them. No email hunting, no strangers.' },
            { step: '3', icon: '🗺️', title: 'Watch it grow', desc: 'See your connections appear on a live world map. Discover how far your tree really reaches.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-forest-800 border border-forest-700 flex items-center justify-center text-2xl mx-auto mb-4">
                {icon}
              </div>
              <p className="text-forest-600 text-xs mb-1">Step {step}</p>
              <h3 className="text-forest-100 font-medium mb-2">{title}</h3>
              <p className="text-forest-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features — relaxed cards */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-24">
        <h2 className="font-display text-3xl text-forest-100 text-center mb-3">
          Made for friends, not followers
        </h2>
        <p className="text-forest-500 text-center text-sm mb-10">Everything you need, nothing you don't</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '🔑', title: 'Friend codes only', desc: 'The only way to connect is with a private code. No suggested strangers, no follower counts.' },
            { icon: '📍', title: 'Live world map', desc: 'Your connections appear as glowing dots on a real interactive globe. Zoom in, click around.' },
            { icon: '📝', title: 'One daily note', desc: 'Post a single thought each day. No scrolling, no likes — just a quiet message to your people.' },
            { icon: '🔒', title: 'You control your privacy', desc: 'Choose who sees your exact location. Private mode shows only your country, not your city.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex gap-4 p-5 rounded-2xl bg-forest-900/40 border border-forest-800 hover:border-forest-700 transition-colors">
              <div className="text-2xl flex-shrink-0 mt-0.5">{icon}</div>
              <div>
                <h3 className="text-forest-100 font-medium mb-1">{title}</h3>
                <p className="text-forest-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-xl mx-auto px-6 mb-24 text-center">
        <div className="rounded-3xl bg-forest-800/40 border border-forest-700 p-10">
          <div className="text-4xl mb-4">🌳</div>
          <h2 className="font-display text-3xl text-forest-50 mb-3">Ready to plant your tree?</h2>
          <p className="text-forest-400 text-sm mb-6">Free forever. No ads. No creepy tracking.</p>
          <Link to="/signup" className="inline-block bg-forest-600 hover:bg-forest-500 text-white font-medium py-3 px-10 rounded-full text-base transition-all active:scale-95">
            Get started — it's free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-forest-900 py-8 px-6 text-center">
        <p className="text-forest-700 text-sm mb-3">🌳 TreeDegrees — your social graph, your way</p>
        <div className="flex items-center justify-center gap-4 text-xs text-forest-800">
          <Link to="/privacy" className="hover:text-forest-500 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-forest-500 transition-colors">Terms of Service</Link>
          <span>·</span>
          <a href="mailto:tree3degrees@gmail.com" className="hover:text-forest-500 transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  )
}
