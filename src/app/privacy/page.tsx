import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Rivyls',
  description: 'Rivyls Privacy Policy. Learn how we collect, use, and protect your personal information.',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-page/90 backdrop-blur-sm border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="brand-nav text-xl tracking-wide">
            RIVYLS
          </Link>
          <Link href="/welcome" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
            Back to site
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8 pb-4 border-b border-border">
          <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
          <div className="text-sm text-text-muted">
            <span className="mr-4">Effective Date: April 1, 2026</span>
            <span>Last Updated: April 1, 2026</span>
          </div>
        </div>

        <div className="legal-content">
          <h2>1. Introduction</h2>
          <p>Rivyls LLC (&ldquo;Rivyls,&rdquo; &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), a Georgia limited liability company, operates the website located at www.rivyls.com (the &ldquo;Site&rdquo;), related mobile applications (the &ldquo;App&rdquo;), and all associated content, features, products, and services (collectively, the &ldquo;Services&rdquo;). This Privacy Policy (&ldquo;Policy&rdquo;) describes how we collect, use, disclose, store, and protect your personal information when you access or use the Services.</p>
          <p>This Privacy Policy is supplemental to, and hereby incorporated by reference into, our <Link href="/terms" className="text-brand-text hover:underline">Terms of Service</Link>. By accessing or using the Services, creating an Account, or providing us with your information, you acknowledge that you have read and understood this Privacy Policy and consent to the collection, use, and disclosure of your information as described herein.</p>

          <h2>2. Information We Collect</h2>
          <p>We collect information in several ways: directly from you, automatically when you use the Services, and from third-party sources.</p>
          <h3>2.1 Information You Provide Directly</h3>
          <p><strong>Account Registration Information:</strong> When you create an Account, we collect your name, email address, username, password, and date of birth (for age verification). You may also provide an optional profile picture, display name, and location.</p>
          <p><strong>Profile and League Information:</strong> When you create or join leagues, draft teams, participate in contests, or use social features, we collect information about your league preferences, team selections, draft choices, and league-related communications.</p>
          <p><strong>Communications:</strong> When you contact us for customer support, send feedback, or communicate with other Users through the Services, we collect the content and metadata of those communications.</p>
          <p><strong>Survey and Feedback Information:</strong> If you respond to surveys, questionnaires, or feedback requests, we collect the information you provide.</p>
          <h3>2.2 Information Collected Automatically</h3>
          <p><strong>Device and Usage Information:</strong> When you use the Services, we automatically collect information about your device and usage patterns, including your IP address, browser type and version, operating system, device identifiers, screen resolution, referring URLs, pages viewed, time spent on pages, click patterns, and navigation paths.</p>
          <p><strong>Location Information:</strong> We may collect general location information based on your IP address. We do not collect precise GPS location data unless you expressly consent.</p>
          <p><strong>Cookies and Similar Technologies:</strong> We use cookies, web beacons, pixels, local storage, and similar tracking technologies. For details, see Section 7 below.</p>
          <p><strong>Log Data:</strong> Our servers automatically record information when you access the Services, including access times, hardware and software information, crash data, and pages visited.</p>
          <h3>2.3 Information from Third-Party Sources</h3>
          <p><strong>Authentication Providers:</strong> If you sign in using a third-party authentication service (such as Google or Apple), we receive certain information from that provider, such as your name, email address, and profile picture.</p>
          <p><strong>Sports Data Providers:</strong> We receive game scores, statistics, schedules, and other sports-related data from third-party providers (such as ESPN) to operate scoring and contest features.</p>
          <p><strong>Analytics and Advertising Partners:</strong> We may receive information about your interactions with our Services from third-party analytics partners.</p>

          <h2>3. How We Use Your Information</h2>
          <p><strong>Providing and Improving the Services:</strong> To create and maintain your Account, facilitate league creation and participation, process draft selections, calculate scores, manage leaderboards, and operate the Services.</p>
          <p><strong>Authentication and Security:</strong> To verify your identity and age, protect Account security, detect and prevent fraud and unauthorized access.</p>
          <p><strong>Communications:</strong> To send service-related communications including Account verification emails, league notifications, contest updates, security alerts, and support responses. With your consent, promotional communications.</p>
          <p><strong>Personalization:</strong> To customize content, recommendations, and features based on your preferences and usage.</p>
          <p><strong>Analytics and Research:</strong> To understand usage patterns, analyze trends, measure effectiveness, and improve the Services.</p>
          <p><strong>Legal Compliance:</strong> To comply with applicable laws, enforce our Terms, and protect rights, property, and safety.</p>
          <p><strong>Consent Logging:</strong> To maintain records of your consent to our Terms and Privacy Policy for compliance purposes.</p>

          <h2>4. How We Share Your Information</h2>
          <p>We do not sell, rent, or trade your personal information to third parties for their own marketing purposes.</p>
          <p><strong>Service Providers:</strong> We share information with third-party service providers who perform services on our behalf, such as hosting (Vercel, Cloudflare), database management (Supabase), email delivery (Resend), error monitoring (Sentry), and analytics.</p>
          <p><strong>Other Users:</strong> Certain information is visible to other Users as part of the platform&rsquo;s functionality, including your username, display name, profile picture, league membership, team selections, draft picks, contest scores, and league standings.</p>
          <p><strong>Legal Obligations:</strong> We may disclose your information if required by law, regulation, legal process, or governmental request.</p>
          <p><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, your information may be transferred as a business asset.</p>
          <p><strong>Aggregated or De-Identified Data:</strong> We may share aggregated or de-identified information that cannot reasonably be used to identify you.</p>

          <h2>5. Data Retention</h2>
          <p>We retain your personal information for as long as your Account is active or as needed to provide you with the Services. We may also retain information for a reasonable period after you close your Account to comply with legal obligations. Consent records are retained for a minimum of seven (7) years.</p>

          <h2>6. Data Security</h2>
          <p>We implement commercially reasonable technical, administrative, and organizational security measures designed to protect your personal information, including encryption of data in transit (TLS/SSL) and at rest, secure authentication protocols, access controls, and regular security assessments.</p>
          <p>However, no method of transmission over the Internet is completely secure. In the event of a data breach, we will notify you and relevant authorities as required by applicable law.</p>

          <h2>7. Cookies and Tracking Technologies</h2>
          <h3>7.1 What We Use</h3>
          <p>We use cookies, web beacons, pixels, and similar technologies to remember your preferences, understand usage, authenticate identity, prevent fraud, and measure effectiveness.</p>
          <h3>7.2 Types of Cookies</h3>
          <p><strong>Essential Cookies:</strong> Necessary for core functionality such as account authentication, security, and session management. You cannot opt out of these.</p>
          <p><strong>Analytics Cookies:</strong> Help us understand how Users interact with the Services.</p>
          <p><strong>Preference Cookies:</strong> Remember your settings and preferences.</p>
          <h3>7.3 Your Cookie Choices</h3>
          <p>Most web browsers allow you to manage cookies through browser settings. We honor the Global Privacy Control (&ldquo;GPC&rdquo;) signal as a request to opt out of the sale or sharing of personal information.</p>
          <h3>7.4 Do Not Track</h3>
          <p>We currently honor the Global Privacy Control signal as described above.</p>

          <h2>8. Children&rsquo;s Privacy</h2>
          <p>The Services are not directed to children under 13. If we learn that we have collected personal information from a child under 13, we will promptly delete that information. To create an Account you must be at least 18 years of age.</p>

          <h2>9. Your Rights and Choices</h2>
          <h3>9.1 Account Information</h3>
          <p>You may access, review, and update your Account information at any time by logging into your Account settings.</p>
          <h3>9.2 Account Deletion</h3>
          <p>You have the right to request deletion of your Account and personal information through your Account settings or by contacting privacy@rivyls.com.</p>
          <h3>9.3 Communication Preferences</h3>
          <p>You may opt out of promotional communications at any time by clicking &ldquo;unsubscribe&rdquo; in any promotional email or adjusting your Account settings.</p>
          <h3>9.4 Data Portability</h3>
          <p>You may request a copy of your personal information in a structured, commonly used, and machine-readable format by contacting privacy@rivyls.com.</p>

          <h2>10. State-Specific Privacy Rights</h2>
          <h3>10.1 California Residents (CCPA/CPRA)</h3>
          <p>If you are a California resident, you have rights under the CCPA/CPRA including the right to know, delete, correct, and opt out of the sale or sharing of your personal information. We do not sell your personal information.</p>
          <h3>10.2 Virginia Residents (VCDPA)</h3>
          <p>Virginia residents have rights under the VCDPA including access, correction, deletion, data portability, and opt-out rights. Contact privacy@rivyls.com to exercise your rights.</p>
          <h3>10.3 Colorado Residents (CPA)</h3>
          <p>Colorado residents have rights under the CPA including access, correction, deletion, data portability, and opt-out rights. Contact privacy@rivyls.com to exercise your rights.</p>
          <h3>10.4 Connecticut Residents (CTDPA)</h3>
          <p>Connecticut residents have rights under the CTDPA including access, correction, deletion, data portability, and opt-out rights. Contact privacy@rivyls.com to exercise your rights.</p>
          <h3>10.5 Other State Privacy Laws</h3>
          <p>If you are a resident of a state with applicable privacy legislation, you may have similar rights regarding your personal data. Contact privacy@rivyls.com to exercise any available rights.</p>
          <h3>10.6 Appeals</h3>
          <p>If we decline to take action on your privacy rights request, you may appeal by contacting privacy@rivyls.com with the subject line &ldquo;Privacy Rights Appeal.&rdquo;</p>

          <h2>11. International Users</h2>
          <p>The Services are operated from the United States. By using the Services, you consent to the transfer of your information to the United States. For EEA, UK, or Swiss users, we will ensure appropriate safeguards such as Standard Contractual Clauses.</p>

          <h2>12. Third-Party Services and Links</h2>
          <p>The Services may contain links to third-party websites or services. We do not control or assume responsibility for their privacy practices.</p>

          <h2>13. Sensitive Personal Information</h2>
          <p>We do not intentionally collect sensitive personal information such as Social Security numbers, financial account numbers, health information, or biometric data, except as minimally necessary for age or identity verification.</p>

          <h2>14. Automated Decision-Making</h2>
          <p>We may use automated systems to detect fraudulent activity and enforce fair play policies. If automated decision-making results in an adverse action against your Account, you may request human review by contacting legal@rivyls.com.</p>

          <h2>15. Data Breach Notification</h2>
          <p>In the event of a security breach, Rivyls will investigate, notify affected Users and regulatory authorities as required by law, and take steps to mitigate harm.</p>

          <h2>16. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. When we make material changes, we will notify you by posting the updated Privacy Policy with a revised &ldquo;Last Updated&rdquo; date. Your continued use of the Services constitutes acceptance of the updated Policy.</p>

          <h2>17. Contact Information</h2>
          <p>If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:</p>
          <div className="my-3 leading-loose">
            <strong className="block">Rivyls LLC</strong>
            Email: privacy@rivyls.com<br />
            Website: www.rivyls.com<br />
            Mailing Address: 1012 Palmetto Ave SW, Atlanta, GA 30314
          </div>
          <p>For privacy rights requests, please email privacy@rivyls.com with the subject line &ldquo;Privacy Rights Request&rdquo; and include your full name, the email address associated with your Account, and a description of your request.</p>

          <p className="mt-8 pt-4 border-t border-border text-sm text-text-muted italic">
            By using the Services, you acknowledge that you have read, understood, and agree to this Privacy Policy.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-3xl mx-auto px-4 md:px-8 flex justify-between text-text-muted text-sm">
          <p>&copy; 2026 Rivyls. All rights reserved.</p>
          <Link href="/terms" className="hover:text-text-primary transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
