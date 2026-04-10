// src/pages/TermsOfServicePage.jsx
import { Link } from 'react-router-dom'

const LAST_UPDATED = 'April 10, 2026'
const CONTACT_EMAIL = 'tree3degrees@gmail.com'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg text-forest-100 mb-3">{title}</h2>
      <div className="text-forest-400 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-forest-950 px-5 py-10">
      <div className="max-w-2xl mx-auto">

        <Link to="/" className="flex items-center gap-2 mb-8">
          <span className="text-xl">🌳</span>
          <span className="font-display text-forest-400 text-sm hover:text-forest-200 transition-colors">← Back to TreeDegrees</span>
        </Link>

        <h1 className="font-display text-3xl text-forest-50 mb-1">Terms of Service</h1>
        <p className="text-forest-600 text-sm mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="rounded-2xl bg-forest-900/40 border border-forest-800 p-6 mb-8">
          <p className="text-forest-300 text-sm leading-relaxed">
            By creating an account or using TreeDegrees, you agree to these terms. Please read them.
            If you do not agree, do not use the service.
          </p>
        </div>

        <Section title="1. About TreeDegrees">
          <p>TreeDegrees is a social connection app that lets you exchange letters, share daily notes, post memories, and track your relationships. It is operated as a personal project based in Bahrain.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 13 years old to use TreeDegrees. By registering, you confirm that you meet this requirement. If you are between 13 and 18, you confirm you have parental consent to use the service.</p>
          <p>We reserve the right to terminate accounts found to belong to users under 13.</p>
        </Section>

        <Section title="3. Your Account">
          <p>You are responsible for keeping your password secure and for all activity under your account. Do not share your login credentials with anyone.</p>
          <p>You must provide accurate information when registering. Using a fake identity or impersonating someone else is not permitted.</p>
          <p>You may only create one account. Multiple accounts created to circumvent bans or restrictions are prohibited.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree not to use TreeDegrees to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li className="text-forest-400">Harass, threaten, or harm other users</li>
            <li className="text-forest-400">Post illegal content, including child sexual abuse material</li>
            <li className="text-forest-400">Spam, phish, or send unsolicited messages</li>
            <li className="text-forest-400">Impersonate other people or organisations</li>
            <li className="text-forest-400">Attempt to access other users' accounts or data</li>
            <li className="text-forest-400">Use automated tools, bots, or scripts to interact with the service</li>
            <li className="text-forest-400">Reverse engineer, scrape, or copy the service</li>
            <li className="text-forest-400">Attempt to manipulate seeds, streaks, or grove scores through exploits</li>
          </ul>
          <p>We may suspend or permanently ban accounts that violate these rules, with or without notice.</p>
        </Section>

        <Section title="5. Your Content">
          <p>You own the content you post on TreeDegrees — your letters, notes, photos, and profile information remain yours.</p>
          <p>By posting content, you grant TreeDegrees a limited licence to store and display that content to the users you share it with, as necessary to operate the service. We do not claim ownership of your content and will not use it beyond what is needed to run the app.</p>
          <p>You are responsible for the content you post. Do not post content that is illegal, harmful, defamatory, or that infringes on anyone's rights.</p>
        </Section>

        <Section title="6. Seeds, Grove & Virtual Economy">
          <p>Seeds, grove scores, and other in-app virtual items have no real-world monetary value. They cannot be exchanged for real money and are not refundable.</p>
          <p>We reserve the right to adjust, reset, or remove virtual items at any time as part of maintaining the app's balance and integrity.</p>
        </Section>

        <Section title="7. Privacy">
          <p>Your use of TreeDegrees is also governed by our <Link to="/privacy" className="text-forest-400 underline hover:text-forest-200">Privacy Policy</Link>, which is incorporated into these terms by reference.</p>
        </Section>

        <Section title="8. Service Availability">
          <p>We aim to keep TreeDegrees running reliably but cannot guarantee uninterrupted availability. The service may be down for maintenance, updates, or reasons beyond our control.</p>
          <p>We reserve the right to modify, suspend, or discontinue any part of the service at any time. We will try to give reasonable notice where possible.</p>
        </Section>

        <Section title="9. Disclaimers">
          <p>TreeDegrees is provided "as is" without warranties of any kind. We do not guarantee that the service will be error-free, secure, or meet your specific needs.</p>
          <p>We are not liable for any indirect, incidental, or consequential damages arising from your use of the service, to the maximum extent permitted by applicable law.</p>
        </Section>

        <Section title="10. Account Deletion">
          <p>You may delete your account at any time through the app settings. Upon deletion, your personal data is anonymised immediately. Content shared with other users (such as letters already delivered) may remain visible to the recipient.</p>
          <p>We may delete inactive accounts after an extended period of inactivity, with advance notice where possible.</p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>We may update these terms from time to time. We will notify you of significant changes via the app. Continued use of TreeDegrees after changes constitutes acceptance of the updated terms.</p>
        </Section>

        <Section title="12. Governing Law">
          <p>These terms are governed by the laws of the Kingdom of Bahrain. Any disputes will be subject to the jurisdiction of the courts of Bahrain, unless local consumer protection laws in your country require otherwise.</p>
        </Section>

        <Section title="13. Contact">
          <p>Questions about these terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-forest-400 underline hover:text-forest-200">{CONTACT_EMAIL}</a>.</p>
        </Section>

        <div className="border-t border-forest-800 mt-10 pt-6 flex gap-4 text-xs text-forest-700">
          <Link to="/privacy" className="hover:text-forest-400 transition-colors">Privacy Policy</Link>
          <Link to="/" className="hover:text-forest-400 transition-colors">Back to app</Link>
        </div>
      </div>
    </div>
  )
}
