// src/pages/GuidePage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'

const sections = [
  { id: 'what',        emoji: '🌳', label: 'What is TreeDegrees?' },
  { id: 'connections', emoji: '🌿', label: 'Connections'          },
  { id: 'privacy',     emoji: '🔒', label: 'Privacy'              },
  { id: 'nicknames',   emoji: '✏️',  label: 'Nicknames'            },
  { id: 'map',         emoji: '🗺️',  label: 'The Map'              },
  { id: 'notes',       emoji: '📝',  label: 'Daily Notes'          },
  { id: 'letters',     emoji: '✉️',  label: 'Letters & Streaks'    },
  { id: 'vehicles',    emoji: '🚗',  label: 'Delivery Vehicles'    },
  { id: 'groups',     emoji: '☘️',  label: 'Groups'               },
  { id: 'grove',      emoji: '🪴',  label: 'The Grove'            },
  { id: 'markets',    emoji: '📈',  label: 'Markets'              },
  { id: 'jobs',       emoji: '💼',  label: 'Jobs'                 },
  { id: 'games',      emoji: '🎮',  label: 'Games & Activities'   },
]

function SectionTab({ id, emoji, label, active, onClick }) {
  return (
    <button onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
        ${active
          ? 'bg-forest-700 text-forest-100'
          : 'text-forest-400 hover:text-forest-200 hover:bg-forest-900'}`}>
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <span className="text-sm font-medium">{label}</span>
      {active && <span className="ml-auto text-forest-400">›</span>}
    </button>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl bg-forest-900/40 border border-forest-800 p-5 ${className}`}>
      {children}
    </div>
  )
}

