// src/pages/PrivacyPolicyPage.jsx
import { Link } from 'react-router-dom'

const LAST_UPDATED = 'April 10, 2026'
const CONTACT_EMAIL = 'privacy@treedegrees.app'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg text-forest-100 mb-3">{title}</h2>
      <div className="text-forest-400 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-forest-950 px-5 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <Link to="/" className="flex items-center gap-2 mb-8">
          <span className="text-xl">🌳</span>
          <span className="font-display text-forest-400 text-sm hover:text-forest-200 transition-colors">← Back to TreeDegrees</span>
        </Link>

        <h1 className="font-display text-3xl text-forest-50 mb-1">Privacy Policy</h1>
        <p className="text-forest-600 text-sm mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-6 mb-8">
          <p className="text-forest-300 text-sm leading-relaxed">
            TreeDegrees is a social connection app. We collect only what we need to run the service,
            we do not sell your data, and we do not share it with advertisers. This policy explains
            what we collect, why, and your rights over it.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>TreeDegrees is operated as a personal project based in Bahrain. For privacy enquiries, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-forest-400 underline hover:text-forest-200">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <Section title="2. What We Collect">
          <p><span className="text-forest-200 font-medium">Account information</span> — your full name, display name (nickname), email address, date of birth, city, and country. These are provided by you when you register.</p>
          <p><span className="text-forest-200 font-medium">Location data</span> — your city, country, and optionally your approximate GPS coordinates if you use the location detection feature. We use this to place your pin on the map and show you nearby connections.</p>
          <p><span className="text-forest-200 font-medium">Content you create</span> — letters you write and receive, daily notes, mood selections, memories (photos) you upload, and any other content you post within the app.</p>
          <p><span className="text-forest-200 font-medium">Device and technical data</span> — your IP address, browser type, and device information. This is collected automatically when you use the service and is used for security and abuse prevention.</p>
          <p><span className="text-forest-200 font-medium">Usage data</span> — how you interact with features, which pages you visit, and activity timestamps. Used to maintain streaks, seeds balances, and app functionality.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use your data solely to operate and improve TreeDegrees. Specifically:</p>
          <ul className="list-disc list-inside space-y-1 text-forest-500 pl-2">
            <li className="text-forest-400">To create and manage your account</li>
            <li className="text-forest-400">To connect you with other users and display your profile</li>
            <li className="text-forest-400">To deliver letters, notifications, and app features</li>
            <li className="text-forest-400">To calculate seeds, streaks, and grove scores</li>
            <li className="text-forest-400">To show your location on the globe map (only if you enable this)</li>
            <li className="text-forest-400">To verify your email and keep your account secure</li>
            <li className="text-forest-400">To prevent abuse, spam, and unauthorised access</li>
          </ul>
          <p>We do not use your data for advertising, profiling, or any purpose beyond running the app.</p>
        </Section>

        <Section title="4. Who We Share Your Data With">
          <p>We do not sell or share your personal data with advertisers or data brokers — ever.</p>
          <p>We use the following infrastructure providers who process data on our behalf to run the service:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><span className="text-forest-200">Supabase</span> — database hosting (your account data and content is stored here)</li>
            <li><span className="text-forest-200">Render</span> — backend server hosting</li>
            <li><span className="text-forest-200">Vercel</span> — frontend hosting</li>
            <li><span className="text-forest-200">Cloudflare</span> — network routing and DDoS protection</li>
            <li><span className="text-forest-200">Cloudflare R2</span> — image storage for uploaded photos</li>
            <li><span className="text-forest-200">OpenWeatherMap</span> — weather data shown on your profile (only your city name is sent)</li>
          </ul>
          <p>Each of these providers is bound by their own data processing agreements and privacy policies. We do not share your data beyond what is necessary for these services to function.</p>
          <p>We may disclose your data if required by law or to protect the safety of users.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We keep your data for as long as your account is active. If you delete your account, your personal information is anonymised immediately — your name, email, and content are replaced with placeholder values. Some technical logs may be retained for up to 30 days for security purposes.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li className="text-forest-400">Access the personal data we hold about you</li>
            <li className="text-forest-400">Request correction of inaccurate data</li>
            <li className="text-forest-400">Request deletion of your account and data</li>
            <li className="text-forest-400">Object to or restrict certain processing</li>
            <li className="text-forest-400">Request a copy of your data in a portable format</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-forest-400 underline hover:text-forest-200">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
          <p>If you are located in the EU or EEA, you also have the right to lodge a complaint with your local data protection authority.</p>
        </Section>

        <Section title="7. Children">
          <p>TreeDegrees is not intended for children under 13. We do not knowingly collect data from anyone under 13. If you believe a child under 13 has created an account, please contact us and we will delete it promptly.</p>
          <p>Users between 13 and 18 should have parental consent before using the service.</p>
        </Section>

        <Section title="8. Cookies and Local Storage">
          <p>We do not use tracking cookies. We use browser localStorage to store your login session token and app preferences (such as theme and mood cooldown timers). This data never leaves your device and is not accessible to us.</p>
        </Section>

        <Section title="9. International Transfers">
          <p>Our infrastructure providers are based in the United States and Europe. By using TreeDegrees, your data may be processed in these regions. We use providers who comply with international data transfer requirements.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this policy from time to time. We will notify you of significant changes via the app. The date at the top of this page reflects the most recent update.</p>
        </Section>

        <Section title="11. Contact">
          <p>Questions about this policy? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-forest-400 underline hover:text-forest-200">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <div className="border-t border-forest-800 mt-10 pt-6 flex gap-4 text-xs text-forest-700">
          <Link to="/terms" className="hover:text-forest-400 transition-colors">Terms of Service</Link>
          <Link to="/" className="hover:text-forest-400 transition-colors">Back to app</Link>
        </div>
      </div>
    </div>
  )
}