function Pill({ children, color = 'green' }) {
  const colors = {
    green:  'bg-forest-800 text-forest-300 border-forest-700',
    amber:  'bg-bark-900/60 text-bark-300 border-bark-700',
    blue:   'bg-indigo-900/60 text-indigo-300 border-indigo-700',
    red:    'bg-red-900/40 text-red-300 border-red-800',
    purple: 'bg-purple-900/40 text-purple-300 border-purple-800',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

function StepRow({ num, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-forest-700 border border-forest-600 flex items-center justify-center text-forest-200 text-sm font-medium flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <p className="text-forest-100 text-sm font-medium">{title}</p>
        <p className="text-forest-500 text-sm mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// ── Section content ───────────────────────────────────────────────────────────

function SectionWhat() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">What is TreeDegrees? 🌳</h2>
        <p className="text-forest-400 text-sm">The short version, no corporate speak.</p>
      </div>

      <Card>
        <p className="text-forest-200 leading-relaxed">
          TreeDegrees is a <span className="text-forest-100 font-medium">private social graph</span> — a way to stay connected with the people you actually know, visualised as a living map of your world.
        </p>
        <p className="text-forest-400 text-sm mt-3 leading-relaxed">
          Unlike regular social media, there's no feed of strangers, no likes, no algorithms pushing content at you. Just you, your friends, and the connections between you — shown on a real globe.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { emoji: '🔐', title: 'Friend codes only', desc: 'No one can find you by searching. You connect by sharing a personal code.' },
          { emoji: '🗺️', title: 'See your network', desc: 'Your friends show up on a real map with their city, note, and degree of connection.' },
          { emoji: '✉️', title: 'Send letters', desc: 'Write short messages that travel to your friend — the farther away, the longer the journey.' },
        ].map(item => (
          <Card key={item.title} className="text-center">
            <div className="text-3xl mb-2">{item.emoji}</div>
            <p className="text-forest-200 text-sm font-medium mb-1">{item.title}</p>
            <p className="text-forest-500 text-xs leading-relaxed">{item.desc}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Degrees explained</p>
        <div className="space-y-3">
          {[
            { deg: '1st degree 🟢', desc: 'People you\'ve directly connected with using friend codes. You can see their profile, notes, and send them letters.' },
            { deg: '2nd degree 🟡', desc: 'Friends of your friends. You can see them on the map but can\'t contact them directly — yet.' },
            { deg: '3rd degree 🔵', desc: 'Friends of friends of friends. Shown faintly on the map to show how far your network reaches.' },
          ].map(({ deg, desc }) => (
            <div key={deg} className="flex gap-3">
              <p className="text-forest-200 text-sm font-medium w-36 flex-shrink-0">{deg}</p>
              <p className="text-forest-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SectionConnections() {
  const [step, setStep] = useState(0)
  const steps = [
    { title: 'Find your friend code', desc: 'Go to your Dashboard or Settings — your code is the big string of letters and numbers at the bottom. It\'s unique to you and can\'t be reverse-engineered.' },
    { title: 'Share it with a friend', desc: 'Copy it and send it however you want — WhatsApp, text, in person, written on a napkin. Up to you.' },
    { title: 'They add you (or vice versa)', desc: 'Go to Connections → Add by code. Paste their code and hit Add. They\'ll get a request to accept.' },
    { title: 'Accept the request', desc: 'Once they accept, you\'re connected! You\'ll both appear on each other\'s map and can start sending letters.' },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Connections 🌿</h2>
        <p className="text-forest-400 text-sm">How to add people and what it means.</p>
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-4">How to connect with someone</p>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} onClick={() => setStep(i)} className="cursor-pointer">
              <StepRow num={i + 1} title={s.title} desc={step === i ? s.desc : ''} />
              {step !== i && (
                <p className="text-forest-600 text-xs ml-12 mt-0.5 italic">Tap to expand</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">What happens after connecting?</p>
        <div className="space-y-2 text-sm">
          {[
            ['✅', 'You appear on each other\'s maps'],
            ['✅', 'You can read their daily notes'],
            ['✅', 'You can send and receive letters'],
            ['✅', 'Their friends become your 2nd degree'],
            ['✅', 'You can set a personal nickname for them'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-2 text-forest-300">
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-forest-700 bg-forest-800/30">
        <p className="text-forest-300 text-sm font-medium mb-1">💡 Good to know</p>
        <p className="text-forest-400 text-sm leading-relaxed">
          You can remove a connection any time from your Connections page. The other person won't be notified — they'll just stop seeing you on the map.
        </p>
      </Card>
    </div>
  )
}

function SectionPrivacy() {
  const [which, setWhich] = useState('public')
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Privacy 🔒</h2>
        <p className="text-forest-400 text-sm">You control exactly who sees what.</p>
      </div>

      <div className="flex gap-2">
        {['public', 'private'].map(v => (
          <button key={v} onClick={() => setWhich(v)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
              ${which === v ? 'bg-forest-700 text-forest-100' : 'bg-forest-900 text-forest-500 hover:text-forest-300'}`}>
            {v === 'public' ? '🌍 Public profile' : '🔒 Private profile'}
          </button>
        ))}
      </div>

      {which === 'public' ? (
        <Card>
          <p className="text-forest-200 text-sm font-medium mb-3">Your profile is public</p>
          <div className="space-y-2 text-sm">
            {[
              ['2nd/3rd degree', 'Can see your nickname & city'],
              ['2nd/3rd degree', 'Can see your daily notes'],
              ['Your direct friends', 'See everything as normal'],
              ['Random strangers', 'Still can\'t find you — no search exists'],
            ].map(([who, what]) => (
              <div key={who + what} className="flex gap-3">
                <Pill color="green">{who}</Pill>
                <span className="text-forest-400 self-center">{what}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-forest-200 text-sm font-medium mb-3">Your profile is private</p>
          <div className="space-y-2 text-sm">
            {[
              ['2nd/3rd degree', 'See a "?" on the map — no name, no notes'],
              ['2nd/3rd degree', 'See approximate country only'],
              ['Your direct friends', 'See everything as normal'],
            ].map(([who, what]) => (
              <div key={who + what} className="flex gap-3">
                <Pill color="red">{who}</Pill>
                <span className="text-forest-400 self-center">{what}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Per-connection privacy</p>
        <p className="text-forest-400 text-sm leading-relaxed mb-3">
          Even with a public profile, you can mark individual connections as private. This hides that friendship from your other connections' maps — like keeping two friend groups separate.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Pill color="green">Public link — solid line on map</Pill>
          <Pill color="amber">Private link — dashed line, hidden to others</Pill>
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Location privacy</p>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Exact', desc: 'Your real coordinates shown on map' },
            { label: 'Private', desc: 'Exact for direct friends, country capital for others' },
            { label: 'Hidden', desc: 'Country capital for everyone, including direct friends' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-3 items-start">
              <span className="text-forest-300 font-medium w-16 flex-shrink-0 text-sm">{label}</span>
              <span className="text-forest-500 text-sm">{desc}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SectionNicknames() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Nicknames ✏️</h2>
        <p className="text-forest-400 text-sm">Two kinds — yours and theirs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <p className="text-forest-300 text-sm font-medium mb-2">Your own nickname</p>
          <p className="text-forest-500 text-sm leading-relaxed">
            Set in Settings. This is the name everyone sees for you across the whole app — on the map, in letters, in streaks. Your full name is never shown unless you're a direct friend.
          </p>
        </Card>
        <Card>
          <p className="text-forest-300 text-sm font-medium mb-2">Nicknames you set for others</p>
          <p className="text-forest-500 text-sm leading-relaxed">
            From your Connections page, you can give each friend a personal nickname — only you see it. Great for keeping track of who's who.
          </p>
        </Card>
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Nickname priority — who sees what</p>
        <div className="space-y-3">
          {[
            { rank: '1st', label: 'Your personal nickname for them', desc: 'If you\'ve set one, this always wins. Only you see it.' },
            { rank: '2nd', label: 'Their own nickname', desc: 'What they\'ve chosen to be called everywhere.' },
            { rank: '3rd', label: 'Their first name', desc: 'Fallback if no nickname is set.' },
          ].map(({ rank, label, desc }) => (
            <div key={rank} className="flex gap-3 items-start">
              <span className="text-forest-600 text-xs font-medium w-8 flex-shrink-0 mt-1">{rank}</span>
              <div>
                <p className="text-forest-200 text-sm font-medium">{label}</p>
                <p className="text-forest-500 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-2">Nickname propagation</p>
        <p className="text-forest-400 text-sm leading-relaxed">
          If you have a public profile and your connection is public, the nickname you've set for someone can propagate — your mutual friends might see that nickname for that person too, based on the closest degree. Multiple nicknames from the same degree show as <span className="text-forest-200 font-mono text-xs bg-forest-800 px-1.5 py-0.5 rounded">Name1 / Name2</span>.
        </p>
      </Card>
    </div>
  )
}

function SectionMap() {
  const [activeNode, setActiveNode] = useState(null)
  const nodes = [
    { id: 'you', label: 'You', deg: 0, color: '#2d9e2d', x: 50, y: 50 },
    { id: 'a',   label: 'Friend', deg: 1, color: '#4dba4d', x: 75, y: 30 },
    { id: 'b',   label: 'Friend', deg: 1, color: '#4dba4d', x: 30, y: 25 },
    { id: 'c',   label: '2nd',    deg: 2, color: '#966535', x: 85, y: 55 },
    { id: 'd',   label: '2nd',    deg: 2, color: '#966535', x: 15, y: 45 },
    { id: 'e',   label: '3rd',    deg: 3, color: '#3a3a6a', x: 90, y: 35 },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">The Map 🗺️</h2>
        <p className="text-forest-400 text-sm">Your network, plotted on the globe.</p>
      </div>

      {/* Mini interactive map demo */}
      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Tap a node to learn about it</p>
        <div className="relative rounded-xl bg-forest-950/60 border border-forest-800 overflow-hidden" style={{ height: 180 }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Lines */}
            <line x1="50" y1="50" x2="75" y2="30" stroke="#4dba4d" strokeWidth="0.4" opacity="0.7"/>
            <line x1="50" y1="50" x2="30" y2="25" stroke="#4dba4d" strokeWidth="0.4" opacity="0.7"/>
            <line x1="75" y1="30" x2="85" y2="55" stroke="#966535" strokeWidth="0.3" opacity="0.5" strokeDasharray="1 1"/>
            <line x1="30" y1="25" x2="15" y2="45" stroke="#966535" strokeWidth="0.3" opacity="0.5" strokeDasharray="1 1"/>
            <line x1="85" y1="55" x2="90" y2="35" stroke="#3a3a6a" strokeWidth="0.25" opacity="0.4" strokeDasharray="0.5 1"/>
            {nodes.map(n => (
              <circle key={n.id} cx={n.x} cy={n.y}
                r={n.deg === 0 ? 4 : n.deg === 1 ? 3 : n.deg === 2 ? 2 : 1.5}
                fill={n.color}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveNode(activeNode === n.id ? null : n.id)}
                stroke={activeNode === n.id ? '#fff' : 'transparent'}
                strokeWidth="1"
              />
            ))}
          </svg>
        </div>
        {activeNode && (() => {
          const n = nodes.find(x => x.id === activeNode)
          const info = {
            you:  'This is you — the bright green dot at your location.',
            a:    '1st degree — a direct friend. Solid green line between you.',
            b:    '1st degree — another direct friend.',
            c:    '2nd degree — a friend of your friend. Dashed amber line.',
            d:    '2nd degree — another friend-of-friend.',
            e:    '3rd degree — friend of a friend of a friend. Very faint line.',
          }
          return (
            <div className="mt-3 px-3 py-2 rounded-xl bg-forest-800/50 border border-forest-700">
              <p className="text-forest-200 text-sm">{info[activeNode]}</p>
            </div>
          )
        })()}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { title: 'Note badges', desc: 'A white dot appears on a friend\'s node when they\'ve posted a daily note. Hover or tap to preview it.' },
          { title: 'Vehicle animations', desc: 'When a letter is in transit, you\'ll see it travelling along the line between you and your friend in real time.' },
          { title: '"?" nodes', desc: 'If someone has a public profile but their connection to you goes through a private link, they appear as a grey dashed "?" — identity hidden.' },
          { title: 'Degree filter', desc: 'Use the toolbar at the top to filter by degree — see just your direct friends, or zoom out to see your full network.' },
        ].map(({ title, desc }) => (
          <Card key={title}>
            <p className="text-forest-200 text-sm font-medium mb-1">{title}</p>
            <p className="text-forest-500 text-sm leading-relaxed">{desc}</p>
          </Card>
        ))}
      </div>

      <Card className="border-forest-700 bg-forest-800/30">
        <p className="text-forest-300 text-sm font-medium mb-1">💡 Tip</p>
        <p className="text-forest-400 text-sm leading-relaxed">
          On the map, your fuel bar (bottom left) shows your active letter streaks. If the dots are nearly empty, it's time to send a letter before the streak breaks!
        </p>
      </Card>
    </div>
  )
}

function SectionNotes() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Daily Notes 📝</h2>
        <p className="text-forest-400 text-sm">One thought a day. Short and sweet.</p>
      </div>

      <Card>
        <p className="text-forest-400 text-sm leading-relaxed">
          Every 24 hours you can post a short note — up to 280 characters. It's visible to your direct friends on the map and in their feed. Think of it as a "status" that actually means something to people who know you.
        </p>
      </Card>

      <div className="space-y-3">
        {[
          { q: 'Who can see my note?', a: 'Your direct connections always can. If your profile is public, 2nd and 3rd degree connections can see it too.' },
          { q: 'How long does it last?', a: 'Notes are visible in the feed for 72 hours. After that they disappear from the feed, but the latest one stays on your map node until you post a new one.' },
          { q: 'Can I edit it after posting?', a: 'No — each post is permanent for its 24-hour window. Think before you post! You can write a new one tomorrow.' },
          { q: 'What shows on the map?', a: 'If you\'ve posted a note, a small white dot appears on your map node. Friends can hover/tap it to see a preview of what you wrote.' },
        ].map(({ q, a }) => (
          <Card key={q}>
            <p className="text-forest-200 text-sm font-medium mb-1">{q}</p>
            <p className="text-forest-500 text-sm leading-relaxed">{a}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">😄 Mood</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>Set one of 😄 😢 😡 😴 🤔 🥹 once every <span className="text-forest-200 font-medium">4 hours</span>. The emoji replaces your map node so your connections can see how you're feeling. Earns <span className="text-green-400 font-mono">+10 seeds</span> per set and expires after 24h.</p>
          <p>To set a mood: click an emoji to stage it (it highlights), then click <span className="text-forest-200 font-medium">Set</span>. The button stays locked for 4 hours after each update.</p>
          <p className="text-forest-600 italic">Forecaster posts also appear as your daily note with a 📡 prefix — subscribers will see it on the map.</p>
        </div>
      </Card>
    </div>
  )
}

function SectionLetters() {
  const [fuelDemo, setFuelDemo] = useState(2)
  const [streakDemo, setStreakDemo] = useState(20)

  const getTier = (streak) => {
    if (streak >= 256) return { emoji: '🗼', label: 'Radio', max: 'Instant!' }
    if (streak >= 128) return { emoji: '🚀', label: 'Spaceship', max: '1h max' }
    if (streak >= 64)  return { emoji: '✈️', label: 'Jet', max: '2.5h max' }
    if (streak >= 32)  return { emoji: '🛩️', label: 'Airliner', max: '5h max' }
    if (streak >= 16)  return { emoji: '🏎️', label: 'Sports Car', max: '10h max' }
    return { emoji: '🚗', label: 'Car', max: '20h max' }
  }
  const tier = getTier(streakDemo)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Letters & Streaks ✉️</h2>
        <p className="text-forest-400 text-sm">The heart of TreeDegrees.</p>
      </div>

      <Card>
        <p className="text-forest-400 text-sm leading-relaxed">
          Letters are short messages (up to 500 chars) you send to a direct friend. Unlike an instant message, a letter <span className="text-forest-200 font-medium">takes time to arrive</span> — based on the real distance between your cities and which vehicle your streak has unlocked.
        </p>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Streak demo — drag to explore</p>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-forest-400 text-sm">Streak length</span>
              <span className="text-forest-200 font-medium text-sm">🔥 {streakDemo} days</span>
            </div>
            <input type="range" min="0" max="256" value={streakDemo}
              onChange={e => setStreakDemo(parseInt(e.target.value))}
              className="w-full" />
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-forest-800/50 border border-forest-700">
            <span className="text-4xl">{tier.emoji}</span>
            <div>
              <p className="text-forest-100 font-medium">{tier.label}</p>
              <p className="text-forest-500 text-sm">{tier.max} delivery time</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-forest-400 text-sm">Fuel bar</span>
              <span className="text-forest-500 text-xs">{fuelDemo}/3</span>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <button key={i} onClick={() => setFuelDemo(i + 1 === fuelDemo ? i : i + 1)}
                  className={`flex-1 h-3 rounded-full border transition-all
                    ${i < fuelDemo ? 'bg-forest-400 border-forest-300' : 'bg-forest-900 border-forest-700'}`} />
              ))}
            </div>
            <p className="text-forest-600 text-xs mt-2">
              {fuelDemo === 0 ? '⚠️ Streak will reset! Send a letter now.' :
               fuelDemo === 1 ? 'Low fuel — send a letter soon.' :
               fuelDemo === 2 ? 'One dot used today.' : 'Full tank. '}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { title: '1 letter at a time', desc: 'You can only have one letter in transit per friend. Wait for it to arrive (or recall it) before sending another.' },
          { title: 'Letters expire', desc: 'Letters are deleted 7 days after they arrive. Read them while you can!' },
          { title: 'Recall a letter', desc: 'Changed your mind? You can recall a letter while it\'s still in transit. It disappears and you can send a new one.' },
          { title: 'Read on close', desc: 'A letter is marked as "read" when you close it — not when you open it. So you can peek at the subject first.' },
        ].map(({ title, desc }) => (
          <Card key={title}>
            <p className="text-forest-200 text-sm font-medium mb-1">{title}</p>
            <p className="text-forest-500 text-sm leading-relaxed">{desc}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">How streaks work</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>A streak counts <span className="text-forest-200">consecutive days</span> where <span className="text-forest-200">both</span> you and your friend each sent at least one letter.</p>
          <p>The shared <span className="text-forest-200">fuel bar</span> (max 3) acts as a buffer. Each sent letter adds +1 fuel. Each day costs 1 fuel. If fuel hits zero, the streak resets.</p>
          <p>Keeping fuel full means you can miss a day and not lose your streak.</p>
        </div>
      </Card>
    </div>
  )
}

function SectionVehicles() {
  const vehicles = [
    { streak: 0,   emoji: '🚗',  label: 'Car',        maxH: 20,  desc: 'Your starting vehicle. Reliable but slow. Bahrain to UK takes ~5.5 hours.' },
    { streak: 16,  emoji: '🏎️',  label: 'Sports Car', maxH: 10,  desc: 'Unlock at 16-day streak. Twice as fast. Same trip takes ~2.7 hours.' },
    { streak: 32,  emoji: '🛩️',  label: 'Airliner',   maxH: 5,   desc: 'Unlock at 32 days. The first truly fast tier. That Bahrain-UK letter? ~1.4 hours.' },
    { streak: 64,  emoji: '✈️',  label: 'Jet',        maxH: 2.5, desc: 'Unlock at 64 days. Getting speedy now. Most letters arrive in under an hour.' },
    { streak: 128, emoji: '🚀',  label: 'Spaceship',  maxH: 1,   desc: 'Unlock at 128 days. You\'re barely waiting. Max 1 hour anywhere on Earth.' },
    { streak: 256, emoji: '🗼',  label: 'Radio',      maxH: 0,   desc: 'Unlock at 256 days of streak. Instant delivery at the speed of light. The envelope appears in their inbox the moment you send.' },
  ]
  const [selected, setSelected] = useState(0)
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Delivery Vehicles 🚗</h2>
        <p className="text-forest-400 text-sm">The longer your streak, the faster your letters travel.</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {vehicles.map((v, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={`rounded-2xl border p-3 flex flex-col items-center gap-1 transition-all
              ${selected === i
                ? 'bg-forest-700 border-forest-500'
                : 'bg-forest-900/40 border-forest-800 hover:border-forest-600'}`}>
            <span className="text-2xl">{v.emoji}</span>
            <span className="text-forest-300 text-xs">{v.label}</span>
            <span className="text-forest-600 text-xs">{v.streak}+ days</span>
          </button>
        ))}
      </div>

      <Card className="border-forest-700">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-5xl">{vehicles[selected].emoji}</span>
          <div>
            <p className="text-forest-100 text-lg font-medium">{vehicles[selected].label}</p>
            <p className="text-forest-500 text-sm">
              Unlocks at {vehicles[selected].streak} day streak
              {vehicles[selected].maxH > 0 ? ` · max ${vehicles[selected].maxH}h delivery` : ' · instant'}
            </p>
          </div>
        </div>
        <p className="text-forest-400 text-sm leading-relaxed">{vehicles[selected].desc}</p>
        {selected === 5 && (
          <div className="mt-3 p-3 rounded-xl bg-forest-800/50 border border-forest-700">
            <p className="text-forest-300 text-sm">🗼 At Radio tier, letters travel at the speed of light. The tower on the map fires a quick ✉️ flash and it's already there.</p>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-2">Delivery time formula</p>
        <p className="text-forest-500 text-sm leading-relaxed">
          Time scales with the real geographic distance between your cities. The maximum time listed is for the furthest possible point on Earth (~20,000 km). Most friends are much closer, so letters usually arrive faster than the maximum.
        </p>
      </Card>
    </div>
  )
}


function SectionGroups() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Groups ☘️</h2>
        <p className="text-forest-400 text-sm">Shared spaces for your connections to send letters and play games together.</p>
      </div>
      <Card>
        <p className="text-forest-200 leading-relaxed">
          Groups let you bring multiple connections into a shared space. Only the <span className="text-forest-100 font-medium">group admin</span> can invite members — and invitees must accept before they join.
        </p>
      </Card>
      <div className="space-y-3">
        {[
          { q: 'How do I create a group?', a: 'Go to ☘️ Groups → tap "+ New group". Give it a name, optional description, and pick a colour. You are automatically the admin.' },
          { q: 'How do I add members?', a: 'Open the group → Members tab → tap Invite next to any direct connection. They will see your invite on their Groups page and can Accept or Decline.' },
          { q: 'Can I cancel an invite?', a: 'Yes — in the Members tab, pending invites show under "Awaiting response" with a Recall button.' },
          { q: 'Can I mute a group?', a: 'Tap the ··· button on any group card to mute it. You will not receive notifications for that group while muted.' },
          { q: 'Can I send letters to a group?', a: 'Yes! From the map\'s ✉️ button, groups appear at the top of the send list. Messages deliver simultaneously to all members at their individual travel speeds.' },
          { q: 'Who can play games?', a: 'Any group member. Games are created within a group, and any accepted member can join and play.' },
        ].map(({ q, a }) => (
          <Card key={q}>
            <p className="text-forest-200 text-sm font-medium mb-1">{q}</p>
            <p className="text-forest-500 text-sm leading-relaxed">{a}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}


function SectionGrove() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">🪴 The Grove</h2>
        <p className="text-forest-400 text-sm">Seeds, stocks &amp; investing in your connections.</p>
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">What are Seeds? 🌱</p>
        <p className="text-forest-400 text-sm leading-relaxed mb-3">
          Seeds are the currency of TreeDegrees. Every account starts at 0 and earns seeds through real activity —
          sending letters, posting notes, keeping streaks alive. You spend seeds by investing in your connections,
          backing their growth with real stakes.
        </p>
        <p className="text-forest-400 text-sm leading-relaxed">
          Your seeds balance and your stock chart are visible to your direct connections on the Grove page and
          as a small badge below your map node.
        </p>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">How to earn 🌱 Seeds</p>
        <div className="space-y-1">
          {[
            ['+20',  'Send a letter'],
            ['+30',  'Receive a letter'],
            ['+20',  'Post a daily note'],
            ['+10',  'Set your mood (once per 4 hours)'],
            ['+15',  'Streak milestone — both you and your connection sent that day'],
            ['+25',  'Win a game (2 players)'],
            ['+5 per extra player', 'Win with more players'],
            ['+5%',  'Someone invests in you — instant boost of 5% of their amount'],
          ].map(([val, action]) => (
            <div key={action} className="flex justify-between items-center py-1.5 border-b border-forest-900 last:border-0 text-sm">
              <span className="text-forest-400">{action}</span>
              <span className="text-green-400 font-mono font-medium">{val}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">What costs Seeds</p>
        <div className="space-y-1">
          {[
            ['−50',  'Streak breaks'],
            ['−10',  'No activity for a full day (passive decay)'],
            ['−10%', 'Withdrawal fee when pulling your investment out'],
            ['−3%',  'Your score dips when someone withdraws their investment from you'],
          ].map(([val, action]) => (
            <div key={action} className="flex justify-between items-center py-1.5 border-b border-forest-900 last:border-0 text-sm">
              <span className="text-forest-400">{action}</span>
              <span className="text-red-400 font-mono font-medium">{val}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Investing in a connection</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>Go to The Grove and open a connection's stock card. Tap <span className="text-forest-200 font-medium">Invest</span> to spend seeds on them. Minimum: <span className="text-forest-200 font-mono">10 seeds</span>.</p>
          <p>They receive <span className="text-green-400 font-mono">+5%</span> of your investment as an instant score boost.</p>
          <p>Withdraw any time — you get your seeds back minus a fee (8–20% depending on amount). The person you invested in keeps that fee.</p>
          <p>Their score dips by <span className="text-red-400 font-mono">3%</span> of the withdrawn amount when you pull out.</p>
          <p className="text-forest-600 italic">You can only invest in direct connections (degree 1). You cannot invest in yourself.</p>
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">📊 How to invest well</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p><span className="text-forest-200 font-medium">Unlike normal stocks, value here is driven by activity.</span> A connection who sends letters daily, posts notes, and keeps streaks alive will have a rising score. A quiet connection's score drifts down.</p>
          <p>The classic rule applies: <span className="text-green-400 font-medium">invest when they're quiet</span> (low score, low cost), <span className="text-red-400 font-medium">withdraw when they're thriving</span> (high score, high return).</p>
          <p>Watch the chart direction, not just the number. A rising chart on a low balance means they just became active — good time to invest.</p>
          <p className="text-forest-600 italic">Tip: withdrawing costs a fee — don't invest what you can't afford to hold for a few days.</p>
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Reading the chart</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>Each stock card shows a sparkline chart of that person&apos;s Seeds score over time. <span className="text-green-400">Green</span> = rising (active). <span className="text-red-400">Red</span> = falling (quiet).</p>
          <p>The number in the top-right of the chart shows the total change (+/−) over the period shown. Charts update in real time whenever activity earns or costs seeds.</p>
          <p>The Leaderboard tab shows the top 10 accounts in your network ranked by current Seeds balance.</p>
        </div>
      </Card>


    </div>
  )
}

function SectionMarkets() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">📈 Markets</h2>
        <p className="text-forest-400 text-sm">Two community-driven stocks. Canopy and Crude.</p>
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">🌳 The Canopy</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>The Canopy represents the health of the TreeDegrees community. Its price rises when the community is active and falls when things go quiet.</p>
          <div className="space-y-1 mt-2">
            {[
              ['📈 Rises when', 'Letters sent, notes posted, streaks maintained, forecasters post, investments made, weekends'],
              ['📉 Falls when', 'Streaks break, seeds withdrawn, Crude is high'],
            ].map(([label, desc]) => (
              <div key={label} className="flex gap-2 text-xs">
                <span className="text-forest-300 font-medium w-24 flex-shrink-0">{label}</span>
                <span className="text-forest-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">🛢️ Crude Oil</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>Crude tracks physical activity in the app — letters travelling long distances, couriers working, stewards sending nudges. Think of it as the fuel burning behind the scenes.</p>
          <div className="space-y-1 mt-2">
            {[
              ['📈 Rises when', 'Letters travel far (distance-scaled), couriers hired, stewards nudge clients'],
              ['📉 Falls when', 'Daily drift, no delivery activity'],
            ].map(([label, desc]) => (
              <div key={label} className="flex gap-2 text-xs">
                <span className="text-forest-300 font-medium w-24 flex-shrink-0">{label}</span>
                <span className="text-forest-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">How to invest in markets</p>
        <div className="space-y-2 text-sm text-forest-400 leading-relaxed">
          <p>Open The Grove and tap the <span className="text-forest-200 font-medium">Markets</span> tab. You'll see live charts for Canopy and Crude with current prices.</p>
          <p>Tap a market card and choose how many seeds to invest. Your investment is split 50/50 between a safe portion (always returned) and an active portion (rises and falls with the price).</p>
          <p>Withdraw any time — the same tiered fee applies as connection investments (8–20%).</p>
          <p className="text-forest-600 italic">Tip: Canopy tends to rise on weekdays when people are active. Crude spikes when new long-distance letters are sent. Watch the patterns.</p>
        </div>
      </Card>
    </div>
  )
}

function SectionJobs() {
  const jobs = [
    { icon: '🚚', name: 'Courier', what: 'Deliver letters on behalf of clients. Accept delivery requests and earn seeds per delivery. Your vehicle upgrades as you complete more deliveries.', client: 'Hire a courier to send a letter for you. Only your country is visible — the content and recipient stay private.', earn: 'Per delivery fee (set by you)' },
    { icon: '✍️', name: 'Writer', what: 'Write commissioned letters for clients. They give you a prompt (e.g. "love letter"), you write it, they accept or reject. Kill fee applies on rejection.', client: 'Give the writer a prompt and a budget. Read the result and accept to unlock it for copying, or reject for a partial refund.', earn: 'Per commission (fixed rate you set)' },
    { icon: '🌱', name: 'Seed Broker', what: 'Invest a client's seeds across multiple targets — connections, Canopy, or Crude. You allocate specific amounts to each. Earn 10% of any profits on close.', client: 'Allocate seeds to a broker for a set time (1h to 1 week). They invest on your behalf with 100% active exposure.', earn: '10% of profits + 5% management fee' },
    { icon: '📊', name: 'Accountant', what: 'View a client's portfolio anonymously (you see Investment #1, #2 etc, not names) and send Buy/Hold/Sell advice with a note. One report per 24h.', client: 'Grant an accountant read access. They analyse your positions and send advice. You see their name and the full investment name.', earn: 'Per report fee (set by you)' },
    { icon: '🔔', name: 'Steward', what: 'Monitor up to 3 clients' active streaks. Send push notifications and instant letters when their fuel drops to 1. You can see streak counts but not who the streaks are with.', client: 'Pay a retainer (3, 7, or 14 days, prorated). Your steward watches your streaks and nudges you before they break.', earn: 'Retainer fee per contract period' },
    { icon: '📡', name: 'Forecaster', what: 'Post market and social analysis to your subscribers. Each post updates your daily note with 📡 prefix so all your connections see it. Free to subscribe.', client: 'Subscribe for free. Get push notifications for every post. Their forecasts appear as their daily note on the map.', earn: 'Market bonus — Canopy rises with each post' },
    { icon: '🌾', name: 'Farmer', what: 'Grow seeds in plot slots. Plant your own seeds or client deposits. After 24h, harvest with randomised outcomes from rotten (×0) to bumper (×2.5). No fees on deposits.', client: 'Deposit seeds into a farmer's plot. The farmer plants them and after 24h the harvest goes back to you automatically.', earn: 'Profit from your own planted seeds' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">💼 Jobs</h2>
        <p className="text-forest-400 text-sm">Earn seeds by offering services to your connections.</p>
      </div>

      <Card>
        <p className="text-forest-400 text-xs uppercase tracking-wide mb-2">How jobs work</p>
        <div className="space-y-1.5 text-sm text-forest-400 leading-relaxed">
          <p>Jobs are visible only to your <span className="text-forest-200 font-medium">direct connections</span>. Register for one job at a time from the For Hire tab. Set your rate and bio, and connections can hire you.</p>
          <p>If you resign from a job, any open commissions or active sessions are automatically refunded to clients. Your ratings reset when you change jobs.</p>
          <p>After hiring someone, you can <span className="text-forest-200 font-medium">rate them 1–5 stars</span>. Ratings are averaged and shown on their card.</p>
        </div>
      </Card>

      {jobs.map(j => (
        <Card key={j.name}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{j.icon}</span>
            <p className="text-forest-200 font-medium">{j.name}</p>
          </div>
          <div className="space-y-2 text-xs text-forest-400">
            <div>
              <p className="text-forest-500 uppercase tracking-wide mb-0.5">As the worker</p>
              <p className="leading-relaxed">{j.what}</p>
            </div>
            <div>
              <p className="text-forest-500 uppercase tracking-wide mb-0.5">As the client</p>
              <p className="leading-relaxed">{j.client}</p>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-forest-800">
              <span className="text-green-400">Earns:</span>
              <span>{j.earn}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function SectionGames() {
  const [selectedGame, setSelectedGame] = useState('trump')
  const games = [
    { id: 'trump', label: '🃏 Trump Card' },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-forest-50 mb-1">Games & Activities 🎮</h2>
        <p className="text-forest-400 text-sm">Play with your groups. More games are added over time.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {games.map(g => (
          <button key={g.id} onClick={() => setSelectedGame(g.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors
              ${selectedGame === g.id ? 'bg-forest-700 text-forest-100 border-forest-600' : 'bg-forest-900/40 text-forest-400 border-forest-800 hover:border-forest-600'}`}>
            {g.label}
          </button>
        ))}
      </div>
      {selectedGame === 'trump' && (
        <div className="space-y-4">
          <Card>
            <p className="text-forest-300 text-sm font-medium mb-2">🃏 Trump Card — What is it?</p>
            <p className="text-forest-400 text-sm leading-relaxed">
              Trump Card is a turn-based military card game for 2–9 players. Each player starts with 7 cards. On your turn, deploy 1–3 cards to attack an opponent. The last player with cards remaining wins.
            </p>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Basic Units (grey)', desc: 'Soldier, Armored Soldier, Drone, Tank, Jet, Missile. Each has ATK and DEF values.' },
              { title: 'Tactical Units (teal)', desc: 'Artillery and Interceptor — high DEF, good for defending against attacks.' },
              { title: 'Divert Attack (amber)', desc: 'Redirect an incoming attack to another player of your choice. Very powerful when timed right.' },
              { title: 'Call Reinforcements (amber)', desc: 'Skip your attack and draw 2 cards instantly. Great when your hand is thin.' },
              { title: 'Spy Operation (purple)', desc: 'Send a face-down card to an opponent. If they deploy it, there\'s a chance it sabotages them instead. Higher value = bigger reward OR bigger risk.' },
              { title: 'Block Communications (purple)', desc: 'The next player\'s card values are hidden from everyone. Combat still resolves normally but no one can read the numbers!' },
            ].map(({ title, desc }) => (
              <Card key={title}>
                <p className="text-forest-200 text-sm font-medium mb-1">{title}</p>
                <p className="text-forest-500 text-sm leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
          <Card>
            <p className="text-forest-400 text-xs uppercase tracking-wide mb-3">Key rules</p>
            <div className="space-y-2 text-sm">
              {[
                ['Starting hand', '6 cards each (78-card deck)'],
                ['Max hand size', '9 cards'],
                ['Cards drawn per turn', '1 card (after your attack resolves)'],
                ['Target order', 'Always circular — attacks the next player in seat order'],
                ['Overextension', 'Total ATK above 9 → discard 1 random card as penalty'],
                ['Damage formula', 'ATK − DEF = cards defender must discard'],
                ['Defense slots', 'Slot 1+2 = defense (DEF values). Slot 3 = counter-attack (ATK value hits next player after you)'],
                ['Defense timer', '30 seconds. If time expires the attack resolves automatically with 0 defense'],
                ['Elimination', 'Lose all cards = eliminated. Last player standing wins'],
                ['Spy value range', '2–5 (15%–55% spy chance)'],
                ['Win points', '100 + (opponents × 30)'],
              ].map(([r, v]) => (
                <div key={r} className="flex gap-3">
                  <span className="text-forest-300 font-medium w-36 flex-shrink-0 text-xs">{r}</span>
                  <span className="text-forest-500 text-xs">{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="border-forest-700 bg-forest-800/30">
            <p className="text-forest-300 text-sm font-medium mb-2">💡 How to start a game</p>
            <div className="space-y-2">
              {['Go to 🎮 Games', 'Select a group and tap "Create Game"', 'Share the game link — group members join from the Games page', 'Once 2+ players have joined, the creator taps Start', 'Game updates in real-time — no refresh needed!'].map((s,i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-forest-600 flex-shrink-0">{i+1}.</span>
                  <span className="text-forest-400">{s}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

const sectionComponents = {
  what:        SectionWhat,
  connections: SectionConnections,
  privacy:     SectionPrivacy,
  nicknames:   SectionNicknames,
  map:         SectionMap,
  notes:       SectionNotes,
  letters:     SectionLetters,
  vehicles:    SectionVehicles,
  groups:      SectionGroups,
  grove:       SectionGrove,
  markets:     SectionMarkets,
  jobs:        SectionJobs,
  games:       SectionGames,
}

// ── Main Guide Page ───────────────────────────────────────────────────────────
export default function GuidePage() {
  const [active, setActive] = useState('what')
  const [mobileOpen, setMobileOpen] = useState(false)
  const ActiveSection = sectionComponents[active]
  const current = sections.find(s => s.id === active)

  const selectSection = (id) => {
    setActive(id)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-forest-800 glass-dark flex items-center gap-3 flex-shrink-0">
        <span className="text-xl">📖</span>
        <div>
          <h1 className="font-display text-forest-100 text-xl leading-none">Guide</h1>
          <p className="text-forest-600 text-xs mt-0.5">How to use TreeDegrees</p>
        </div>

        {/* Mobile section picker */}
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-forest-800 border border-forest-700 text-forest-300 text-sm">
          <span>{current?.emoji}</span>
          <span className="max-w-[100px] truncate">{current?.label}</span>
          <span className="text-forest-600">{mobileOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Mobile section dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-forest-800 bg-forest-950/95 backdrop-blur p-3 space-y-1 z-30">
          {sections.map(s => (
            <SectionTab key={s.id} {...s} active={active === s.id} onClick={selectSection} />
          ))}
        </div>
      )}

      <div className="flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-forest-800 p-3 space-y-1 overflow-y-auto">
          {sections.map(s => (
            <SectionTab key={s.id} {...s} active={active === s.id} onClick={selectSection} />
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-20 lg:pb-8 max-w-2xl">
          <ActiveSection />

          {/* Next section button */}
          {(() => {
            const idx = sections.findIndex(s => s.id === active)
            const next = sections[idx + 1]
            if (!next) return (
              <div className="mt-8 rounded-2xl bg-forest-800/30 border border-forest-700 p-6 text-center">
                <p className="text-3xl mb-3">🌳</p>
                <p className="text-forest-200 font-medium mb-1">You've read the whole guide!</p>
                <p className="text-forest-500 text-sm mb-4">Now go plant some seeds — add your first connection.</p>
                <Link to="/friends" className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-500 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-colors">
                  Go to Connections →
                </Link>
              </div>
            )
            return (
              <button onClick={() => selectSection(next.id)}
                className="mt-8 w-full rounded-2xl border border-forest-800 hover:border-forest-600 p-4 flex items-center gap-3 text-left transition-colors group">
                <span className="text-2xl">{next.emoji}</span>
                <div className="flex-1">
                  <p className="text-forest-500 text-xs">Up next</p>
                  <p className="text-forest-200 text-sm font-medium group-hover:text-forest-100">{next.label}</p>
                </div>
                <span className="text-forest-600 group-hover:text-forest-400 text-lg">→</span>
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
